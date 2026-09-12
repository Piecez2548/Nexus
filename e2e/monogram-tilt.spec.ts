import { test, expect } from "@playwright/test";

test("N tilts on pointer input and settles without continuous animation", async ({ page }, info) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/projects");
  const scene = page.locator(".hero-image");
  const image = scene.locator("img");
  const box = (await scene.boundingBox())!;
  await page.mouse.move(box.x + box.width * .85, box.y + box.height * .3);
  await expect.poll(() => image.evaluate(el => el.style.transform)).toContain("rotateY");
  await expect(image).not.toHaveCSS("transform", "none");
  await page.screenshot({ path: info.outputPath("monogram-tilt.png") });
  await page.mouse.move(0, 0);
  await expect(image).toHaveCSS("transform", "none");
  expect(await scene.evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
  await page.mouse.move(box.x + box.width * .8, box.y + box.height * .3);
  await expect.poll(() => image.evaluate(el => el.style.transform)).toContain("rotateY");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(image).toHaveCSS("transform", "none");
  await page.mouse.move(box.x + box.width * .2, box.y + box.height * .7);
  await expect(image).toHaveCSS("transform", "none");
});

test("touch input preserves the static artwork and scrolling", async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 }, storageState: "./e2e/storageState.json" });
  const page = await context.newPage();
  await page.goto("http://localhost:4173/projects");
  await page.locator(".hero-image").dispatchEvent("pointermove", { pointerType: "touch", clientX: 100, clientY: 200 });
  await expect(page.locator(".hero-image img")).toHaveCSS("transform", "none");
  await expect(page.locator("video, canvas")).toHaveCount(0);
  await context.close();
});
