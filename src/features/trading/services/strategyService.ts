import { strategyRepository } from "@/features/trading/repositories/strategyRepository";
import { createCrudService } from "@/database/createCrudService";
import type { Strategy } from "../types";

export const strategyService = createCrudService<Strategy>(strategyRepository);
