import { describe, expect, it } from "vitest";
import { matchRoutes } from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import { appRoutes } from "./router/router";

const routes = appRoutes as RouteObject[];

describe("application entry route", () => {
  it.each(["/", "/index.html", "/projects", "/projects/index.html"])("opens Nexus All at %s", (pathname) => {
    expect(matchRoutes(routes, pathname)?.some((match) => match.route.id?.startsWith("nexus-all-") === true)).toBe(true);
  });

  it("opens ScreenTutor only at its explicit route", () => {
    expect(matchRoutes(routes, "/screentutor")?.some((match) => match.route.id === "screentutor")).toBe(true);
    expect(matchRoutes(routes, "/")?.some((match) => match.route.id === "screentutor")).toBe(false);
  });

  it.each(["/algoviz", "/algoviz/nope", "/algoviz/search/extra"])("sends %s to the AlgoViz site, never behind Main's sign-in", (pathname) => {
    const matches = matchRoutes(routes, pathname) ?? [];
    expect(matches.some((match) => match.route.id === "algoviz-redirect")).toBe(true);
    // Main's account gate is a pathless layout route; none of the matches may sit under it.
    expect(matches.some((match) => match.route.path === "dashboard" || match.route.id === "nexus-all-root")).toBe(false);
    expect(matches.length).toBe(1);
  });

  it("retains Main and unknown-route behavior", () => {
    expect(matchRoutes(routes, "/dashboard")?.some((match) => match.route.path === "dashboard")).toBe(true);
    expect(matchRoutes(routes, "/missing")?.some((match) => match.route.path === "*")).toBe(true);
  });
});
