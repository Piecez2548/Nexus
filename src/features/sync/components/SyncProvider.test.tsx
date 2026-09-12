import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { initialize, sync, getState } = vi.hoisted(() => ({
  initialize: vi.fn(),
  sync: vi.fn(),
  getState: vi.fn(),
}));

vi.mock("@/features/sync/store/authStore", () => ({
  useAuthStore: { getState },
}));

import { SyncProvider } from "./SyncProvider";

describe("SyncProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    initialize.mockReset();
    sync.mockReset();
    getState.mockReset().mockReturnValue({ user: { id: "same-account" }, initialize, sync });
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

    unmount();
    act(() => vi.advanceTimersByTime(5_000));
    expect(sync).toHaveBeenCalledTimes(2);
  });

  it("does not sync while the device is signed out", () => {
    getState.mockReturnValue({ user: null, initialize, sync });
    render(<SyncProvider />);

    act(() => vi.advanceTimersByTime(5_000));
    act(() => window.dispatchEvent(new Event("online")));

    expect(sync).not.toHaveBeenCalled();
  });
});
