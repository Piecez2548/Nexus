import { test, expect } from "@playwright/test";

test("workspace reflow at narrow widths and enlarged text", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  for (const width of [320, 390, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/projects", "/accounts", "/settings", "/trading"]) {
      await page.goto(route);
      await expect(page.locator("main h1")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route} ${width}`).toBe(true);
      if (width === 390) {
        await page.evaluate(() => {
          const elements = [...document.querySelectorAll<HTMLElement>("main *")].map(el => ({ el, size: parseFloat(getComputedStyle(el).fontSize) }));
          for (const { el, size } of elements) el.style.fontSize = `${size * 2}px`;
        });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route} 200% text`).toBe(true);
        await page.screenshot({ path: testInfo.outputPath(`${route.slice(1)}-text-200.png`), fullPage: true });
      }
    }
  }
});

for (const theme of ["light", "dark", "mono"]) {
  for (const width of [390, 1280]) {
    test(`operational actions remain readable: ${theme}, ${width}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(themeMode => localStorage.setItem("nexus-app-settings", JSON.stringify({ state: { themeMode }, version: 0 })), theme);
      for (const route of ["accounts", "budget", "trading", "todo", "settings", "projects"]) {
        await page.goto(`/${route}`);
        await expect(page.locator("main h1")).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        const actions = await page.locator("main .nexus-primary-action").evaluateAll(elements => elements.filter(el => el.getClientRects().length).map(el => {
          const css = getComputedStyle(el);
          const luminance = (color: string) => {
            const channels = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
            return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
          };
          const a = luminance(css.color), b = luminance(css.backgroundColor);
          return { contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), height: el.getBoundingClientRect().height };
        }));
        for (const action of actions) {
          expect(action.contrast, route).toBeGreaterThanOrEqual(4.5);
          expect(action.height, route).toBeGreaterThanOrEqual(48);
        }
        if (route === "accounts") {
          await page.getByRole("button", { name: "Add Account", exact: true }).click();
          await expect(page.getByRole("dialog")).toBeVisible();
          await page.keyboard.press("Escape");
          await expect(page.getByRole("dialog")).toHaveCount(0);
        }
        if (route === "projects") await page.screenshot({ path: testInfo.outputPath(`hub-${theme}-${width}.png`), fullPage: true });
      }
    });
  }
}
