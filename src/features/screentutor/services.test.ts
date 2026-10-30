import { afterEach, describe, expect, it, vi } from "vitest";
import { classifyContent, cleanOcrText, parseMultipleChoice, parseOllamaUrl, OllamaProvider, ScreenTutorError } from "./services";
import type { AnalysisRequest } from "./types";

describe("ScreenTutor text pipeline", () => {
  it("cleans OCR whitespace and control characters", () => {
    expect(cleanOcrText("  Hello   world \u0000\n\n\n Thai  ")).toBe("Hello world\n\nThai");
  });

  it("classifies multiple choice and programming errors", () => {
    expect(classifyContent("Choose one\nA. First\nB. Second\nC. Third")).toBe("MULTIPLE_CHOICE");
    expect(classifyContent("TypeError: cannot read property")).toBe("PROGRAMMING_ERROR");
  });

  it.each([
    ["Solve 3 + 4 = ?", "MATH"],
    ["12 × 5", "MATH"],
    ["10 - 3", "MATH"],
    ["Meeting on 2026-10-30 at room 4", "GENERAL_TEXT"],
    ["Due 30/10/2026", "GENERAL_TEXT"],
    ["Call 081-234-5678 today", "GENERAL_TEXT"],
    ["Visit https://example.com/page2 for details", "GENERAL_TEXT"],
    ["The error bars show standard deviation", "GENERAL_TEXT"],
    ["src/app.ts(12,5): error TS2322: Type mismatch", "PROGRAMMING_ERROR"],
    ["Traceback (most recent call last):\n  File x.py", "PROGRAMMING_ERROR"],
    ["Pick\nA. a\nB. b\nC. c\nD. d\nE. e", "MULTIPLE_CHOICE"],
    ["ข้อใดถูกต้อง\nก. หนึ่ง\nข. สอง", "MULTIPLE_CHOICE"],
    ["Which is right?\n1) red\n2) blue\n3) green", "MULTIPLE_CHOICE"],
    ["Method\n1. Preheat the oven\n2. Mix the flour", "GENERAL_TEXT"],
    ["แปลเป็นภาษาอังกฤษ: สวัสดี", "TRANSLATION"],
    ["   \n  ", "UNKNOWN"],
  ] as const)("classifies %j as %s", (text, expected) => {
    expect(classifyContent(text)).toBe(expected);
  });

  it("turns tabs into spaces instead of dropping them", () => {
    expect(cleanOcrText("name	value")).toBe("name value");
  });

  it("parses choices into a structured question", () => {
    expect(parseMultipleChoice("Which is best?\nA. One\nB) Two\nC. Three")).toEqual({
      question: "Which is best?",
      choices: [{ key: "A", text: "One" }, { key: "B", text: "Two" }, { key: "C", text: "Three" }],
    });
  });
});

const request: AnalysisRequest = { text: "A question", contentType: "GENERAL_TEXT", learningMode: "explain", model: "test", temperature: 0.2 };

afterEach(() => vi.unstubAllGlobals());

describe("Ollama address", () => {
  it("accepts http(s) addresses and marks local ones", () => {
    expect(parseOllamaUrl("http://localhost:11434/")).toEqual({ url: "http://localhost:11434", local: true });
    expect(parseOllamaUrl("http://127.0.0.1:11434")?.local).toBe(true);
    expect(parseOllamaUrl("http://[::1]:11434")?.local).toBe(true);
    expect(parseOllamaUrl("https://ai.example.com")).toEqual({ url: "https://ai.example.com", local: false });
  });

  it.each(["", "localhost:11434", "ftp://x.test", "javascript:alert(1)", "http://user:pw@host.test"])("rejects %j", (value) => {
    expect(parseOllamaUrl(value)).toBeNull();
  });
});

describe("ScreenTutor provider integrity", () => {
  it("marks only a validated provider response with explicit provenance", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ response: JSON.stringify({ summary: "Grounded explanation" }) }), { status: 200 })));
    await expect(new OllamaProvider("http://localhost:11434").analyze(request)).resolves.toMatchObject({ source: "ollama", summary: "Grounded explanation" });
  });

  it.each(["", "not json", "{}"])("rejects malformed or empty model output (%s)", async (response) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ response }), { status: 200 })));
    await expect(new OllamaProvider("http://localhost:11434").analyze(request)).rejects.toMatchObject({ code: "invalid_response" });
  });

  it("rejects provider failures without exposing provider internals", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("internal details", { status: 500 })));
    await expect(new OllamaProvider("http://localhost:11434").analyze(request)).rejects.toMatchObject({ code: "request_failed", message: "Ollama could not complete the analysis. Please retry." });
  });

  it("maps network failures to a safe unavailable state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("private connection detail")));
    await expect(new OllamaProvider("http://localhost:11434").analyze(request)).rejects.toMatchObject({ code: "unavailable", message: "Ollama is not currently available. Check that it is running, then retry." });
  });

  it("maps a provider timeout to a safe retryable error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("timed out", "TimeoutError")));
    await expect(new OllamaProvider("http://localhost:11434").analyze(request)).rejects.toMatchObject({ code: "timeout", message: "Ollama did not respond in time. Please retry." });
  });

  it("distinguishes malformed provider health data from an offline provider", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 200 })));
    await expect(new OllamaProvider("http://localhost:11434").health()).resolves.toBe("error");
  });

  it("fails closed when a real desktop capture bridge is missing", async () => {
    vi.stubGlobal("window", { screenTutor: undefined });
    await expect((await import("./services")).captureService.captureRegion({ x: 0, y: 0, width: 100, height: 100 })).rejects.toBeInstanceOf(ScreenTutorError);
  });
});
