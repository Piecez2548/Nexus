import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { initialize, sync, getState, subscribeToAuthStore, captureError, realtime } = vi.hoisted(() => ({
  initialize: vi.fn(),
  sync: vi.fn(),
  getState: vi.fn(),
  subscribeToAuthStore: vi.fn(),
  captureError: vi.fn(),
  realtime: {
    channel: vi.fn(),
    on: vi.fn(),
    subscribe: vi.fn(),
    removeChannel: vi.fn(),
    callback: null as ((payload?: { new?: { table_name?: string; updated_at?: string } | null; old?: { table_name?: string } | null }) => void) | null,
    authCallback: null as ((state: { user: { id: string } | null; syncing?: boolean }) => void) | null,
  },
}));

vi.mock("@/features/sync/store/authStore", () => ({
  useAuthStore: { getState, subscribe: subscribeToAuthStore },
}));

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    channel: realtime.channel,
    removeChannel: realtime.removeChannel,
  },
}));

vi.mock("@/lib/sentry", () => ({ captureError }));

import { SyncProvider } from "./SyncProvider";

describe("SyncProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    initialize.mockReset();
    sync.mockReset();
    realtime.callback = null;
    realtime.authCallback = null;
    realtime.channel.mockReset().mockReturnValue({ on: realtime.on });
    realtime.on.mockReset().mockImplementation((_type, _filter, callback) => {
      realtime.callback = callback;
      return { subscribe: realtime.subscribe };
    });
    realtime.subscribe.mockReset().mockReturnValue({ topic: "same-account" });
    realtime.removeChannel.mockReset();
    subscribeToAuthStore.mockReset().mockImplementation((callback) => {
      realtime.authCallback = callback;
      return vi.fn();
    });
    getState.mockReset().mockReturnValue({
      user: { id: "same-account" },
      syncing: false,
      initialize,
      sync,
    });
    captureError.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("syncs a signed-in device every five seconds and immediately when it comes back online", () => {
    const { unmount } = render(<SyncProvider />);

    expect(initialize).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(5_000));
    expect(sync).toHaveBeenCalledTimes(1);

    act(() => window.dispatchEvent(new Event("online")));
    expect(sync).toHaveBeenCalledTimes(2);

    act(() => realtime.callback?.());
    expect(sync).toHaveBeenCalledTimes(3);

    unmount();
    act(() => vi.advanceTimersByTime(5_000));
    expect(sync).toHaveBeenCalledTimes(3);
    expect(realtime.removeChannel).toHaveBeenCalledTimes(1);
  });

  it("does not sync while the device is signed out", () => {
    getState.mockReturnValue({ user: null, syncing: false, initialize, sync });
    render(<SyncProvider />);

    act(() => vi.advanceTimersByTime(5_000));
    act(() => window.dispatchEvent(new Event("online")));

    expect(sync).not.toHaveBeenCalled();
    expect(realtime.channel).not.toHaveBeenCalled();
  });

  it("switches the realtime filter when the authenticated user changes", () => {
    getState.mockReturnValue({ user: null, syncing: false, initialize, sync });
    render(<SyncProvider />);

    act(() => realtime.authCallback?.({ user: { id: "next-account" } }));

    expect(realtime.channel).toHaveBeenCalledWith("nexus-sync:next-account");
    expect(realtime.on).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({
        table: "synced_records",
        filter: "user_id=eq.next-account",
      }),
      expect.any(Function)
    );
  });

  it("passes the changed sync table as the preferred first pull", () => {
    render(<SyncProvider />);

    act(() => realtime.callback?.({ new: { table_name: "budgets" }, old: null }));

    expect(sync).toHaveBeenCalledWith("budgets");
  });

  it("routes an update when the table hint is present on the old row", () => {
    render(<SyncProvider />);

    act(() => realtime.callback?.({ new: { updated_at: "2026-09-13T03:00:00Z" }, old: { table_name: "budgets" } }));

    expect(sync).toHaveBeenCalledWith("budgets");
  });

  it("reports Realtime channel failures without exposing account data", () => {
    render(<SyncProvider />);

    const subscribeCallback = realtime.subscribe.mock.calls[0]?.[0] as ((status: string, error?: Error) => void);
    const error = new Error("socket unavailable");
    subscribeCallback("CHANNEL_ERROR", error);

    expect(captureError).toHaveBeenCalledWith(error, {
      source: "realtime",
      status: "CHANNEL_ERROR",
    });
  });

  it("coalesces realtime events received during a sync into one immediate follow-up pass", async () => {
    getState.mockReturnValue({
      user: { id: "same-account" },
      syncing: true,
      initialize,
      sync,
    });
    render(<SyncProvider />);

    act(() => {
      realtime.callback?.();
      realtime.callback?.();
      realtime.callback?.();
    });

    expect(sync).not.toHaveBeenCalled();

    getState.mockReturnValue({
      user: { id: "same-account" },
      syncing: false,
      initialize,
      sync,
    });
    await act(async () => {
      realtime.authCallback?.({ user: { id: "same-account" }, syncing: false });
      await Promise.resolve();
    });

    expect(sync).toHaveBeenCalledTimes(1);
  });
});
