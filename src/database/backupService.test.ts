import { describe, expect, it, beforeEach } from "vitest";
import { exportBackup, importBackup, resetAllData } from "./backupService";
import { db } from "./db";
import { useAppLockStore } from "@/store/appLockStore";
import { useEncryptionSessionStore } from "@/features/encryption/store/encryptionSessionStore";
import { generateDek } from "@/features/encryption/crypto/encryption";
import { EncryptionLockedError } from "@/database/encryptedRepository";

const t = (key: string) => key;

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
      db.holdings.clear(),
      db.calendarEvents.clear(),
      db.goalMilestoneEvents.clear(),
      db.vaultEntries.clear(),
      db.workoutExercises.clear(),
      db.workoutEntries.clear(),
      db.netWorthItems.clear(),
      db.netWorthSnapshots.clear(),
      db.subscriptions.clear(),
      db.budgetPeriodSnapshots.clear(),
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

    await importBackup(json, t);

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

    await expect(importBackup(JSON.stringify(legacyBackup), t)).resolves.not.toThrow();
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

    await expect(importBackup(JSON.stringify(legacyBackup), t)).resolves.not.toThrow();
    expect(await db.accounts.count()).toBe(1);
    expect(await db.habits.count()).toBe(0);
  });

  it("imports a legacy backup file that predates holdings", async () => {
    const legacyBackup = {
      version: 1,
      exportedAt: "2026-01-01T00:00:00.000Z",
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
        habits: [],
        // holdings deliberately absent
      },
    };

    await expect(importBackup(JSON.stringify(legacyBackup), t)).resolves.not.toThrow();
    expect(await db.accounts.count()).toBe(1);
    expect(await db.holdings.count()).toBe(0);
  });

  it("imports a legacy backup file that predates calendarEvents", async () => {
    const legacyBackup = {
      version: 1,
      exportedAt: "2026-07-01T00:00:00.000Z",
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
        habits: [],
        holdings: [],
        // calendarEvents deliberately absent
      },
    };

    await expect(importBackup(JSON.stringify(legacyBackup), t)).resolves.not.toThrow();
    expect(await db.accounts.count()).toBe(1);
    expect(await db.calendarEvents.count()).toBe(0);
  });

  it("imports a legacy backup file that predates goalMilestoneEvents", async () => {
    const legacyBackup = {
      version: 1,
      exportedAt: "2026-07-30T00:00:00.000Z",
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
        habits: [],
        holdings: [],
        calendarEvents: [],
        scheduleItems: [],
        // goalMilestoneEvents deliberately absent
      },
    };

    await expect(importBackup(JSON.stringify(legacyBackup), t)).resolves.not.toThrow();
    expect(await db.accounts.count()).toBe(1);
    expect(await db.goalMilestoneEvents.count()).toBe(0);
  });

  it("imports a legacy backup file that predates vaultEntries", async () => {
    const legacyBackup = {
      version: 1,
      exportedAt: "2026-08-01T00:00:00.000Z",
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
        habits: [],
        holdings: [],
        calendarEvents: [],
        scheduleItems: [],
        goalMilestoneEvents: [],
        // vaultEntries, workoutExercises, workoutEntries deliberately absent
      },
    };

    await expect(importBackup(JSON.stringify(legacyBackup), t)).resolves.not.toThrow();
    expect(await db.accounts.count()).toBe(1);
    expect(await db.vaultEntries.count()).toBe(0);
    expect(await db.workoutExercises.count()).toBe(0);
    expect(await db.workoutEntries.count()).toBe(0);
  });

  it("rejects a malformed backup without touching existing data", async () => {
    await db.accounts.add({ name: "Cash", type: "cash", icon: "wallet", color: "#16a34a" });

    await expect(importBackup("not json", t)).rejects.toThrow();
    await expect(importBackup(JSON.stringify({ foo: "bar" }), t)).rejects.toThrow();

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
    await db.holdings.add({ symbol: "AAPL", market: "stocks", quantity: 10, avgCostPrice: 100 } as never);
    await db.calendarEvents.add({ title: "Leftover event", startAt: "2026-07-21T09:00" } as never);
    await db.goalMilestoneEvents.add({ goalSyncId: "abc", goalName: "MacBook", tier: 50, reachedAt: "2026-07-21T00:00:00.000Z" });
    await db.vaultEntries.add({ type: "note", title: "Leftover note", createdAt: "2026-07-21T00:00:00.000Z" } as never);
    await db.workoutExercises.add({
      name: "Leftover exercise",
      category: "strength",
      icon: "dumbbell",
      color: "#3b82f6",
      createdAt: "2026-07-21T00:00:00.000Z",
    } as never);
    await db.workoutEntries.add({
      exerciseName: "Leftover exercise",
      date: "2026-07-21",
      caloriesBurned: 10,
      createdAt: "2026-07-21T00:00:00.000Z",
    } as never);

    await resetAllData();

    const transactions = await db.transactions.toArray();
    const accounts = await db.accounts.toArray();
    const categories = await db.categories.toArray();
    const todos = await db.todos.toArray();
    const habits = await db.habits.toArray();
    const holdings = await db.holdings.toArray();
    const calendarEvents = await db.calendarEvents.toArray();
    const goalMilestoneEvents = await db.goalMilestoneEvents.toArray();
    const vaultEntries = await db.vaultEntries.toArray();
    const workoutExercises = await db.workoutExercises.toArray();
    const workoutEntries = await db.workoutEntries.toArray();

    expect(transactions).toHaveLength(0);
    expect(todos).toHaveLength(0);
    expect(habits).toHaveLength(0);
    expect(holdings).toHaveLength(0);
    expect(calendarEvents).toHaveLength(0);
    expect(goalMilestoneEvents).toHaveLength(0);
    expect(vaultEntries).toHaveLength(0);
    expect(workoutExercises).toHaveLength(0);
    expect(workoutEntries).toHaveLength(0);
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

      await importBackup(json, t);

      const rawRows = await db.accounts.toArray();
      expect(rawRows).toHaveLength(1);
      expect(rawRows[0]).toHaveProperty("encryptedContent");
      expect((rawRows[0] as unknown as { name?: string }).name).toBeUndefined();

      const { accountRepository } = await import("@/features/finance/repositories/accountRepository");
      const decrypted = await accountRepository.getAll();
      expect(decrypted[0]).toMatchObject({ name: "Cash" });
    });

    it("includes vaultEntries in the backup and re-encrypts them correctly on import (previously missing entirely)", async () => {
      const dek = await generateDek();
      useAppLockStore.setState({ encryptionEnabled: true });
      useEncryptionSessionStore.getState().setDek(dek);

      const { vaultEntryRepository } = await import("@/features/vault/repositories/vaultEntryRepository");
      await vaultEntryRepository.add({
        type: "password",
        title: "Gmail",
        username: "me@example.com",
        password: "correct-horse-battery-staple",
        createdAt: "2026-08-17T00:00:00.000Z",
      });

      const json = await exportBackup();
      const parsed = JSON.parse(json);
      expect(parsed.data.vaultEntries).toHaveLength(1);
      // The backup itself is plaintext regardless of encryption being on --
      // same guarantee as every other table.
      expect(parsed.data.vaultEntries[0]).toMatchObject({ title: "Gmail", password: "correct-horse-battery-staple" });
      expect(parsed.data.vaultEntries[0]).not.toHaveProperty("encryptedContent");

      await db.vaultEntries.clear();
      await importBackup(json, t);

      const rawRows = await db.vaultEntries.toArray();
      expect(rawRows).toHaveLength(1);
      expect(rawRows[0]).toHaveProperty("encryptedContent");
      expect((rawRows[0] as unknown as { title?: string }).title).toBeUndefined();

      const decrypted = await vaultEntryRepository.getAll();
      expect(decrypted[0]).toMatchObject({ title: "Gmail", password: "correct-horse-battery-staple" });
    });

    it("includes workoutExercises and workoutEntries in the backup and re-encrypts them correctly on import (previously missing entirely)", async () => {
      const dek = await generateDek();
      useAppLockStore.setState({ encryptionEnabled: true });
      useEncryptionSessionStore.getState().setDek(dek);

      const { workoutExerciseRepository } = await import("@/features/workouts/repositories/workoutExerciseRepository");
      const { workoutEntryRepository } = await import("@/features/workouts/repositories/workoutEntryRepository");
      await workoutExerciseRepository.add({
        name: "Push-up",
        category: "strength",
        icon: "dumbbell",
        color: "#3b82f6",
        caloriesPerRep: 0.5,
        createdAt: "2026-08-17T00:00:00.000Z",
      });
      await workoutEntryRepository.add({
        exerciseName: "Push-up",
        date: "2026-08-17",
        reps: 10,
        rounds: 3,
        caloriesBurned: 15,
        createdAt: "2026-08-17T00:00:00.000Z",
      });

      const json = await exportBackup();
      const parsed = JSON.parse(json);
      expect(parsed.data.workoutExercises).toHaveLength(1);
      expect(parsed.data.workoutEntries).toHaveLength(1);
      // The backup itself is plaintext regardless of encryption being on --
      // same guarantee as every other table.
      expect(parsed.data.workoutExercises[0]).toMatchObject({ name: "Push-up" });
      expect(parsed.data.workoutExercises[0]).not.toHaveProperty("encryptedContent");
      expect(parsed.data.workoutEntries[0]).toMatchObject({ exerciseName: "Push-up", reps: 10 });
      expect(parsed.data.workoutEntries[0]).not.toHaveProperty("encryptedContent");

      await db.workoutExercises.clear();
      await db.workoutEntries.clear();
      await importBackup(json, t);

      const rawExercises = await db.workoutExercises.toArray();
      expect(rawExercises).toHaveLength(1);
      expect(rawExercises[0]).toHaveProperty("encryptedContent");
      expect((rawExercises[0] as unknown as { name?: string }).name).toBeUndefined();

      const rawEntries = await db.workoutEntries.toArray();
      expect(rawEntries).toHaveLength(1);
      expect(rawEntries[0]).toHaveProperty("encryptedContent");
      expect((rawEntries[0] as unknown as { exerciseName?: string }).exerciseName).toBeUndefined();

      const decryptedExercises = await workoutExerciseRepository.getAll();
      expect(decryptedExercises[0]).toMatchObject({ name: "Push-up" });
      const decryptedEntries = await workoutEntryRepository.getAll();
      expect(decryptedEntries[0]).toMatchObject({ exerciseName: "Push-up", reps: 10 });
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

      await importBackup(json, t);

      const rawRow = await db.recipientProfiles.where("recipientKey").equals("0812345678").first();
      expect(rawRow).toHaveProperty("encryptedContent");
      expect((rawRow as unknown as { alias?: string })?.alias).toBeUndefined();
    });
  });
});
