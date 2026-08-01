import { describe, expect, it, beforeEach } from "vitest";
import { useGamificationStore } from "./gamificationStore";
import { useToastStore } from "./toastStore";
import { toLocalDateString } from "@/utils/localDate";

function todayIso() {
  return toLocalDateString(new Date());
}

function daysAgoIso(days: number) {
  return toLocalDateString(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
}

describe("gamificationStore", () => {
  beforeEach(() => {
    useGamificationStore.setState({ xp: 0, streak: 0, lastActiveDate: null });
    useToastStore.setState({ toasts: [] });
  });

  it("adds xp", () => {
    useGamificationStore.getState().addXp(30);
    expect(useGamificationStore.getState().xp).toBe(30);
  });

  it("starts a streak at 1 on the first recorded activity", () => {
    useGamificationStore.getState().addXp(10);
    expect(useGamificationStore.getState().streak).toBe(1);
    expect(useGamificationStore.getState().lastActiveDate).toBe(todayIso());
  });

  it("does not increment the streak twice on the same day", () => {
    useGamificationStore.getState().addXp(10);
    useGamificationStore.getState().addXp(10);
    expect(useGamificationStore.getState().streak).toBe(1);
  });

  it("increments the streak when the last activity was yesterday", () => {
    useGamificationStore.setState({ lastActiveDate: daysAgoIso(1), streak: 4 });
    useGamificationStore.getState().addXp(10);
    expect(useGamificationStore.getState().streak).toBe(5);
  });

  it("resets the streak to 1 after a missed day", () => {
    useGamificationStore.setState({ lastActiveDate: daysAgoIso(3), streak: 7 });
    useGamificationStore.getState().addXp(10);
    expect(useGamificationStore.getState().streak).toBe(1);
  });

  it("shows a level-up toast when xp crosses a level boundary", () => {
    useGamificationStore.setState({ xp: 90 });
    useGamificationStore.getState().addXp(20);

    expect(useGamificationStore.getState().xp).toBe(110);
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toContain("Lv.2");
  });

  it("does not show a toast when staying within the same level", () => {
    useGamificationStore.setState({ xp: 10 });
    useGamificationStore.getState().addXp(20);

    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});
