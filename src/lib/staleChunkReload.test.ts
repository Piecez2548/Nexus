import { afterEach, describe, expect, it, vi } from "vitest";
import { installStaleChunkReload } from "./staleChunkReload";

function memoryStorage() {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
}

function fire() {
  const event = new Event("vite:preloadError", { cancelable: true });
  window.dispatchEvent(event);
  return event;
}

describe("stale chunk reload", () => {
  let uninstall: (() => void) | undefined;
  afterEach(() => uninstall?.());

  it("reloads once and suppresses the error when a chunk fails to load", () => {
    const reload = vi.fn();
    uninstall = installStaleChunkReload(reload, memoryStorage(), () => 1_000_000);
    const event = fire();
    expect(reload).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it("does not loop: a second failure right after reloading surfaces the error", () => {
    const reload = vi.fn();
    const storage = memoryStorage();
    let time = 1_000_000;
    uninstall = installStaleChunkReload(reload, storage, () => time);
    fire();
    time += 5_000;
    const second = fire();
    expect(reload).toHaveBeenCalledTimes(1);
    expect(second.defaultPrevented).toBe(false);
  });

  it("reloads again for a later deploy", () => {
    const reload = vi.fn();
    let time = 1_000_000;
    uninstall = installStaleChunkReload(reload, memoryStorage(), () => time);
    fire();
    time += 60_000;
    fire();
    expect(reload).toHaveBeenCalledTimes(2);
  });
});
