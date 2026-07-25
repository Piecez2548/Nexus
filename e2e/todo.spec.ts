import { test, expect } from "@playwright/test";

test.describe("todo lifecycle", () => {
  test("add, complete, edit, and delete a todo end to end", async ({ page }) => {
    await page.goto("/todo");

    await page.getByRole("button", { name: "Add Todo" }).click();
    await page.getByLabel("ชื่องาน").fill("ส่งรายงาน");
    await page.getByLabel("ความสำคัญ").selectOption({ label: "High" });
    await page.getByRole("button", { name: "บันทึก" }).click();

    await expect(page.getByText("ส่งรายงาน")).toBeVisible();
    await expect(page.getByText("1 tasks remaining")).toBeVisible();

    await page.getByRole("button", { name: "Edit ส่งรายงาน" }).click();
    const titleInput = page.getByLabel("ชื่องาน");
    await titleInput.fill("ส่งรายงานประจำเดือน");
    await page.getByRole("button", { name: "บันทึก" }).click();
    await expect(page.getByText("ส่งรายงานประจำเดือน")).toBeVisible();

    await page.getByRole("button", { name: "Mark ส่งรายงานประจำเดือน as done" }).click();
    await expect(page.getByText("0 tasks remaining")).toBeVisible();

    await page.getByRole("button", { name: "Delete ส่งรายงานประจำเดือน" }).click();
    await expect(page.getByText("No tasks to do yet")).toBeVisible();
  });

  test("shows a validation error instead of saving an empty todo", async ({ page }) => {
    await page.goto("/todo");

    await page.getByRole("button", { name: "Add Todo" }).click();
    await page.getByRole("button", { name: "บันทึก" }).click();

    await expect(page.getByText("กรุณากรอกชื่องาน")).toBeVisible();
  });

  test("a pending todo shows in the Dashboard preview and can be completed from there", async ({ page }) => {
    await page.goto("/todo");
    await page.getByRole("button", { name: "Add Todo" }).click();
    await page.getByLabel("ชื่องาน").fill("ซื้อของเข้าบ้าน");
    await page.getByRole("button", { name: "บันทึก" }).click();
    await expect(page.getByText("ซื้อของเข้าบ้าน")).toBeVisible();

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Todo" })).toBeVisible();
    await expect(page.getByText("ซื้อของเข้าบ้าน")).toBeVisible();

    await page.getByRole("button", { name: "Mark ซื้อของเข้าบ้าน as done" }).click();
    await expect(page.getByText("Nothing to do right now")).toBeVisible();
  });

  test("completing a daily recurring todo creates the next occurrence", async ({ page }) => {
    await page.goto("/todo");
    await page.getByRole("button", { name: "Add Todo" }).click();
    await page.getByLabel("ชื่องาน").fill("รดน้ำต้นไม้");
    await page.getByLabel("กำหนดส่ง (ถ้ามี)").fill("2026-07-22");
    await page.getByLabel("ทำซ้ำ").selectOption({ label: "Every day" });
    await page.getByRole("button", { name: "บันทึก" }).click();
    await expect(page.getByText("รดน้ำต้นไม้")).toBeVisible();

    await page.getByRole("button", { name: "Mark รดน้ำต้นไม้ as done" }).click();

    // The completed original stays, plus a fresh not-done occurrence due the next day.
    await expect(page.getByText("1 tasks remaining")).toBeVisible();
    await expect(page.getByText("Due 7/23/2026")).toBeVisible();
  });

  test("toolbar filters todos by search, status, and priority", async ({ page }) => {
    await page.goto("/todo");

    await page.getByRole("button", { name: "Add Todo" }).click();
    await page.getByLabel("ชื่องาน").fill("งานด่วน");
    await page.getByLabel("ความสำคัญ").selectOption({ label: "High" });
    await page.getByRole("button", { name: "บันทึก" }).click();
    await expect(page.getByText("งานด่วน")).toBeVisible();

    await page.getByRole("button", { name: "Add Todo" }).click();
    await page.getByLabel("ชื่องาน").fill("งานทั่วไป");
    await page.getByLabel("ความสำคัญ").selectOption({ label: "Low" });
    await page.getByRole("button", { name: "บันทึก" }).click();
    await expect(page.getByText("งานทั่วไป")).toBeVisible();

    await page.getByPlaceholder("Search todos...").fill("ด่วน");
    await expect(page.getByText("งานด่วน")).toBeVisible();
    await expect(page.getByText("งานทั่วไป")).not.toBeVisible();

    await page.getByPlaceholder("Search todos...").fill("");
    await page.getByLabel("Priority").selectOption({ label: "High" });
    await expect(page.getByText("งานด่วน")).toBeVisible();
    await expect(page.getByText("งานทั่วไป")).not.toBeVisible();
  });

  test("completing an action increases the level badge's XP and streak", async ({ page }) => {
    await page.goto("/todo");
    await page.getByRole("button", { name: "Add Todo" }).click();
    await page.getByLabel("ชื่องาน").fill("งานทดสอบ");
    await page.getByLabel("ความสำคัญ").selectOption({ label: "High" });
    await page.getByRole("button", { name: "บันทึก" }).click();
    await expect(page.getByText("งานทดสอบ")).toBeVisible();

    await page.getByRole("button", { name: "Mark งานทดสอบ as done" }).click();

    await page.getByRole("button", { name: "Level and streak" }).click();
    await expect(page.getByText("20 / 100 XP")).toBeVisible();
    await expect(page.getByText("ต่อเนื่อง 1 วัน")).toBeVisible();
  });
});
