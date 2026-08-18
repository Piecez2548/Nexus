import { db } from "@/database/db";
import { createRepository } from "@/database/createRepository";
import type { Budget } from "../types";

export const budgetRepository = createRepository<Budget>(db.budgets, "budgets");
