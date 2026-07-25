import { describe, expect, it, beforeEach } from "vitest";
import { useNotificationStore } from "./notificationStore";

describe("notificationStore", () => {
  beforeEach(() => {
    useNotificationStore.setState({ dismissedIds: [] });
  });

  it("adds an id to dismissedIds", () => {
    useNotificationStore.getState().dismiss("budget-1");
    expect(useNotificationStore.getState().dismissedIds).toEqual(["budget-1"]);
  });

  it("does not add the same id twice", () => {
    useNotificationStore.getState().dismiss("budget-1");
    useNotificationStore.getState().dismiss("budget-1");
    expect(useNotificationStore.getState().dismissedIds).toEqual(["budget-1"]);
  });
});
