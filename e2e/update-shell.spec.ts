import { test, expect } from "@playwright/test";
test("navigation refreshes an old shell while retaining offline access and local data", async ({ page, context }) => {
  await page.goto("/projects");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await page.evaluate(async () => {
    localStorage.setItem("nexus-update-test-sentinel", "keep");
    for (const name of await caches.keys()) {
      if (!name.includes("precache") && name !== "nexus-navigation-v1") continue;
      const cache = await caches.open(name);
      for (const request of await cache.keys()) {
        if (new URL(request.url).pathname === "/index.html" || new URL(request.url).pathname === "/projects") {
          await cache.put(request, new Response("<html><body><h1>Outdated shell</h1></body></html>", { headers: { "Content-Type": "text/html" } }));
        }
      }
    }
  });
  await page.reload();
  await expect(page.locator("#hero-title")).toContainText("ทุกพื้นที่ทำงาน");
  expect(await page.evaluate(() => localStorage.getItem("nexus-update-test-sentinel"))).toBe("keep");
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("#hero-title")).toContainText("ทุกพื้นที่ทำงาน");
  await context.setOffline(false);
});
