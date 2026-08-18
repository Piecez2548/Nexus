import { db } from "@/database/db";
import { createRepository } from "@/database/createRepository";
import type { BudgetPeriodSnapshot } from "../types";

export const budgetPeriodSnapshotRepository = createRepository<BudgetPeriodSnapshot>(db.budgetPeriodSnapshots, "budgetPeriodSnapshots");
