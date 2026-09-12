import { test, expect } from "@playwright/test";

// Only synthetic identities against intercepted test endpoints; no live
// account, password, or Supabase data is read or modified by these checks.
const user = { id: "00000000-0000-4000-8000-000000000001", email: "fixture@example.test", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: { first_name: "Nexus", last_name: "Preview" }, created_at: "2026-01-01T00:00:00Z", factors: [] };
const session = { user, access_token: "test-access-token", refresh_token: "test-refresh-token", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600 };

for (const width of [390, 1280]) {
  test(`account recovery rejects wrong credentials then saves a working PIN at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/projects");
    await page.evaluate(value => {
      localStorage.setItem("sb-nexus-auth-test-auth-token", JSON.stringify(value));
      localStorage.setItem("nexus-app-lock", JSON.stringify({ state: { pinHash: "fixture-hash", salt: "fixture-salt", encryptionEnabled: true, rememberUntil: null }, version: 0 }));
      sessionStorage.removeItem("nexus-session-unlocked");
    }, session);
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Forgot PIN? Recover via your Sync account", exact: true }).click();
    await page.getByLabel("Email", { exact: true }).fill("other@example.test");
    await page.getByLabel("Sync Account Password").fill("wrong-password");
    await page.getByRole("button", { name: "Recover", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Use the account currently signed in");

    await page.route("**/auth/v1/token?**", route => route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ code: "invalid_credentials", msg: "Invalid login credentials" }) }));
    let escrowRequests = 0;
    await page.route("**/rest/v1/user_encryption_keys?**", route => {
      escrowRequests += 1;
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });
    await page.getByLabel("Email", { exact: true }).fill(user.email);
    await page.getByRole("button", { name: "Recover", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Invalid login credentials");
    await expect(page.getByLabel("New PIN", { exact: true })).toHaveCount(0);
    expect(escrowRequests).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`recovery-error-${width}.png`), fullPage: true });

    const record = await page.evaluate(async () => {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const passwordKey = await crypto.subtle.importKey("raw", new TextEncoder().encode("test-password-only"), "PBKDF2", false, ["deriveKey"]);
      const kek = await crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 600000, hash: "SHA-256" }, passwordKey, { name: "AES-GCM", length: 256 }, false, ["wrapKey"]);
      const dek = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
      const wrapped = await crypto.subtle.wrapKey("raw", dek, kek, { name: "AES-GCM", iv });
      const base64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
      return { wrapped_dek: base64(new Uint8Array(wrapped)), dek_iv: base64(iv), escrow_salt: base64(salt), escrow_iterations: 600000 };
    });
    await page.unroute("**/auth/v1/token?**");
    await page.unroute("**/rest/v1/user_encryption_keys?**");
    await page.route("**/rest/v1/user_encryption_keys?**", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([record]) }));
    await page.getByLabel("Sync Account Password").fill("test-password-only");
    await page.getByRole("button", { name: "Recover", exact: true }).click();
    await page.getByLabel("New PIN", { exact: true }).fill("5678");
    await page.getByLabel("Confirm New PIN").fill("5678");
    await page.screenshot({ path: testInfo.outputPath(`recovery-pin-${width}.png`), fullPage: true });
    await page.getByRole("button", { name: "Set New PIN", exact: true }).click();
    await expect(page.locator(".nexus-main")).toBeVisible();
    await page.reload();
    await page.locator("#lock-pin").fill("5678");
    await page.getByRole("button", { name: "Unlock", exact: true }).click();
    await expect(page.locator(".nexus-main")).toBeVisible();
  });
}

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    localStorage.setItem("nexus-language", JSON.stringify({ state: { language: "en" }, version: 0 }));
  });
  await context.route("https://nexus-auth-test.supabase.co/**", async route => {
    const path = new URL(route.request().url()).pathname;
    const data = path === "/auth/v1/user" ? user : path === "/auth/v1/token" ? session : [];
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) });
  });
});

for (const path of ["/projects", "/projects/", "/projects/index.html", "/dashboard", "/trading?from=nexus-all"]) {
  test(`anonymous ${path} requires login and offers registration`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("textbox", { name: "Email", exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Sign Up", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "เข้าสู่ Nexus Main", exact: true })).toHaveCount(0);
    await expect(page.locator(".sidebar")).toHaveCount(0);
  });
}

for (const width of [390, 1280]) {
  test(`existing hub session opens Main without another login at ${width}px`, async ({ context, page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    // Seed once for this origin, then retain the real SDK's persisted session
    // across ordinary full-page anchor navigation and reload.
    await page.goto("/projects");
    await expect(page.getByRole("textbox", { name: "Email", exact: true })).toBeVisible();
    await page.evaluate(value => localStorage.setItem("sb-nexus-auth-test-auth-token", JSON.stringify(value)), session);
    await page.reload();
    const main = page.getByRole("link", { name: "เข้าสู่ Nexus Main", exact: true });
    await expect(main).toBeVisible();
    await expect(page.getByRole("button", { name: "เมนูบัญชี Nexus Preview" })).toBeVisible();
    await expect(page.locator(".hub-account")).toHaveAttribute("aria-expanded", "false");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`hub-${width}.png`), fullPage: true, animations: "disabled" });
    await main.click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("textbox", { name: "Email", exact: true })).toHaveCount(0);
    await expect(page.locator("main")).toBeVisible();
    await page.reload();
    await expect(page.locator("main")).toBeVisible();
    // A separate anonymous browser must not inherit that session.
    const anonymous = await context.browser()!.newContext();
    const freshPage = await anonymous.newPage();
    await freshPage.goto("http://localhost:4175/projects");
    await expect(freshPage.locator('input[type="email"]')).toBeVisible();
    await anonymous.close();
  });
}

test("signing in on the hub returns to the hub and carries the session to Main", async ({ page }) => {
  await page.goto("/projects");
  await page.getByRole("textbox", { name: "Email", exact: true }).fill("fixture@example.test");
  await page.locator('input[type="password"]').fill("test-password-only");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await page.getByRole("link", { name: "เข้าสู่ Nexus Main", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator("main")).toBeVisible();
  await expect(page.locator('input[type="email"]')).toHaveCount(0);
});

for (const themeMode of ["dark", "light", "mono"]) {
  test(`login and All share the saved ${themeMode} palette`, async ({ page }, testInfo) => {
    await page.addInitScript(mode => localStorage.setItem("nexus-app-settings", JSON.stringify({ state: { themeMode: mode }, version: 0 })), themeMode);
    await page.goto("/projects");
    const expected = themeMode === "dark" ? "rgb(12, 11, 16)" : themeMode === "light" ? "rgb(247, 245, 250)" : "rgb(250, 250, 250)";
    await expect(page.locator(".login-page")).toHaveCSS("background-color", expected);
    await page.evaluate(value => localStorage.setItem("sb-nexus-auth-test-auth-token", JSON.stringify(value)), session);
    await page.reload();
    await expect(page.locator(".project-hub")).toHaveCSS("background-color", expected);
    await page.screenshot({ path: testInfo.outputPath(`shared-hub-${themeMode}.png`), fullPage: true, animations: "disabled" });
  });
}

for (const direct of [false, true]) {
  test(`All login and Main PIN stay independent (direct=${direct})`, async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("nexus-app-lock", JSON.stringify({ state: { pinHash: "fixture-hash", salt: "fixture-salt", rememberUntil: null, encryptionEnabled: false }, version: 0 }));
      sessionStorage.removeItem("nexus-session-unlocked");
    });
    await page.goto(direct ? "/trading?view=open" : "/projects");
    await expect(page).toHaveURL(/\/projects/);
    await expect(page.locator("#lock-pin")).toHaveCount(0);
    await page.getByRole("textbox", { name: "Email", exact: true }).fill("fixture@example.test");
    await page.locator('input[type="password"]').fill("test-password-only");
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    if (!direct) {
      await expect(page.locator(".project-hub")).toBeVisible();
      await expect(page.locator("#lock-pin")).toHaveCount(0);
      await page.getByRole("link", { name: "เข้าสู่ Nexus Main", exact: true }).click();
    }
    await expect(page.locator("#lock-pin")).toBeVisible();
    await expect(page.locator(".nexus-main")).toHaveCount(0);
    await expect(page.locator('input[type="email"]')).toHaveCount(0);
    if (direct) await expect(page).toHaveURL(/\/trading\?view=open$/);
    await page.goto("/projects");
    await expect(page.locator(".project-hub")).toBeVisible();
    await expect(page.locator("#lock-pin")).toHaveCount(0);
  });
}

for (const width of [390, 1280]) {
  test(`All account menu locks with PIN, survives reload and signs out at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/projects");
    await page.evaluate(async value => {
      localStorage.setItem("sb-nexus-auth-test-auth-token", JSON.stringify(value));
      const salt = "menu-test-salt";
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:1234`));
      const pinHash = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
      localStorage.setItem("nexus-app-lock", JSON.stringify({ state: { pinHash, salt, rememberUntil: Date.now() + 86400000, encryptionEnabled: false }, version: 0 }));
      sessionStorage.setItem("nexus-session-unlocked", "true");
    }, session);
    await page.reload();
    const trigger = page.getByRole("button", { name: "เมนูบัญชี Nexus Preview" });
    await trigger.click();
    await expect(page.getByRole("button", { name: "ออกจากระบบ", exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/projects$/);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.click();
    await page.screenshot({ path: info.outputPath(`account-menu-${width}.png`), animations: "disabled" });
    await page.getByRole("button", { name: "ล็อคบัญชี", exact: true }).click();
    await expect(page.locator("#lock-pin")).toBeVisible();
    await expect(page.locator(".project-hub")).toHaveCount(0);
    await page.reload();
    await expect(page.locator("#lock-pin")).toBeVisible();
    await page.goto("/dashboard");
    await expect(page.locator("#lock-pin")).toBeVisible();
    await page.goBack();
    await expect(page.locator("#lock-pin")).toBeVisible();
    await page.locator("#lock-pin").fill("0000");
    await page.locator("#lock-pin").press("Enter");
    await expect(page.locator("#lock-pin")).toBeVisible();
    await page.locator("#lock-pin").fill("1234");
    await page.locator("#lock-pin").press("Enter");
    await expect(trigger).toBeVisible();
    await trigger.click();
    await page.getByRole("button", { name: "ออกจากระบบ", exact: true }).click();
    await expect(page.getByRole("textbox", { name: "Email", exact: true })).toBeVisible();
    await expect(page.locator(".project-hub")).toHaveCount(0);
    await page.goto("/dashboard");
    await expect(page.getByRole("textbox", { name: "Email", exact: true })).toBeVisible();
  });
}

test("All menu explains missing PIN and removes local access even if remote logout fails", async ({ page }) => {
  await page.goto("/projects");
  await page.evaluate(value => localStorage.setItem("sb-nexus-auth-test-auth-token", JSON.stringify(value)), session);
  await page.reload();
  await page.getByRole("button", { name: "เมนูบัญชี Nexus Preview" }).click();
  await expect(page.getByRole("button", { name: "ล็อคบัญชี", exact: true })).toBeDisabled();
  await expect(page.getByText("ยังไม่ได้ตั้งค่า PIN บนอุปกรณ์นี้")).toBeVisible();
  await page.route("**/auth/v1/logout**", route => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "Test failure" }) }));
  await page.getByRole("button", { name: "ออกจากระบบ", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Email", exact: true })).toBeVisible();
  await expect(page.locator(".project-hub")).toHaveCount(0);
});
test("All lock invalidates another Main tab and survives reload", async ({page, context}) => {
 await page.goto("/projects");
 await page.evaluate(async value => {
  localStorage.setItem("sb-nexus-auth-test-auth-token", JSON.stringify(value));
  const salt = "cross-tab-salt";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt + ":1234"));
  const pinHash = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2,"0")).join("");
  localStorage.setItem("nexus-app-lock", JSON.stringify({state:{pinHash,salt,rememberUntil:Date.now()+86400000,encryptionEnabled:false},version:0}));
  sessionStorage.setItem("nexus-session-unlocked","true");
 },session);
 await page.reload();
 const second = await context.newPage();
 await second.goto("/dashboard");
 await expect(second.locator("main")).toBeVisible();
 await second.evaluate(() => sessionStorage.setItem("nexus-session-unlocked","true"));
 await second.reload();
 await page.getByRole("button",{name:"เมนูบัญชี Nexus Preview"}).click();
 await page.getByRole("button",{name:"ล็อคบัญชี",exact:true}).click();
 await expect(page.locator("#lock-pin")).toBeVisible();
 await expect(second.locator("#lock-pin")).toBeVisible();
 await expect(second.locator(".main-topbar")).toHaveCount(0);
 await second.reload();
 await expect(second.locator("#lock-pin")).toBeVisible();
 // Unlocking one tab without Remember does not unlock the other tab.
 await page.getByRole("checkbox").uncheck();
 await page.locator("#lock-pin").fill("1234");
 await page.locator("#lock-pin").press("Enter");
 await expect(page.locator(".project-hub")).toBeVisible();
 await expect(second.locator("#lock-pin")).toBeVisible();
 await second.locator("#lock-pin").fill("1234");
 await second.locator("#lock-pin").press("Enter");
 await expect(second.locator(".main-topbar")).toBeVisible();
});
