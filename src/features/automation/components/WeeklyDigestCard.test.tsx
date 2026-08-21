import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockGetLatestUnseenDigest = vi.fn();
const mockMarkDigestSeen = vi.fn();

vi.mock("@/features/automation/automationService", () => ({
  getLatestUnseenDigest: (...args: unknown[]) => mockGetLatestUnseenDigest(...args),
  markDigestSeen: (...args: unknown[]) => mockMarkDigestSeen(...args),
}));

const { useAuthStore } = await import("@/features/sync/store/authStore");
const { default: WeeklyDigestCard } = await import("./WeeklyDigestCard");

const DIGEST = {
  id: "d1",
  period_start: "2026-08-10",
  period_end: "2026-08-17",
  income: 5000,
  expense: 3200,
  net: 1800,
  transaction_count: 12,
};

describe("WeeklyDigestCard", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: { id: "u1" } as never });
    mockGetLatestUnseenDigest.mockReset();
    mockMarkDigestSeen.mockReset().mockResolvedValue(undefined);
  });

  it("renders nothing when signed out", () => {
    useAuthStore.setState({ user: null });
    const { container } = render(<WeeklyDigestCard />);

    expect(container).toBeEmptyDOMElement();
    expect(mockGetLatestUnseenDigest).not.toHaveBeenCalled();
  });

  it("renders nothing while there is no unseen digest", async () => {
    mockGetLatestUnseenDigest.mockResolvedValue(null);
    const { container } = render(<WeeklyDigestCard />);

    await vi.waitFor(() => expect(mockGetLatestUnseenDigest).toHaveBeenCalledWith("u1"));
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the formatted digest once loaded", async () => {
    mockGetLatestUnseenDigest.mockResolvedValue(DIGEST);
    render(<WeeklyDigestCard />);

    expect(await screen.findByText("Weekly Digest")).toBeInTheDocument();
    expect(screen.getByText("฿5,000")).toBeInTheDocument();
    expect(screen.getByText("฿3,200")).toBeInTheDocument();
    expect(screen.getByText("฿1,800")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("dismisses the card and marks the digest seen", async () => {
    mockGetLatestUnseenDigest.mockResolvedValue(DIGEST);
    const user = userEvent.setup();
    render(<WeeklyDigestCard />);

    await screen.findByText("Weekly Digest");
    await user.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(mockMarkDigestSeen).toHaveBeenCalledWith("d1");
    expect(screen.queryByText("Weekly Digest")).not.toBeInTheDocument();
  });
});
