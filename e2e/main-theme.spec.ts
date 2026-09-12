import { test, expect } from "@playwright/test";

test.describe("Nexus All theme alignment", () => {
  for (const theme of ["dark", "light", "mono"] as const) {
    for (const width of [390, 1280]) {
      test(`${theme} at ${width}px`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: 900 });
        await page.addInitScript(mode => {
          localStorage.setItem("nexus-app-settings", JSON.stringify({ state: { themeMode: mode, currency: "THB", dateFormat: "DD/MM/YYYY", numberFormat: "1,234.56" }, version: 0 }));
        }, theme);
        await page.goto("/trading");
        const shell = page.locator(".nexus-main");
        await expect(shell).toBeVisible();
        const add = page.locator("main header").getByRole("button", { name: "Add Trade", exact: true });
        await expect(add).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        expect(await shell.evaluate(el => getComputedStyle(el).fontFamily)).toContain("Manrope");
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        if (theme === "dark") await expect(shell).toHaveCSS("background-color", "rgb(12, 11, 16)");
        if (theme === "light") await expect(shell).toHaveCSS("background-color", "rgb(247, 245, 250)");
        if (width === 1280) {
          const box = await page.getByRole("switch").boundingBox();
          expect(box!.width).toBeGreaterThanOrEqual(44);
          expect(box!.height).toBeGreaterThanOrEqual(44);
        }
        await page.screenshot({ path: testInfo.outputPath(`${theme}-${width}.png`), fullPage: true, animations: "disabled" });
        await add.click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog")).toHaveCount(0);
      });
    }
  }
  test("system preference still resolves to dark and manual toggle switches to light", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await page.addInitScript(() => localStorage.setItem("nexus-app-settings", JSON.stringify({ state: { themeMode: "system" }, version: 0 })));
    await page.goto("/dashboard");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.locator(".nexus-main")).toHaveCSS("background-color", "rgb(12, 11, 16)");
    await page.getByRole("button", { name: "Toggle dark mode", exact: true }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await expect(page.locator(".nexus-main")).toHaveCSS("background-color", "rgb(247, 245, 250)");
  });
});

for (const mode of ["dark", "light", "mono"] as const) {
  test(`all routes inherit the shared palette in ${mode}`, async ({ page }) => {
    await page.addInitScript(themeMode => localStorage.setItem("nexus-app-settings", JSON.stringify({ state: { themeMode }, version: 0 })), mode);
    const expected = mode === "dark" ? "rgb(12, 11, 16)" : mode === "light" ? "rgb(247, 245, 250)" : "rgb(250, 250, 250)";
    for (const route of ["/projects", "/dashboard", "/finance", "/trading", "/todo", "/habits", "/schedule", "/vault", "/workouts", "/settings", "/missing-page"]) {
      await page.goto(route);
      const surface = page.locator(route === "/projects" ? ".project-hub" : ".nexus-main");
      await expect(surface).toBeVisible();
      await expect(surface).toHaveCSS("background-color", expected);
      expect(await surface.evaluate(el => getComputedStyle(el).fontFamily)).toContain("Manrope");
      await expect(page.locator("html")).toHaveCSS("color-scheme", mode === "dark" ? "dark" : "light");
    }
  });
}

for (const width of [390, 1280]) {
  test(`PIN matches All at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      localStorage.setItem("nexus-app-settings", JSON.stringify({state:{themeMode:"dark"},version:0}));
      localStorage.setItem("nexus-app-lock", JSON.stringify({state:{pinHash:"fixture-hash",salt:"fixture-salt",rememberUntil:null,encryptionEnabled:false},version:0}));
      sessionStorage.removeItem("nexus-session-unlocked");
    });
    await page.goto("/dashboard");
    await expect(page.locator("#lock-pin")).toBeVisible();
    await expect(page.locator("#lock-pin")).toHaveCSS("background-color", "rgb(12, 11, 16)");
    await expect(page.locator(".nexus-auth-backdrop")).toHaveCSS("background-color", "rgb(12, 11, 16)");
    await expect(page.locator(".nexus-auth-panel h1")).toHaveCSS("color", "rgb(244, 241, 248)");
    await expect(page.locator('.nexus-auth-panel button[type="submit"]')).toHaveCSS("background-color", "rgb(182, 154, 255)");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`pin-${width}.png`), fullPage: true, animations: "disabled" });
    await page.goto("/projects");
    await expect(page.locator(".project-hub")).toBeVisible();
    await expect(page.locator("#lock-pin")).toHaveCount(0);
    await expect(page.locator(".hero-image")).toBeVisible();
    await expect(page.locator(".hero-image")).toHaveCSS("filter", "none");
    await page.screenshot({ path: testInfo.outputPath(`all-restored-${width}.png`), fullPage: true, animations: "disabled" });
  });
}
