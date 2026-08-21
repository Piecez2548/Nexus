import { describe, expect, it, vi } from "vitest";
import { ConfigurationError } from "@/ai/utils/errors";

vi.mock("@/lib/supabaseClient", () => ({ supabase: null }));

const { ClaudeProvider } = await import("./ClaudeProvider");

describe("ClaudeProvider (Supabase not configured)", () => {
  it("isAvailable() resolves false and initialize() rejects with ConfigurationError", async () => {
    const provider = new ClaudeProvider();

    await expect(provider.isAvailable()).resolves.toBe(false);
    await expect(provider.initialize({ providerName: "claude" })).rejects.toBeInstanceOf(ConfigurationError);
  });
});
