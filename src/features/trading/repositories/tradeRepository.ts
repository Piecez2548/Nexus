import { db } from "@/database/db";
import { createRepository } from "@/database/createRepository";
import type { Trade } from "../types";

export const tradeRepository = createRepository<Trade>(db.trades, "trades");
