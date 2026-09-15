import { describe, expect, it } from "vitest";
import { runBubbleSort, runInsertionSort, runSelectionSort } from "./sortingAlgorithms";

describe("sorting algorithm executions", () => {
  it.each([runBubbleSort, runSelectionSort, runInsertionSort])("ends with a sorted snapshot", (run) => {
    const execution = run();
    const finalValues = execution.steps.at(-2)?.values ?? [];
    expect(finalValues).toEqual([9, 18, 23, 31, 42, 56, 64]);
    expect(execution.steps.at(-1)?.type).toBe("complete");
  });
});
