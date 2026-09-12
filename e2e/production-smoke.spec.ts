import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { writeFileSync } from "node:fs";
const origin = process.env.NEXUS_SMOKE_ORIGIN ?? "https://nexus-lemon-eight-32.vercel.app";
const dataLensOrigin = process.env.DATALENS_SMOKE_ORIGIN ?? "https://datalens-kappa-one.vercel.app";

test("production preserves anonymous gates and publishes the shared theme", async ({ page, request }) => {
  await page.goto(`${origin}/dashboard`);
  await expect(page.locator(".login-page")).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/projects");
  await expect(page.locator(".login-back")).toHaveText("Nexus All");
  await expect(page.locator(".login-page")).toHaveCSS("background-color", "rgb(12, 11, 16)");
  await expect(page.locator("#lock-pin")).toHaveCount(0);
  const nexusLanding = await request.get(`${origin}/projects`);
  expect(nexusLanding.headers()["x-frame-options"]).toBe("DENY");
  expect(nexusLanding.headers()["content-security-policy"]).toContain("default-src 'self'");
  expect(nexusLanding.headers()["x-content-type-options"]).toBe("nosniff");
  await page.goto("https://nexus-tools-chi.vercel.app/");
  await expect(page.locator(".tool-card")).toHaveCount(17);
  expect(new URL(page.url()).hostname).toBe("nexus-tools-chi.vercel.app");
  const privateBook = await request.get("https://nexus-tools-chi.vercel.app/api/cloud-book");
  expect(privateBook.status()).toBe(401);

  const dataLensHealth = await request.get(`${dataLensOrigin}/api/health`);
  expect(dataLensHealth.status()).toBe(200);
  expect(await dataLensHealth.json()).toMatchObject({ status: "ok", authentication_required: true });
  expect(dataLensHealth.headers()["cache-control"]).toContain("no-store");
  const dataLensAnalyze = await request.post(`${dataLensOrigin}/api/analyze`);
  expect(dataLensAnalyze.status()).toBe(401);
  const dataLensLanding = await request.get(dataLensOrigin);
  expect(dataLensLanding.status()).toBe(200);
  expect(dataLensLanding.headers()["x-frame-options"]).toBe("DENY");
  expect(dataLensLanding.headers()["content-security-policy"]).toContain("default-src 'self'");
});

async function measureColdLogin(page: Page, info: TestInfo, sample: number) {
  await page.setViewportSize({ width: 390, height: 844 });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750 });
  await page.addInitScript(() => {
    const metrics = { lcp: 0, cls: 0 };
    Object.assign(window, { nexusMetrics: metrics });
    new PerformanceObserver(list => { for (const entry of list.getEntries()) metrics.lcp = entry.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver(list => { for (const entry of list.getEntries()) { const shift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number }; if (!shift.hadRecentInput) metrics.cls += shift.value; } }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto(`${origin}/projects`);
  await expect(page.locator(".login-page h1")).toBeVisible({ timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1000);
  const metrics = await page.evaluate(() => (window as unknown as { nexusMetrics: { lcp: number; cls: number } }).nexusMetrics);
  writeFileSync(info.outputPath(`production-waterfall-${sample}.json`), JSON.stringify(await page.evaluate(() => performance.getEntriesByType("resource").map(entry => { const r = entry as PerformanceResourceTiming; return { name: r.name, start: r.startTime, end: r.responseEnd, bytes: r.transferSize }; })), null, 2));
  writeFileSync(info.outputPath(`production-mobile-${sample}.json`), JSON.stringify(metrics, null, 2));
  expect(metrics.cls).toBeLessThan(0.1);
  expect(metrics.lcp).toBeGreaterThan(0);
  return metrics;
}

test("production mobile cold login median stays below 2.5 seconds", async ({ browser }, info) => {
  // The audit budget is the median of three cold, isolated contexts; retain
  // every sample, including network outliers, rather than retrying failures.
  const samples = [];
  for (let sample = 1; sample <= 3; sample++) {
    const context = await browser.newContext({ serviceWorkers: "block" });
    try {
      samples.push(await measureColdLogin(await context.newPage(), info, sample));
    } finally {
      await context.close();
    }
  }
  const medianLcp = samples.map(sample => sample.lcp).sort((a, b) => a - b)[1];
  writeFileSync(info.outputPath("production-summary.json"), JSON.stringify({ origin, samples, medianLcp, target: 2500 }, null, 2));
  expect(medianLcp).toBeLessThan(2500);
});

