import { test, expect } from "@playwright/test";

for (const mode of ["dark", "light", "mono"]) {
  test(`static All works with keyboard and missing artwork in ${mode}`, async ({ page }) => {
    await page.addInitScript(themeMode => localStorage.setItem("nexus-app-settings", JSON.stringify({ state: { themeMode }, version: 0 })), mode);
    await page.route("**/nexus-monogram.webp", route => route.abort());
    await page.goto("/projects");
    await expect(page.locator("#hero-title")).toHaveText("ทุกพื้นที่ทำงานเริ่มต้นที่เดียว");
    await expect(page.locator("video, #motion-toggle")).toHaveCount(0);
    await page.keyboard.press("Tab");
    await expect(page.locator(".skip-link")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#projects")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "เข้าสู่ Nexus Main", exact: true })).toBeFocused();
    await expect(page.getByRole("link", { name: "เข้าสู่ Nexus Tools", exact: true })).toHaveAttribute("href", "https://nexus-tools-chi.vercel.app/");
  });
}
