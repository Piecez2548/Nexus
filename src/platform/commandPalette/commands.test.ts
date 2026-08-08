import { describe, expect, it, vi } from "vitest";

import { filterCommands, fuzzyScore, type Command } from "./commands";

describe("fuzzyScore", () => {
  it("scores a subsequence match and rewards consecutive characters", () => {
    expect(fuzzyScore("trn", "transactions")).not.toBeNull();
    const consecutive = fuzzyScore("tra", "transactions")!;
    const scattered = fuzzyScore("tas", "transactions")!;
    expect(consecutive).toBeGreaterThan(scattered);
  });

  it("returns null when not a subsequence, 0 for empty query", () => {
    expect(fuzzyScore("zzz", "transactions")).toBeNull();
    expect(fuzzyScore("", "anything")).toBe(0);
  });
});

describe("filterCommands", () => {
  const cmd = (id: string, title: string, keywords?: string[]): Command => ({ id, title, keywords, run: vi.fn() });
  const commands = [cmd("1", "Transactions"), cmd("2", "Budget", ["money"]), cmd("3", "Trading Journal")];

  it("returns all commands for an empty query", () => {
    expect(filterCommands(commands, "")).toHaveLength(3);
  });

  it("ranks matches, matching title or keywords", () => {
    expect(filterCommands(commands, "trans")[0]!.id).toBe("1");
    expect(filterCommands(commands, "money").map((c) => c.id)).toEqual(["2"]);
    expect(filterCommands(commands, "zzz")).toEqual([]);
  });
});
