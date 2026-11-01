import { test, expect } from "@playwright/test";

async function runningAnimations(page: import("@playwright/test").Page) {
  return page.locator(".project-hub").evaluate(root =>
    root.getAnimations({ subtree: true }).filter(animation => animation.playState === "running")
      .map(animation => (animation.effect as KeyframeEffect).target?.closest(".hero-orbit") ? "orbit" : "other"));
}

test("All stops every animation when reduced motion is requested", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/projects");
  await expect(page.locator(".hero-orbit")).toBeVisible();
  await expect(page.locator("video, canvas, #motion-toggle")).toHaveCount(0);
  expect(await runningAnimations(page)).toEqual([]);
});

test("All animates only the hero orbit otherwise", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/projects");
  await expect(page.locator(".hero-orbit")).toBeVisible();
  await expect(page.locator("video, canvas, #motion-toggle")).toHaveCount(0);
  const running = await runningAnimations(page);
  expect(running.length).toBeGreaterThan(0);
  expect(running.filter(kind => kind !== "orbit")).toEqual([]);
});
