import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";

import { useImportPreview } from "./useImportPreview";

const candidate = (over: Partial<SlipCandidate>): SlipCandidate => ({
  id: "x",
  assetId: "x",
  source: "qr",
  isDuplicate: false,
  confidence: 50,
  ...over,
});

const list: SlipCandidate[] = [
  candidate({ id: "1", merchant: "Coffee" }),
  candidate({ id: "2", merchant: "Books", isDuplicate: true }),
  candidate({ id: "3", merchant: "Grocery" }),
];

describe("useImportPreview", () => {
  it("defaults to selecting every non-duplicate candidate", () => {
    const { result } = renderHook(() => useImportPreview(list));
    expect(result.current.selectedCandidates.map((c) => c.id)).toEqual(["1", "3"]);
    expect(result.current.isSelected("2")).toBe(false);
  });

  it("toggles a single candidate", () => {
    const { result } = renderHook(() => useImportPreview(list));
    act(() => result.current.toggle("2"));
    expect(result.current.isSelected("2")).toBe(true);
    act(() => result.current.toggle("1"));
    expect(result.current.isSelected("1")).toBe(false);
  });

  it("selectAllVisible and deselectAll act on the visible set", () => {
    const { result } = renderHook(() => useImportPreview(list));
    act(() => result.current.deselectAll());
    expect(result.current.selectedCount).toBe(0);
    act(() => result.current.selectAllVisible());
    expect(result.current.selectedCount).toBe(3);
    expect(result.current.allVisibleSelected).toBe(true);
  });

  it("filters the visible list by duplicate status and search", () => {
    const { result } = renderHook(() => useImportPreview(list));
    act(() => result.current.setDuplicateFilter("duplicates"));
    expect(result.current.visible.map((c) => c.id)).toEqual(["2"]);

    act(() => result.current.setDuplicateFilter("all"));
    act(() => result.current.setSearch("grocery"));
    expect(result.current.visible.map((c) => c.id)).toEqual(["3"]);
  });

  it("resets selection to the default when the candidate set changes", () => {
    const { result, rerender } = renderHook(({ items }) => useImportPreview(items), {
      initialProps: { items: list },
    });
    act(() => result.current.deselectAll());
    expect(result.current.selectedCount).toBe(0);

    const nextList = [candidate({ id: "9", merchant: "New" })];
    rerender({ items: nextList });
    expect(result.current.selectedCandidates.map((c) => c.id)).toEqual(["9"]);
  });
});
