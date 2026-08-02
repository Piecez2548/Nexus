import { goalRepository } from "@/features/finance/repositories/goalRepository";
import { createCrudService } from "@/database/createCrudService";
import type { Goal } from "../types";

export const goalService = createCrudService<Goal>(goalRepository);
