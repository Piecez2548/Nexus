import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { availableBanks, QUICK_SELECT_BANK_IDS } from "@/features/finance/slipScanner/selection/bankSelection";
import { useBankSelectionStore } from "@/features/finance/slipScanner/store/bankSelectionStore";

import { useBankSelection } from "./useBankSelection";

const allCount = availableBanks().length;

beforeEach(() => {
  useBankSelectionStore.getState().reset();
});

describe("useBankSelection", () => {
  it("defaults to all banks selected before the user chooses", () => {
    const { result } = renderHook(() => useBankSelection());
    expect(result.current.allSelected).toBe(true);
    expect(result.current.selectedCount).toBe(allCount);
    expect(result.current.noneSelected).toBe(false);
  });

  it("deselectAll then selectAll flips between none and all", () => {
    const { result } = renderHook(() => useBankSelection());

    act(() => result.current.deselectAll());
    expect(result.current.noneSelected).toBe(true);
    expect(result.current.selectedCount).toBe(0);

    act(() => result.current.selectAll());
    expect(result.current.allSelected).toBe(true);
  });

  it("toggle removes one bank from the full selection", () => {
    const { result } = renderHook(() => useBankSelection());
    const firstId = availableBanks()[0]!.id;

    act(() => result.current.toggle(firstId));
    expect(result.current.isSelected(firstId)).toBe(false);
    expect(result.current.selectedCount).toBe(allCount - 1);
  });

  it("quickSelect selects only the preset banks", () => {
    const { result } = renderHook(() => useBankSelection());
    act(() => result.current.quickSelect());
    expect([...result.current.selectedIds].sort()).toEqual([...QUICK_SELECT_BANK_IDS].sort());
  });

  it("search filters the visible bank list", () => {
    const { result } = renderHook(() => useBankSelection());
    act(() => result.current.setQuery("scb"));
    expect(result.current.banks.map((b) => b.id)).toEqual(["scb"]);
  });

  it("reports the scan estimate for the given image count", () => {
    const { result } = renderHook(() => useBankSelection(100));
    expect(result.current.estimate.imageCount).toBe(100);
    expect(result.current.estimate.totalSeconds).toBe(40);
  });
});
