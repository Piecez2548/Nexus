import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ScreenTutorApp from "./ScreenTutorApp";
import { ScreenTutorError } from "./services";

const providerMock = vi.hoisted(() => ({ health: vi.fn(), models: vi.fn(), analyze: vi.fn(), captureRegion: vi.fn(), recognizeImage: vi.fn() }));
const storeMock = vi.hoisted(() => ({
  settings: { ollamaUrl: "http://localhost:11434", model: "local-model", temperature: 0.2, ocrLanguage: "eng" as const, learningMode: "explain" as const, storeHistory: false, developerMode: false, theme: "system" as const, hotkey: "Ctrl+Shift+Space" },
  region: { x: 0, y: 0, width: 200, height: 100 },
  history: [],
  setRegion: vi.fn(), setSettings: vi.fn(), addHistory: vi.fn(), deleteHistory: vi.fn(), clearHistory: vi.fn(),
}));
vi.mock("./services", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./services")>();
  return {
    ...actual,
    captureService: { captureRegion: providerMock.captureRegion },
    recognizeImage: providerMock.recognizeImage,
    OllamaProvider: class {
      health = providerMock.health;
      models = providerMock.models;
      analyze = providerMock.analyze;
    },
  };
});
vi.mock("./store", () => ({ useScreenTutorStore: Object.assign(vi.fn(() => storeMock), { getState: () => storeMock }) }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("ScreenTutor provider state UI", () => {
  it("shows unavailable without generating or presenting fallback answers", async () => {
    providerMock.health.mockResolvedValue("unavailable");
    render(<ScreenTutorApp />);
    expect(await screen.findByText("AI unavailable")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Test capture" }));
    expect(await screen.findByText("AI unavailable. Start Ollama and select a model, then retry.")).toBeInTheDocument();
    expect(screen.queryByText("C is the strongest choice")).not.toBeInTheDocument();
    expect(providerMock.analyze).not.toHaveBeenCalled();
  });

  it("retries provider health and recovers to connected state", async () => {
    providerMock.health.mockResolvedValueOnce("unavailable").mockResolvedValueOnce("ready");
    providerMock.models.mockResolvedValue([{ name: "local-model" }]);
    render(<ScreenTutorApp />);
    await screen.findByText("AI unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.getByText("Ollama connected")).toBeInTheDocument());
  });

  it("shows an error when inference fails instead of showing a result", async () => {
    providerMock.health.mockResolvedValue("ready");
    providerMock.models.mockResolvedValue([{ name: "local-model" }]);
    providerMock.captureRegion.mockResolvedValue({ imageDataUrl: "data:image/png;base64,test", region: { x: 0, y: 0, width: 200, height: 100 }, captureTime: 1 });
    providerMock.recognizeImage.mockResolvedValue({ cleanedText: "Actual captured text", text: "Actual captured text", language: "eng", processingTime: 1 });
    providerMock.analyze.mockRejectedValue(new ScreenTutorError("invalid_response", "Ollama returned an unreadable response."));
    render(<ScreenTutorApp />);
    await screen.findByText("Ollama connected");
    fireEvent.click(screen.getByRole("button", { name: "Test capture" }));
    await waitFor(() => expect(providerMock.analyze).toHaveBeenCalled());
    expect(await screen.findByText("Ollama returned an unreadable response.")).toBeInTheDocument();
    expect(screen.getByText("Ollama error")).toBeInTheDocument();
    expect(screen.queryByText("Analysis complete")).not.toBeInTheDocument();
  });
});
