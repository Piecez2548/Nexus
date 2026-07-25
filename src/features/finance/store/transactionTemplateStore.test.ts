import { describe, expect, it, beforeEach } from "vitest";

import { useTransactionTemplateStore } from "./transactionTemplateStore";
import { db } from "@/database/db";

describe("transactionTemplateStore (Dexie integration)", () => {
  beforeEach(async () => {
    await db.transactionTemplates.clear();
    useTransactionTemplateStore.setState({ templates: [], loading: false, error: null });
  });

  it("loadTemplates reads from the database", async () => {
    await db.transactionTemplates.add({
      name: "Starbucks",
      type: "expense",
      category: "Food",
      account: "Cash",
    });

    await useTransactionTemplateStore.getState().loadTemplates();

    expect(useTransactionTemplateStore.getState().templates).toHaveLength(1);
    expect(useTransactionTemplateStore.getState().templates[0].name).toBe("Starbucks");
  });

  it("addTemplate persists to the database and updates state", async () => {
    await useTransactionTemplateStore.getState().addTemplate({
      name: "Netflix",
      type: "expense",
      category: "Entertainment",
      account: "Cash",
      amount: 419,
    });

    expect(useTransactionTemplateStore.getState().templates).toHaveLength(1);
    const stored = await db.transactionTemplates.toArray();
    expect(stored[0].amount).toBe(419);
  });

  it("updateTemplate modifies an existing record", async () => {
    const id = await db.transactionTemplates.add({
      name: "Netflix",
      type: "expense",
      category: "Entertainment",
      account: "Cash",
    });

    await useTransactionTemplateStore.getState().updateTemplate(id, {
      name: "Netflix Premium",
      type: "expense",
      category: "Entertainment",
      account: "Cash",
      amount: 549,
    });

    const updated = await db.transactionTemplates.get(id);
    expect(updated?.name).toBe("Netflix Premium");
    expect(updated?.amount).toBe(549);
  });

  it("deleteTemplate removes the record", async () => {
    const id = await db.transactionTemplates.add({
      name: "Netflix",
      type: "expense",
      category: "Entertainment",
      account: "Cash",
    });

    await useTransactionTemplateStore.getState().loadTemplates();
    await useTransactionTemplateStore.getState().deleteTemplate(id);

    expect(await db.transactionTemplates.get(id)).toBeUndefined();
    expect(useTransactionTemplateStore.getState().templates).toHaveLength(0);
  });
});
