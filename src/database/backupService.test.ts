import { describe, expect, it, beforeEach } from "vitest";
import { exportBackup, importBackup, resetAllData } from "./backupService";
import { db } from "./db";
import { useAppLockStore } from "@/store/appLockStore";
import { useEncryptionSessionStore } from "@/features/encryption/store/encryptionSessionStore";
import { generateDek } from "@/features/encryption/crypto/encryption";
import { EncryptionLockedError } from "@/database/encryptedRepository";

describe("backupService", () => {
  beforeEach(async () => {
    await Promise.all([
      db.transactions.clear(),
      db.accounts.clear(),
      db.categories.clear(),
      db.trades.clear(),
      db.recipientProfiles.clear(),
      db.merchants.clear(),
      db.budgets.clear(),
      db.goals.clear(),
      db.transactionTemplates.clear(),
      db.todos.clear(),
      db.habits.clear(),
    ]);
    useAppLockStore.setState({ encryptionEnabled: false, wrappedDek: null, kekSalt: null, kekIterations: null });
    useEncryptionSessionStore.getState().clearDek();
  });

  it("exports all tables into a versioned JSON backup", async () => {
    await db.accounts.add({ name: "Cash", type: "cash", icon: "wallet", color: "#16a34a" });
    await db.transactions.add({
      title: "Coffee",
      amount: 58,
      type: "expense",
      category: "Food",
      account: "Cash",
      date: "2026-07-21",
      status: "completed",
    });

    const json = await exportBackup();
    const parsed = JSON.parse(json);

    expect(parsed.version).toBe(1);
    expect(parsed.data.accounts).toHaveLength(1);
    expect(parsed.data.transactions).toHaveLength(1);
    expect(parsed.data.transactions[0]).toMatchObject({ title: "Coffee", amount: 58 });
  });

  it("includes transactionTemplates and todos in the backup", async () => {
    await db.todos.add({ title: "Pay rent", completed: false, priority: "medium" } as never);
    await db.transactionTemplates.add({
      name: "Coffee run",
      title: "Coffee",
      amount: 58,
      type: "expense",
      category: "Food",
      account: "Cash",
    } as never);

    const json = await exportBackup();
    const parsed = JSON.parse(json);

    expect(parsed.data.todos).toHaveLength(1);
    expect(parsed.data.todos[0]).toMatchObject({ title: "Pay rent" });
    expect(parsed.data.transactionTemplates).toHaveLength(1);
    expect(parsed.data.transactionTemplates[0]).toMatchObject({ name: "Coffee run" });
  });

  it("round-trips data through export then import", async () => {
    await db.accounts.add({ name: "Bank", type: "bank", icon: "landmark", color: "#2563eb" });
    await db.categories.add({ name: "Food", type: "expense", icon: "utensils", color: "#ef4444" });

    const json = await exportBackup();

    await db.accounts.clear();
    await db.categories.clear();

    await importBackup(json);

    const accounts = await db.accounts.toArray();
    const categories = await db.categories.toArray();

    expect(accounts).toHaveLength(1);
    expect(accounts[0].name).toBe("Bank");
    expect(categories).toHaveLength(1);
  });

  it("imports a legacy backup file that predates transactionTemplates/todos", async () => {
    const legacyBackup = {
      version: 1,
      exportedAt: "2025-01-01T00:00:00.000Z",
      data: {
        transactions: [],
        accounts: [{ name: "Cash", type: "cash", icon: "wallet", color: "#16a34a" }],
        categories: [],
        trades: [],
        recipientProfiles: [],
        merchants: [],
        budgets: [],
        goals: [],
        // transactionTemplates/todos deliberately absent
      },
    };

    await expect(importBackup(JSON.stringify(legacyBackup))).resolves.not.toThrow();
    expect(await db.accounts.count()).toBe(1);
    expect(await db.todos.count()).toBe(0);
  });

  it("imports a legacy backup file that predates habits", async () => {
    const legacyBackup = {
      version: 1,
      exportedAt: "2025-06-01T00:00:00.000Z",
      data: {
        transactions: [],
        accounts: [{ name: "Cash", type: "cash", icon: "wallet", color: "#16a34a" }],
        categories: [],
        trades: [],
        recipientProfiles: [],
        merchants: [],
        budgets: [],
        goals: [],
        transactionTemplates: [],
        todos: [],
        // habits deliberately absent
      },
    };

    await expect(importBackup(JSON.stringify(legacyBackup))).resolves.not.toThrow();
    expect(await db.accounts.count()).toBe(1);
    expect(await db.habits.count()).toBe(0);
  });

  it("rejects a malformed backup without touching existing data", async () => {
    await db.accounts.add({ name: "Cash", type: "cash", icon: "wallet", color: "#16a34a" });

    await expect(importBackup("not json")).rejects.toThrow();
    await expect(importBackup(JSON.stringify({ foo: "bar" }))).rejects.toThrow();

    const accounts = await db.accounts.toArray();
    expect(accounts).toHaveLength(1);
  });

  it("resetAllData clears everything (including templates/todos) then reseeds defaults", async () => {
    await db.transactions.add({
      title: "Custom",
      amount: 100,
      type: "expense",
      category: "Food",
      account: "Cash",
      date: "2026-07-21",
      status: "completed",
    });
    await db.todos.add({ title: "Leftover todo", completed: false, priority: "low" } as never);
    await db.habits.add({ name: "Leftover habit", frequency: "daily", completedDates: [] } as never);

    await resetAllData();

    const transactions = await db.transactions.toArray();
    const accounts = await db.accounts.toArray();
    const categories = await db.categories.toArray();
    const todos = await db.todos.toArray();
    const habits = await db.habits.toArray();

    expect(transactions).toHaveLength(0);
    expect(todos).toHaveLength(0);
    expect(habits).toHaveLength(0);
    expect(accounts.length).toBeGreaterThan(0);
    expect(categories.length).toBeGreaterThan(0);
  });

  describe("encryption compatibility", () => {
    it("exports fully decrypted, human-readable data even when encryption is enabled", async () => {
      const dek = await generateDek();
      useAppLockStore.setState({ encryptionEnabled: true });
      useEncryptionSessionStore.getState().setDek(dek);

      const { transactionRepository } = await import("@/features/finance/repositories/transactionRepository");
      await transactionRepository.add({
        title: "Coffee",
        amount: 58,
        type: "expense",
        category: "Food",
        account: "Cash",
        date: "2026-07-21",
        status: "completed",
      });

      // Confirm the underlying row really is encrypted...
      const rawRows = await db.transactions.toArray();
      expect(rawRows[0]).toHaveProperty("encryptedContent");

      // ...but the backup is plaintext regardless.
      const json = await exportBackup();
      const parsed = JSON.parse(json);
      expect(parsed.data.transactions[0]).not.toHaveProperty("encryptedContent");
      expect(parsed.data.transactions[0]).toMatchObject({ title: "Coffee", amount: 58 });
    });

    it("throws EncryptionLockedError when exporting while encryption is enabled but locked", async () => {
      useAppLockStore.setState({ encryptionEnabled: true });
      useEncryptionSessionStore.getState().clearDek();

      await expect(exportBackup()).rejects.toThrow(EncryptionLockedError);
    });

    it("re-encrypts imported rows when encryption is enabled at import time", async () => {
      await db.accounts.add({ name: "Cash", type: "cash", icon: "wallet", color: "#16a34a" });
      const json = await exportBackup(); // plaintext backup, encryption off

      await db.accounts.clear();

      const dek = await generateDek();
      useAppLockStore.setState({ encryptionEnabled: true });
      useEncryptionSessionStore.getState().setDek(dek);

      await importBackup(json);

      const rawRows = await db.accounts.toArray();
      expect(rawRows).toHaveLength(1);
      expect(rawRows[0]).toHaveProperty("encryptedContent");
      expect((rawRows[0] as unknown as { name?: string }).name).toBeUndefined();

      const { accountRepository } = await import("@/features/finance/repositories/accountRepository");
      const decrypted = await accountRepository.getAll();
      expect(decrypted[0]).toMatchObject({ name: "Cash" });
    });

    it("keeps plaintextKeys (e.g. recipientKey) unencrypted after a re-encrypting import", async () => {
      await db.recipientProfiles.add({
        recipientKey: "0812345678",
        alias: "Somchai",
        category: "Food",
        account: "Cash",
        transactionCount: 1,
        totalAmount: 100,
        lastUsedDate: "2026-07-21",
        confidenceScore: 1,
      });
      const json = await exportBackup();

      await db.recipientProfiles.clear();

      const dek = await generateDek();
      useAppLockStore.setState({ encryptionEnabled: true });
      useEncryptionSessionStore.getState().setDek(dek);

      await importBackup(json);

      const rawRow = await db.recipientProfiles.where("recipientKey").equals("0812345678").first();
      expect(rawRow).toHaveProperty("encryptedContent");
      expect((rawRow as unknown as { alias?: string })?.alias).toBeUndefined();
    });
  });
});
