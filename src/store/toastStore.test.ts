import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { useToastStore } from "./toastStore";

describe("toastStore", () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds a toast with the given type and message", () => {
    useToastStore.getState().show("success", "Saved!");

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toMatchObject({ type: "success", message: "Saved!" });
  });

  it("supports multiple simultaneous toasts with unique ids", () => {
    useToastStore.getState().show("error", "First");
    useToastStore.getState().show("warning", "Second");

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(2);
    expect(toasts[0].id).not.toBe(toasts[1].id);
  });

  it("dismiss removes a toast by id", () => {
    useToastStore.getState().show("info", "Hello");
    const id = useToastStore.getState().toasts[0].id;

    useToastStore.getState().dismiss(id);

    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it("auto-dismisses a toast after the duration elapses", () => {
    useToastStore.getState().show("success", "Auto");
    expect(useToastStore.getState().toasts).toHaveLength(1);

    vi.advanceTimersByTime(4000);

    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});
