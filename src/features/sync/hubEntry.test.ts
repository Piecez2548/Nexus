import { expect, test } from "vitest";
import { isHubPath, mainReturnPath } from "./hubEntry";

test("only local non-hub routes are accepted as post-login destinations", () => {
  expect(mainReturnPath("/trading/journal?view=open#recent")).toBe("/trading/journal?view=open#recent");
  for (const value of [null, "https://attacker.example", "//attacker.example", "/\\attacker.example", "/projects", "/projects/", "/projects/index.html", "/dashboard/../projects"]) {
    expect(mainReturnPath(value)).toBeNull();
  }
  expect(isHubPath("/projects-private")).toBe(false);
});
