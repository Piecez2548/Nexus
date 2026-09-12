import { test, expect } from "@playwright/test";
import { writeFileSync } from "node:fs";

test("keyboard form errors are described and focus returns after populated save", async ({ page }, info) => {
  await page.goto("/accounts");
  const open = page.getByRole("button", { name: "Add Account", exact: true });
  await open.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const save = dialog.getByRole("button", { name: "Save", exact: true });
  await save.focus();
  await page.keyboard.press("Enter");
  const name = page.locator("#account-name");
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await expect(name).toHaveAttribute("aria-describedby", "account-name-error");
  await expect(page.locator("#account-name-error")).toHaveAttribute("role", "alert");
  await info.attach("validation-accessibility-tree", { body: await dialog.ariaSnapshot(), contentType: "text/plain" });
  await save.focus();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Back", exact: true })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(save).toBeFocused();
  await name.fill("Keyboard audit account");
  await save.focus();
  await page.keyboard.press("Enter");
  await expect(dialog).toHaveCount(0);
  await expect(open).toBeFocused();
  await expect(page.locator("main").getByText("Keyboard audit account", { exact: true })).toBeVisible();
  await info.attach("populated-account-tree", { body: await page.locator("main").ariaSnapshot(), contentType: "text/plain" });
});

test("mobile constrained startup measurements", async ({ page }, info) => {
  test.skip(process.env.NEXUS_PERFORMANCE !== "1", "Run separately with NEXUS_PERFORMANCE=1 and --workers=1; parallel suites distort timing.");
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 200_000, uploadThroughput: 93_750 });
  await page.addInitScript(() => {
    const result = { lcp: 0, cls: 0, longTaskMs: 0 };
    Object.assign(window, { nexusMetrics: result });
    new PerformanceObserver(list => { for (const entry of list.getEntries()) result.lcp = entry.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver(list => { for (const entry of list.getEntries()) { const shift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number }; if (!shift.hadRecentInput) result.cls += shift.value; } }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver(list => { for (const entry of list.getEntries()) result.longTaskMs += Math.max(0, entry.duration - 50); }).observe({ type: "longtask", buffered: true });
  });
  const results = [];
  for (const route of ["/projects", "/dashboard"]) {
    await page.goto(route);
    await expect(page.locator("main h1")).toBeVisible({ timeout: 30_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1000);
    results.push({ route, ...await page.evaluate(() => ({ ...(window as unknown as { nexusMetrics: { lcp: number; cls: number; longTaskMs: number } }).nexusMetrics, ready: performance.now() })) });
  }
  writeFileSync(info.outputPath("mobile-performance.json"), JSON.stringify(results, null, 2));
  for (const result of results) { expect(result.lcp, result.route).toBeLessThan(4000); expect(result.cls, result.route).toBeLessThan(0.1); }
});
