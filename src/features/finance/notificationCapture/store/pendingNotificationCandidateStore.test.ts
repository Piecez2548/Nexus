import { beforeEach, describe, expect, it, vi } from "vitest";

const getPendingCandidates = vi.fn();
const acknowledgeCandidate = vi.fn();

vi.mock("../native/notificationCapturePlugin", () => ({
  PaymentNotificationCapture: {
    getPendingCandidates: (...args: unknown[]) => getPendingCandidates(...args),
    acknowledgeCandidate: (...args: unknown[]) => acknowledgeCandidate(...args),
  },
}));

const { usePendingNotificationCandidateStore } = await import("./pendingNotificationCandidateStore");

beforeEach(() => {
  getPendingCandidates.mockReset();
  acknowledgeCandidate.mockReset().mockResolvedValue(undefined);
  usePendingNotificationCandidateStore.setState({ candidates: [] });
});

describe("usePendingNotificationCandidateStore", () => {
  it("refresh() builds candidates from recognised raw notifications", async () => {
    getPendingCandidates.mockResolvedValue({
      candidates: [
        { id: "a1", packageName: "com.scb.phone", title: "จ่ายเงินสำเร็จ", text: "100.00 บาท", bigText: "", postedAtMs: 1 },
      ],
    });

    await usePendingNotificationCandidateStore.getState().refresh();

    const { candidates } = usePendingNotificationCandidateStore.getState();
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.amount).toBe(100);
    expect(candidates[0]?.id).toBe("notification:a1");
  });

  it("refresh() silently acknowledges (drops) a raw entry with no parseable amount", async () => {
    getPendingCandidates.mockResolvedValue({
      candidates: [
        { id: "a2", packageName: "com.scb.phone", title: "New feature!", text: "", bigText: "", postedAtMs: 1 },
      ],
    });

    await usePendingNotificationCandidateStore.getState().refresh();

    expect(usePendingNotificationCandidateStore.getState().candidates).toHaveLength(0);
    expect(acknowledgeCandidate).toHaveBeenCalledWith({ id: "a2" });
  });

  it("acknowledge() strips the notification: prefix when calling native, and removes it locally", async () => {
    usePendingNotificationCandidateStore.setState({
      candidates: [
        { id: "notification:a3", assetId: "notification:a3", amount: 50, source: "notification", isDuplicate: false, confidence: 90 },
      ],
    });

    await usePendingNotificationCandidateStore.getState().acknowledge("notification:a3");

    expect(acknowledgeCandidate).toHaveBeenCalledWith({ id: "a3" });
    expect(usePendingNotificationCandidateStore.getState().candidates).toHaveLength(0);
  });
});
