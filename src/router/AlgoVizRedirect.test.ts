import { describe, expect, it } from "vitest";
import { algoVizTarget } from "./AlgoVizRedirect";

describe("algoVizTarget", () => {
  it.each([
    ["/algoviz", "", "https://algoviz-brown-kappa.vercel.app/"],
    ["/algoviz/", "", "https://algoviz-brown-kappa.vercel.app/"],
    ["/algoviz/sorting", "?algorithm=quick&values=3,2,1", "https://algoviz-brown-kappa.vercel.app/sorting?algorithm=quick&values=3,2,1"],
    ["/algoviz/search/extra", "", "https://algoviz-brown-kappa.vercel.app/search/extra"],
  ])("maps %s%s", (pathname, search, expected) => { expect(algoVizTarget(pathname, search)).toBe(expected); });
});
