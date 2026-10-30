import { expect, test } from "@playwright/test";

test.describe("AlgoViz", () => {
  test("search steps only mark the nodes visited so far", async ({ page }) => {
    await page.goto("/algoviz/search");
    await expect(page.getByRole("heading", { name: "Search algorithms" })).toBeVisible();
    const visited = page.locator(".algoviz-node.is-visited");
    await expect(visited).toHaveCount(0);

    const next = page.getByRole("button", { name: "Next step" });
    await next.click(); // dequeue A
    await expect(visited).toHaveCount(1);
    await next.click(); // discover B
    await next.click(); // discover C
    await next.click(); // dequeue B
    await expect(visited).toHaveCount(2);

    // Stepping back must restore the earlier picture, not keep the later one.
    await page.getByRole("button", { name: "Previous step" }).click();
    await page.getByRole("button", { name: "Previous step" }).click();
    await page.getByRole("button", { name: "Previous step" }).click();
    await expect(visited).toHaveCount(1);
  });

  test("selection sort grows its sorted region instead of starting sorted", async ({ page }) => {
    await page.goto("/algoviz/sorting?algorithm=selection");
    await expect(page.getByRole("combobox", { name: "Choose algorithm" })).toHaveValue("selection");
    await expect(page.locator(".algoviz-sort-bar.is-sorted")).toHaveCount(0);
    await expect(page.getByText("No pending items")).toHaveCount(0);
    await expect(page.locator(".algoviz-data-row").getByText("42, 18, 64, 9, 31, 56, 23")).toBeVisible();
  });

  test("the URL follows the algorithm dropdown and survives a reload", async ({ page }) => {
    await page.goto("/algoviz/sorting");
    await page.getByRole("combobox", { name: "Choose algorithm" }).selectOption("quick");
    await expect(page).toHaveURL(/\/algoviz\/sorting\?algorithm=quick$/);
    await page.reload();
    await expect(page.getByRole("combobox", { name: "Choose algorithm" })).toHaveValue("quick");
  });

  test("an unknown AlgoViz page stays in AlgoViz instead of opening Main's sign-in", async ({ page }) => {
    await page.goto("/algoviz/nope");
    await expect(page).toHaveURL(/\/algoviz\/nope$/);
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await page.getByRole("link", { name: /Back to Learn/ }).click();
    await expect(page).toHaveURL(/\/algoviz$/);
    await expect(page.getByRole("heading", { name: "See algorithms think." })).toBeVisible();
  });

  test("comparison verdict comes from the recorded runs", async ({ page }) => {
    await page.goto("/algoviz/compare");
    await expect(page.getByText("Both reach the same optimum")).toBeVisible();
    await expect(page.getByText("A → B → D → F").first()).toBeVisible();
  });
});
