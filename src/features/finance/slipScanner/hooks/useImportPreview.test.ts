import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";

import { useImportPreview } from "./useImportPreview";

// High confidence + an amount present, by default, so the fixture list is
// auto-import-eligible unless a test overrides one of those (matching the
// confidence-tier policy: only high-tier, non-duplicate candidates default-select).
const candidate = (over: Partial<SlipCandidate>): SlipCandidate => ({
  id: "x",
  assetId: "x",
  source: "qr",
  isDuplicate: false,
  confidence: 90,
  amount: 100,
  ...over,
});

const list: SlipCandidate[] = [
  candidate({ id: "1", merchant: "Coffee" }),
  candidate({ id: "2", merchant: "Books", isDuplicate: true }),
  candidate({ id: "3", merchant: "Grocery" }),
];

describe("useImportPreview", () => {
  it("defaults to selecting every high-confidence, non-duplicate candidate", () => {
    const { result } = renderHook(() => useImportPreview(list));
    expect(result.current.selectedCandidates.map((c) => c.id)).toEqual(["1", "3"]);
    expect(result.current.isSelected("2")).toBe(false);
  });

  it("does not default-select a candidate that is merely medium/low confidence or missing its amount, even when not a duplicate", () => {
    const mixed: SlipCandidate[] = [
      candidate({ id: "sure", confidence: 90, amount: 100 }),
      candidate({ id: "unsure", confidence: 40, amount: 100 }),
      candidate({ id: "no-amount", confidence: 90, amount: undefined }),
    ];
    const { result } = renderHook(() => useImportPreview(mixed));
    expect(result.current.selectedCandidates.map((c) => c.id)).toEqual(["sure"]);
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

  it("applies a field edit on top of the original candidate, everywhere the candidate is read", () => {
    const { result } = renderHook(() => useImportPreview(list));
    act(() => result.current.applyEdit("1", { amount: 999, category: "Business" }));

    const edited = result.current.visible.find((c) => c.id === "1");
    expect(edited?.amount).toBe(999);
    expect(edited?.category).toBe("Business");
    // Everything not explicitly edited is untouched.
    expect(edited?.merchant).toBe("Coffee");

    // selectedCandidates (what actually gets imported) reflects the edit too.
    const selected = result.current.selectedCandidates.find((c) => c.id === "1");
    expect(selected?.amount).toBe(999);
  });

  it("tracks which row is being edited and exposes its pending edit", () => {
    const { result } = renderHook(() => useImportPreview(list));
    expect(result.current.editingId).toBeNull();

    act(() => result.current.startEdit("1"));
    expect(result.current.editingId).toBe("1");

    act(() => result.current.applyEdit("1", { merchant: "Corrected Name" }));
    expect(result.current.editsFor("1")).toEqual({ merchant: "Corrected Name" });
    expect(result.current.editsFor("2")).toBeUndefined();
  });

  it("clears edits when the candidate set changes (a new scan)", () => {
    const { result, rerender } = renderHook(({ items }) => useImportPreview(items), {
      initialProps: { items: list },
    });
    act(() => result.current.applyEdit("1", { amount: 999 }));
    expect(result.current.editsFor("1")).toBeDefined();

    rerender({ items: [candidate({ id: "9", merchant: "New" })] });
    expect(result.current.editsFor("1")).toBeUndefined();
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
