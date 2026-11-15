import { afterEach, describe, expect, it, vi } from "vitest";
import { isValidElement } from "react";
import type { ReactElement } from "react";
import type { RouteObject } from "react-router-dom";

import { resolveAppTarget } from "./appTarget";

describe("resolveAppTarget", () => {
  it.each([
    ["finance", "finance"],
    [undefined, "hub"],
    ["", "hub"],
    ["hub", "hub"],
    ["FINANCE", "hub"],
  ])("%s → %s", (value, expected) => {
    expect(resolveAppTarget(value)).toBe(expected);
  });
});

describe("root route per target", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function rootElement(target: string | undefined): Promise<ReactElement> {
    vi.resetModules();
    if (target !== undefined) vi.stubEnv("VITE_APP_TARGET", target);
    const { appRoutes } = await import("@/router/router");
    const gate = (appRoutes as RouteObject[]).find((route) => route.children?.some((child) => child.id === "nexus-all-root"));
    const root = gate?.children?.find((child) => child.id === "nexus-all-root");
    if (!root || !isValidElement(root.element)) throw new Error("root route not found");
    return root.element as ReactElement;
  }

  it("opens the finance Dashboard in Nexus Finance", async () => {
    const element = await rootElement("finance");
    expect((element.props as { to?: string }).to).toBe("/dashboard");
  });

  it("opens the Project Hub in the Nexus hub", async () => {
    const element = await rootElement(undefined);
    expect((element.props as { to?: string }).to).toBeUndefined();
  });
});
