import { afterEach, describe, expect, it, vi } from "vitest";
import { classifyContent, cleanOcrText, parseMultipleChoice, parseOllamaUrl, OllamaProvider, ScreenTutorError, toImageRect, historyToMarkdown, buildSearchQuery, webSearch, toFraction } from "./services";
import type { AnalysisRequest } from "./types";

describe("ScreenTutor text pipeline", () => {
  it("cleans OCR whitespace and control characters", () => {
    expect(cleanOcrText("  Hello   world \u0000\n\n\n Thai  ")).toBe("Hello world\n\nThai");
  });

  it("classifies multiple choice and programming errors", () => {
    expect(classifyContent("Choose one\nA. First\nB. Second\nC. Third")).toBe("MULTIPLE_CHOICE");
    expect(classifyContent("Which planet is largest? A. Mars B. Jupiter C. Venus")).toBe("MULTIPLE_CHOICE");
    expect(parseMultipleChoice("Which planet is largest? A. Mars B. Jupiter C. Venus")).toEqual({
      question: "Which planet is largest?",
      choices: [{ key: "A", text: "Mars" }, { key: "B", text: "Jupiter" }, { key: "C", text: "Venus" }],
    });
    expect(classifyContent("Plan A. is to wait, nothing else here")).toBe("GENERAL_TEXT");
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

describe("toImageRect", () => {
  it("scales a drag on the shown image to natural pixels", () => {
    expect(toImageRect({ x: 10, y: 20, width: 50, height: 40 }, { width: 400, height: 300 }, { width: 1600, height: 1200 })).toEqual({ x: 40, y: 80, width: 200, height: 160 });
  });
  it("clamps to the image and rejects tiny selections", () => {
    expect(toImageRect({ x: 390, y: 290, width: 50, height: 50 }, { width: 400, height: 300 }, { width: 400, height: 300 })).toEqual(null);
    expect(toImageRect({ x: 300, y: 200, width: 500, height: 500 }, { width: 400, height: 300 }, { width: 400, height: 300 })).toEqual({ x: 300, y: 200, width: 100, height: 100 });
    expect(toImageRect({ x: 0, y: 0, width: 3, height: 3 }, { width: 400, height: 300 }, { width: 400, height: 300 })).toBeNull();
  });
});

describe("streamed analysis", () => {
  afterEach(() => vi.unstubAllGlobals());
  const request: AnalysisRequest = { text: "t", contentType: "GENERAL_TEXT", learningMode: "explain", model: "m", temperature: 0.2 };
  it("joins streamed chunks and reports progress", async () => {
    const lines = [{ response: '{"summary":"Hel' }, { response: 'lo"}' }, { response: "", done: true }].map((line) => JSON.stringify(line)).join("\n");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(lines, { status: 200 })));
    const progress = vi.fn();
    await expect(new OllamaProvider("http://localhost:11434").analyze(request, progress)).resolves.toMatchObject({ summary: "Hello" });
    expect(progress).toHaveBeenCalled();
  });
  it("asks for step-by-step depth when a previous answer is supplied", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ response: '{"summary":"x"}' }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await new OllamaProvider("http://localhost:11434").analyze({ ...request, previousSummary: "Short answer" });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).prompt).toContain("Short answer");
  });
});

describe("historyToMarkdown", () => {
  it("includes the source text, answer and explanation", () => {
    const markdown = historyToMarkdown([{ id: "1", timestamp: "2026-10-31T00:00:00Z", ocrText: "Q?\nA. x", contentType: "MULTIPLE_CHOICE", processingTime: 1, analysis: { type: "MULTIPLE_CHOICE", title: "Best answer", summary: "Because.", answer: "A", answerText: "x", processingTime: 1 } }]);
    expect(markdown).toContain("**Answer:** A — x");
    expect(markdown).toContain("> Q?\n> A. x");
  });
});

describe("Web research", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("searches with the question only, not the answer options", () => {
    expect(buildSearchQuery("Which planet is largest?\nA. Mars\nB. Jupiter")).toBe("Which planet is largest?");
    expect(buildSearchQuery("x".repeat(400))).toHaveLength(150);
  });
  it("keeps only https results and sends the key to Tavily only", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [{ title: "A", url: "https://a.example", content: "s  1" }, { title: "B", url: "http://b.example", content: "" }, { nope: 1 }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(webSearch("q", "KEY")).resolves.toEqual([{ title: "A", link: "https://a.example", snippet: "s 1" }]);
    expect(String(fetchMock.mock.calls[0][0])).toBe("https://api.tavily.com/search");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer KEY");
    expect(String(fetchMock.mock.calls[0][1].body)).not.toContain("KEY");
  });
  it("explains a refused search without leaking details", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("quota key=KEY", { status: 401 })));
    await expect(webSearch("q", "KEY")).rejects.toMatchObject({ code: "request_failed", message: expect.not.stringContaining("KEY") });
  });
  it("puts search results in the prompt as untrusted reference data", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ response: '{"summary":"x"}' }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await new OllamaProvider("http://localhost:11434").analyze({ text: "t", contentType: "GENERAL_TEXT", learningMode: "explain", model: "m", temperature: 0.2, sources: [{ title: "Doc", link: "https://d.example", snippet: "fact" }] });
    const { prompt } = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(prompt).toContain("<SEARCH_RESULTS>");
    expect(prompt).toContain("[1] Doc: fact");
    expect(prompt).toContain("untrusted");
  });
  it("saves a selection as fractions of the frame", () => {
    expect(toFraction({ x: 100, y: 50, width: 200, height: 100 }, { width: 1000, height: 500 })).toEqual({ x: 0.1, y: 0.1, width: 0.2, height: 0.2 });
  });
});
