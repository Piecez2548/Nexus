import { budgetPeriodSnapshotRepository } from "@/features/finance/repositories/budgetPeriodSnapshotRepository";
import { createCrudService } from "@/database/createCrudService";
import type { BudgetPeriodSnapshot } from "../types";

export const budgetPeriodSnapshotService = createCrudService<BudgetPeriodSnapshot>(budgetPeriodSnapshotRepository);
