import { db } from "@/database/db";
import { createRepository } from "@/database/createRepository";
import type { Budget } from "../types";

// `category` stays plaintext — it backs the `&category` unique Dexie index
// (one budget per category), which would otherwise be unenforceable once
// folded into an opaque encrypted blob.
export const budgetRepository = createRepository<Budget>(db.budgets, "budgets", {
  plaintextKeys: ["category"],
});
