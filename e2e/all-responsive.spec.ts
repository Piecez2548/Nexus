import { test, expect } from "@playwright/test";

test("All static design reflows without overlap or video downloads", async ({ page }, info) => {
  const videos: string[] = [];
  page.on("request", request => { if (request.url().includes(".mp4")) videos.push(request.url()); });
  for (const width of [320, 390, 768, 1280, 1920, 2560]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/projects");
    const scene = page.locator(".hero-image");
    await expect(scene).toBeVisible();
    await expect.poll(() => scene.locator("img").evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    const sceneBox = (await scene.boundingBox())!;
    const contentBox = (await page.locator(".hero-content").boundingBox())!;
    expect(contentBox.x + contentBox.width <= sceneBox.x + 1 || contentBox.y + contentBox.height <= sceneBox.y + 1).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByRole("link", { name: "เข้าสู่ Nexus Main", exact: true })).toHaveAttribute("href", "/dashboard");
    await expect(page.locator("video")).toHaveCount(0);
    if (width === 390 || width === 1920) await page.screenshot({ path: info.outputPath(`all-${width}.png`), fullPage: true });
  }
  expect(videos).toHaveLength(0);
});
