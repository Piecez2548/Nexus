import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { categoryLearningKey } from "@/features/finance/slipScanner/ai/transactionCategorizer";
import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";
import { useCategoryLearningStore } from "@/features/finance/slipScanner/store/categoryLearningStore";
import { useLanguageStore } from "@/store/languageStore";
import { useToastStore } from "@/store/toastStore";

import { useNotificationAutoSaveStore } from "../store/notificationAutoSaveStore";

const importCandidates = vi.hoisted(() => vi.fn());
vi.mock("@/features/finance/slipScanner/hooks/useSmartImport", () => ({
  useSmartImport: () => ({ importCandidates }),
}));

import { useNotificationAutoSave } from "./useNotificationAutoSave";

function candidate(id: string, merchant = "7-Eleven"): SlipCandidate {
  return {
    id,
    assetId: id,
    source: "notification",
    isDuplicate: false,
    confidence: 90,
    bankId: "scb",
    bankName: "SCB",
    amount: 120,
    merchant,
  };
}

beforeEach(() => {
  importCandidates.mockReset();
  useLanguageStore.setState({ language: "en" });
  useToastStore.setState({ toasts: [] });
  useNotificationAutoSaveStore.setState({ enabled: true });
  useCategoryLearningStore.setState({ corrections: { [categoryLearningKey("7-Eleven")]: "Food" } });
});

describe("useNotificationAutoSave", () => {
  it("does nothing while the setting is off", () => {
    useNotificationAutoSaveStore.setState({ enabled: false });
    const acknowledge = vi.fn().mockResolvedValue(undefined);
    const list = [candidate("notification:1")];
    const { result } = renderHook(() => useNotificationAutoSave(list, acknowledge));

    expect(result.current).toEqual(list);
    expect(importCandidates).not.toHaveBeenCalled();
  });

  it("saves a trusted candidate, acknowledges it, and offers Undo", async () => {
    importCandidates.mockResolvedValue({ importedIds: [5], importedCandidateIds: ["notification:1"], failed: [], skippedDuplicates: [] });
    const acknowledge = vi.fn().mockResolvedValue(undefined);
    const list = [candidate("notification:1"), candidate("notification:2", "Unknown Shop")];
    const { result } = renderHook(() => useNotificationAutoSave(list, acknowledge));

    // The trusted one never reaches the confirm sheet; the unknown one does.
    expect(result.current.map((c) => c.id)).toEqual(["notification:2"]);
    await waitFor(() => expect(acknowledge).toHaveBeenCalledWith("notification:1"));
    expect(importCandidates).toHaveBeenCalledTimes(1);
    expect(importCandidates.mock.calls[0]?.[2]).toBe("notification");

    const toast = useToastStore.getState().toasts[0];
    expect(toast?.message).toContain("120");
    expect(toast?.action?.label).toBe("Undo");
  });

  it("falls back to the confirm sheet when the save fails", async () => {
    importCandidates.mockRejectedValue(new Error("db down"));
    const acknowledge = vi.fn().mockResolvedValue(undefined);
    const list = [candidate("notification:1")];
    const { result } = renderHook(() => useNotificationAutoSave(list, acknowledge));

    await waitFor(() => expect(result.current.map((c) => c.id)).toEqual(["notification:1"]));
    await act(async () => {});
    expect(acknowledge).not.toHaveBeenCalled();
    expect(importCandidates).toHaveBeenCalledTimes(1);
  });
});
