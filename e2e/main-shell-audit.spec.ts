import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const axeSource = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
async function audit(page: Page) {
  await page.addScriptTag({ content: axeSource });
  const result = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: typeof import("axe-core") }).axe;
    const result = await axe.run({ include: ["[data-shell-audit]", "[role=dialog]", ".main-popover"] }, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] } });
    return { violations: result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), incomplete: result.incomplete.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })) };
  });
  if (result.incomplete.length) {
    // Axe cannot resolve some wrapped/clipped text. Check its computed color
    // pairs separately; this does not replace visual review of occlusion.
    const pairs = await page.evaluate(items => {
      const ctx = document.createElement("canvas").getContext("2d")!;
      const luminance = (rgb: Uint8ClampedArray) => {
        const values = Array.from(rgb).slice(0, 3).map(c => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
        return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
      };
      return items.flatMap(item => item.id !== "color-contrast" ? [] : item.targets.flatMap(target => {
        const el = document.querySelector(target.join(" "));
        if (!el) return [];
        const chain: Element[] = [];
        for (let ancestor: Element | null = el; ancestor; ancestor = ancestor.parentElement) chain.unshift(ancestor);
        ctx.fillStyle = "white"; ctx.fillRect(0, 0, 1, 1);
        for (const ancestor of chain) { ctx.fillStyle = getComputedStyle(ancestor).backgroundColor; ctx.fillRect(0, 0, 1, 1); }
        const background = luminance(ctx.getImageData(0, 0, 1, 1).data);
        ctx.fillStyle = getComputedStyle(el).color; ctx.fillRect(0, 0, 1, 1);
        const foreground = luminance(ctx.getImageData(0, 0, 1, 1).data);
        return [{ target, ratio: (Math.max(background, foreground) + 0.05) / (Math.min(background, foreground) + 0.05) }];
      }));
    }, result.incomplete);
    console.info("Supplementary computed contrast pairs:", JSON.stringify(pairs));
    expect(pairs.every(pair => pair.ratio >= 4.5)).toBe(true);
  }
  return result;
}
async function bounds(page: Page) {
  return page.locator("[data-shell-audit] input:visible, [data-shell-audit] button:visible, [data-shell-audit] a:visible, .main-popover:visible, [role=dialog]:visible").evaluateAll(els => els.flatMap(el => {
    const r = el.getBoundingClientRect();
    return r.left < -1 || r.right > innerWidth + 1 ? [{ text: el.textContent, left: r.left, right: r.right }] : [];
  }));
}

for (const theme of ["light", "dark", "mono"]) {
  for (const width of [320, 768, 1280]) {
    test(`${theme} shell ${width}px including expanded menus`, async ({ page }, info) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.addInitScript(mode => localStorage.setItem("nexus-app-settings", JSON.stringify({ state: { themeMode: mode }, version: 0 })), theme);
      await page.goto("/trading");
      await expect(page.locator("[data-shell-audit=workspace]")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(await bounds(page)).toEqual([]);
      const base = await audit(page);
      await info.attach("axe-base", { body: JSON.stringify(base, null, 2), contentType: "application/json" });
      expect(base.violations).toEqual([]);
      for (const label of ["Level and streak", "Notifications", "User menu"]) {
        const trigger = page.getByRole("button", { name: label, exact: true });
        await trigger.click();
        await expect(trigger).toHaveAttribute("aria-expanded", "true");
        await expect(page.locator(".main-popover").last()).toHaveCSS("opacity", "1");
        expect(await bounds(page)).toEqual([]);
        const result = await audit(page);
        await info.attach(`axe-${label}`, { body: JSON.stringify(result, null, 2), contentType: "application/json" });
        expect(result.violations).toEqual([]);
        await page.keyboard.press("Escape");
        await expect(trigger).toHaveAttribute("aria-expanded", "false");
        await expect(trigger).toBeFocused();
        await expect(page.locator(".main-popover")).toHaveCount(0);
      }
      const sizes = await page.locator("[data-shell-audit] button:visible, [data-shell-audit] a:visible").evaluateAll(els => els.flatMap(el => { const r = el.getBoundingClientRect(); return r.width < 44 || r.height < 44 ? [{ text: el.textContent, width: r.width, height: r.height }] : []; }));
      expect(sizes).toEqual([]);
      await page.screenshot({ path: info.outputPath("shell.png"), animations: "disabled" });
    });
  }
}

test("Thai, 200% text, keyboard navigation and command modal", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addInitScript(() => localStorage.setItem("nexus-language", JSON.stringify({ state: { language: "th" }, version: 0 })));
  await page.goto("/trading");
  await expect(page.locator("[data-shell-audit=workspace]")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "th");
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  expect(await bounds(page)).toEqual([]);
  await page.keyboard.press("Tab");
  await expect(page.locator(".main-skip-link")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("input")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button").last()).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.locator("input")).toBeFocused();
  expect(await bounds(page)).toEqual([]);
  expect((await audit(page)).violations).toEqual([]);
  await page.screenshot({ path: info.outputPath("thai-200.png"), animations: "disabled" });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.locator("main")).toBeFocused();
});

