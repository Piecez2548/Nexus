import { describe, expect, it } from "vitest";
import { classifyContent, cleanOcrText, parseMultipleChoice } from "./services";

describe("ScreenTutor text pipeline", () => {
  it("cleans OCR whitespace and control characters", () => {
    expect(cleanOcrText("  Hello   world \u0000\n\n\n Thai  ")).toBe("Hello world\n\nThai");
  });

  it("classifies multiple choice and programming errors", () => {
    expect(classifyContent("Choose one\nA. First\nB. Second\nC. Third")).toBe("MULTIPLE_CHOICE");
    expect(classifyContent("TypeError: cannot read property")).toBe("PROGRAMMING_ERROR");
  });

  it("parses choices into a structured question", () => {
    expect(parseMultipleChoice("Which is best?\nA. One\nB) Two\nC. Three")).toEqual({
      question: "Which is best?",
      choices: [{ key: "A", text: "One" }, { key: "B", text: "Two" }, { key: "C", text: "Three" }],
    });
  });
});
