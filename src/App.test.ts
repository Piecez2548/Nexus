import { describe, expect, it } from "vitest";
import { shouldOpenScreenTutor } from "./appEntry";

describe("application entry route", () => {
  it.each(["/", "/index.html"])("opens Nexus All for native %s entry", (pathname) => {
    expect(shouldOpenScreenTutor(pathname, true)).toBe(false);
  });

  it.each(["/", "/index.html"])("preserves Screen Tutor at the web %s entry", (pathname) => {
    expect(shouldOpenScreenTutor(pathname, false)).toBe(true);
  });

  it("uses the workspace for explicit web routes", () => {
    expect(shouldOpenScreenTutor("/projects", false)).toBe(false);
  });
});
