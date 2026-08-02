import { tradeRepository } from "@/features/trading/repositories/tradeRepository";
import { createCrudService } from "@/database/createCrudService";
import type { Trade } from "../types";

export const tradeService = createCrudService<Trade>(tradeRepository);
