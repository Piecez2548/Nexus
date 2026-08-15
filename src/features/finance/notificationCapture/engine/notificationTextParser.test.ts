import { describe, expect, it } from "vitest";

import { parseNotificationText } from "./notificationTextParser";

describe("parseNotificationText", () => {
  it("extracts an amount anchored to a Thai currency word", () => {
    const result = parseNotificationText("จ่ายเงินสำเร็จ 250.00 บาท ไปยัง John Doe");
    expect(result.amount).toBe(250);
    expect(result.counterparty).toBe("John Doe");
  });

  it("extracts an amount anchored to the ฿ symbol", () => {
    const result = parseNotificationText("Payment successful ฿1,250.50 to Jane Smith");
    expect(result.amount).toBe(1250.5);
  });

  it("extracts an amount anchored to THB", () => {
    const result = parseNotificationText("Transfer of 99.00 THB completed");
    expect(result.amount).toBe(99);
  });

  it("does not extract an unanchored number (conservative -- avoids the 'wrong number' bug class)", () => {
    // A promotional/balance notification with a bare 2-decimal number and no
    // currency marker must not be misread as a transaction amount.
    const result = parseNotificationText("Your account balance is 520.00 as of today");
    expect(result.amount).toBeUndefined();
  });

  it("returns undefined amount for non-transaction notification text", () => {
    const result = parseNotificationText("New feature available in the app!");
    expect(result.amount).toBeUndefined();
    expect(result.counterparty).toBeUndefined();
  });

  it("returns undefined counterparty when no marker is present", () => {
    const result = parseNotificationText("จ่ายเงินสำเร็จ 250.00 บาท");
    expect(result.amount).toBe(250);
    expect(result.counterparty).toBeUndefined();
  });

  it("handles an English 'to' marker", () => {
    const result = parseNotificationText("You sent 100.00 THB to Coffee Shop");
    expect(result.counterparty).toBe("Coffee Shop");
  });
});
