import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
for (const mode of ["light", "dark", "mono"]) {
  test(`workspace accessibility ${mode}`, async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 900 });
    await page.addInitScript(themeMode => localStorage.setItem("nexus-app-settings", JSON.stringify({ state: { themeMode }, version: 0 })), mode);
    const findings = [];
    for (const route of ["/dashboard", "/finance", "/transactions", "/favorites", "/accounts", "/net-worth", "/subscriptions", "/categories", "/merchants", "/budget", "/goals", "/recipients", "/reports", "/executive", "/ai-analytics", "/trading", "/trading/journal", "/trading/portfolio", "/trading/strategies", "/trading/watchlist", "/trading/economic-calendar", "/todo", "/habits", "/schedule", "/vault", "/workouts", "/settings", "/projects"]) {
      await page.goto(route);
      await expect(page.locator("main h1")).toBeVisible();
      await page.addScriptTag({ content: axe });
      const violations = await page.evaluate(async () => {
        const engine = (window as unknown as { axe: { run: (options: object) => Promise<{ violations: { id: string; nodes: { target: string[]; failureSummary: string }[] }[] }> } }).axe;
        return (await engine.run({ runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, detail: n.failureSummary })) }));
      });
      if (violations.length) findings.push({ route, violations });
    }
    await testInfo.attach("accessibility-findings", { body: JSON.stringify(findings, null, 2), contentType: "application/json" });
    expect(findings).toEqual([]);
  });
}
