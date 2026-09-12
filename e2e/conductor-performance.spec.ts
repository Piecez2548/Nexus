import { test, expect } from "@playwright/test";

test("All performs no continuous animation or media playback", async ({ page }) => {
  await page.goto("/projects");
  await expect(page.locator(".hero-image img")).toBeVisible();
  await expect(page.locator("video, canvas, #motion-toggle")).toHaveCount(0);
  const animations = await page.locator(".project-hub").evaluate(root => root.getAnimations({ subtree: true }).filter(animation => animation.playState === "running").length);
  expect(animations).toBe(0);
});
