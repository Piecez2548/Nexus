import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const source = readFileSync("public/stale-guard.js", "utf8");

function failLoad(tag: "script" | "link", url: string) {
  const element = document.createElement(tag);
  if (tag === "script") element.setAttribute("src", url); else element.setAttribute("href", url);
  document.head.appendChild(element);
  element.dispatchEvent(new Event("error"));
}

describe("public/stale-guard.js", () => {
  const unregister = vi.fn().mockResolvedValue(true);
  const deleteCache = vi.fn().mockResolvedValue(true);
  const reload = vi.fn();
  let listener: ((event: Event) => void) | undefined;

  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal("caches", { keys: () => Promise.resolve(["a", "b"]), delete: deleteCache });
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { getRegistrations: () => Promise.resolve([{ unregister }]) } });
    const add = window.addEventListener.bind(window);
    vi.spyOn(window, "addEventListener").mockImplementation((type: string, fn: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
      if (type === "error") listener = fn as (event: Event) => void;
      add(type, fn, options);
    });
    vi.spyOn(window, "location", "get").mockReturnValue({ ...window.location, origin: "http://localhost", reload } as unknown as Location);
    new Function(source)();
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.clearAllMocks(); listener && window.removeEventListener("error", listener, true); });

  it("clears the worker and caches then reloads when an /assets file is missing", async () => {
    failLoad("script", "http://localhost/assets/index-OLD.js");
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(unregister).toHaveBeenCalled();
    expect(deleteCache).toHaveBeenCalledTimes(2);
  });

  it("reloads only once so a genuinely broken file cannot loop", async () => {
    failLoad("script", "http://localhost/assets/index-OLD.js");
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    failLoad("link", "http://localhost/assets/index-OLD.css");
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("ignores failures of files that are not the app's own assets", async () => {
    failLoad("script", "https://third-party.example/script.js");
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(reload).not.toHaveBeenCalled();
  });
});
