import { budgetRepository } from "@/features/finance/repositories/budgetRepository";
import { createCrudService } from "@/database/createCrudService";
import type { Budget } from "../types";

export const budgetService = createCrudService<Budget>(budgetRepository);
