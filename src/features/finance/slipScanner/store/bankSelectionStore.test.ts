import { beforeEach, describe, expect, it } from "vitest";

import { useBankSelectionStore } from "./bankSelectionStore";

beforeEach(() => {
  useBankSelectionStore.getState().reset();
});

describe("useBankSelectionStore", () => {
  it("starts unchosen with an empty selection", () => {
    const state = useBankSelectionStore.getState();
    expect(state.chosen).toBe(false);
    expect(state.selectedBankIds).toEqual([]);
  });

  it("marks the selection chosen when set", () => {
    useBankSelectionStore.getState().setSelectedBankIds(["scb", "kbank"]);
    const state = useBankSelectionStore.getState();
    expect(state.chosen).toBe(true);
    expect(state.selectedBankIds).toEqual(["scb", "kbank"]);
  });

  it("reset returns to the unchosen default", () => {
    useBankSelectionStore.getState().setSelectedBankIds(["scb"]);
    useBankSelectionStore.getState().reset();
    expect(useBankSelectionStore.getState().chosen).toBe(false);
    expect(useBankSelectionStore.getState().selectedBankIds).toEqual([]);
  });
});