test("populated notifications and search remain accessible across themes", async ({ page }, info) => {
  await page.goto("/budget");
  await page.getByRole("button", { name: "Add Budget" }).click();
  await page.getByLabel("Category").selectOption({ label: "Food" });
  await page.getByLabel("Amount").fill("100");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/transactions");
  await page.getByRole("button", { name: "Add Transaction" }).click();
  await page.getByLabel("Item name").fill("Audit lunch");
  await page.getByLabel("Amount").fill("200");
  await page.getByLabel("Category").selectOption({ label: "Food" });
  await page.getByLabel("Account", { exact: true }).selectOption({ label: "Cash" });
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("table").getByText("Audit lunch")).toBeVisible();
  for (const theme of ["light", "dark", "mono"]) {
    await page.evaluate(mode => localStorage.setItem("nexus-app-settings", JSON.stringify({ state: { themeMode: mode }, version: 0 })), theme);
    await page.goto("/trading");
    await page.getByRole("button", { name: "Notifications", exact: true }).click();
    await expect(page.locator(".main-popover")).toHaveCSS("opacity", "1");
    await expect(page.getByText(/budget is over the limit/)).toBeVisible();
    expect((await audit(page)).violations).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(page.locator(".main-popover")).toHaveCount(0);
    const search = page.getByRole("textbox", { name: "Search anything...", exact: true });
    await search.fill("Audit lunch");
    const result = page.getByRole("button", { name: /Audit lunch/ });
    await expect(result).toBeVisible();
    await expect(page.getByRole("region", { name: "Search results", exact: true }).locator("..")).toHaveCSS("opacity", "1");
    await result.hover();
    // Wait for the native color transition before measuring the hovered state.
    await page.evaluate(async () => { await Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {}))); });
    expect((await audit(page)).violations).toEqual([]);
    await search.press("Tab");
    await expect(result).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(search).toBeFocused();
    await expect(result).toHaveCount(0);
    await search.clear();
    await search.fill("Audit lunch");
    await result.click();
    await expect(page).toHaveURL(/transactions/);
    await expect(page).toHaveTitle("Transactions — Nexus");
    await expect(page.locator("main")).toBeFocused();
  }
  await page.getByRole("button", { name: "Notifications", exact: true }).click();
  await page.getByRole("button", { name: /^Dismiss:/ }).click();
  await expect(page.locator(".main-warning")).toHaveCount(0);
  await info.attach("fixture", { body: "Synthetic local-only Food budget 100, Audit lunch expense 200. No live account data.", contentType: "text/plain" });
});

test("responsive reflow, more menu, forced colors and lazy resources", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const metrics = { cls: 0, longestTask: 0 };
    Object.assign(window, { shellMetrics: metrics });
    new PerformanceObserver(list => list.getEntries().forEach(entry => {
      const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
      if (!shift.hadRecentInput) metrics.cls += shift.value;
    })).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver(list => list.getEntries().forEach(entry => { metrics.longestTask = Math.max(metrics.longestTask, entry.duration); })).observe({ type: "longtask", buffered: true });
  });
  await page.goto("/trading");
  await expect(page.locator("[data-shell-audit=workspace]")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const resources = await page.evaluate(() => performance.getEntriesByType("resource").map(entry => {
    const r = entry as PerformanceResourceTiming;
    return { path: new URL(r.name).pathname, bytes: r.decodedBodySize, type: r.initiatorType };
  }));
  expect(resources.some(r => /(?:TradeDrawer|TransactionDrawer|jspdf|html2canvas|Workouts)-/.test(r.path))).toBe(false);
  const metrics = await page.evaluate(() => (window as unknown as { shellMetrics: { cls: number; longestTask: number } }).shellMetrics);
  console.info("Local shell metrics:", JSON.stringify({ ...metrics, decodedScriptInitiatedBytes: resources.filter(r => r.type === "script").reduce((sum, r) => sum + r.bytes, 0), decodedJavascriptBytes: resources.filter(r => r.path.endsWith(".js")).reduce((sum, r) => sum + r.bytes, 0) }));
  expect(metrics.cls).toBeLessThanOrEqual(0.1);
  await info.attach("initial-resources", { body: JSON.stringify(resources, null, 2), contentType: "application/json" });
  for (const width of [320, 390, 768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    expect(await bounds(page), `${width}px at 200%`).toEqual([]);
    await page.screenshot({ path: info.outputPath(`text-200-${width}.png`), animations: "disabled" });
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = "100%"; });
  await page.setViewportSize({ width: 390, height: 900 });
  const more = page.locator("[data-shell-audit=mobile-navigation]").getByRole("button", { name: "More", exact: true });
  await more.click();
  await expect(page.getByRole("dialog")).toHaveCSS("opacity", "1");
  expect((await audit(page)).violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(more).toBeFocused();
  await page.emulateMedia({ forcedColors: "active" });
  await page.keyboard.press("Tab");
  const focus = await page.locator(":focus").evaluate(el => ({ style: getComputedStyle(el).outlineStyle, width: getComputedStyle(el).outlineWidth }));
  expect(focus.style).not.toBe("none");
  expect(parseFloat(focus.width)).toBeGreaterThanOrEqual(2);
  await page.screenshot({ path: info.outputPath("forced-colors.png"), animations: "disabled" });
  expect(errors).toEqual([]);
});

