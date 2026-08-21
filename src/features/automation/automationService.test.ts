import { describe, expect, it, vi, beforeEach } from "vitest";

// A minimal, generically chainable + thenable stand-in for the PostgREST
// query builder -- every method returns the same builder (so any call
// order/depth used by automationService.ts works), and the builder itself
// resolves via `then`, matching how the real supabase-js builder can be
// awaited at any point, not just after a specific terminal method.
function makeQueryBuilder(resolved: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    update: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(resolved)),
    then: (resolve: (v: typeof resolved) => void) => resolve(resolved),
  };
  return builder;
}

let mockBuilder: ReturnType<typeof makeQueryBuilder>;
const mockFrom = vi.fn(() => mockBuilder);

vi.mock("@/lib/supabaseClient", () => ({
  get supabase() {
    return mockSupabase;
  },
}));

let mockSupabase: { from: typeof mockFrom } | null = { from: mockFrom };

const { getLatestUnseenDigest, markDigestSeen } = await import("./automationService");

describe("automationService", () => {
  beforeEach(() => {
    mockSupabase = { from: mockFrom };
    mockFrom.mockClear();
    mockBuilder = makeQueryBuilder({ data: null, error: null });
  });

  describe("getLatestUnseenDigest", () => {
    it("returns the digest row when one exists", async () => {
      const digest = { id: "d1", period_start: "2026-08-10", period_end: "2026-08-17", income: 1000, expense: 400, net: 600, transaction_count: 5 };
      mockBuilder = makeQueryBuilder({ data: digest, error: null });

      const result = await getLatestUnseenDigest("u1");

      expect(mockFrom).toHaveBeenCalledWith("automation_weekly_digests");
      expect(mockBuilder.eq).toHaveBeenCalledWith("user_id", "u1");
      expect(mockBuilder.is).toHaveBeenCalledWith("seen_at", null);
      expect(result).toEqual(digest);
    });

    it("returns null on a query error", async () => {
      mockBuilder = makeQueryBuilder({ data: null, error: { message: "boom" } });

      await expect(getLatestUnseenDigest("u1")).resolves.toBeNull();
    });

    it("returns null when Supabase isn't configured", async () => {
      mockSupabase = null;

      await expect(getLatestUnseenDigest("u1")).resolves.toBeNull();
      expect(mockFrom).not.toHaveBeenCalled();
    });
  });

  describe("markDigestSeen", () => {
    it("updates seen_at for the given digest id", async () => {
      await markDigestSeen("d1");

      expect(mockFrom).toHaveBeenCalledWith("automation_weekly_digests");
      expect(mockBuilder.update).toHaveBeenCalledWith(expect.objectContaining({ seen_at: expect.any(String) }));
      expect(mockBuilder.eq).toHaveBeenCalledWith("id", "d1");
    });

    it("is a no-op when Supabase isn't configured", async () => {
      mockSupabase = null;

      await markDigestSeen("d1");

      expect(mockFrom).not.toHaveBeenCalled();
    });
  });
});
