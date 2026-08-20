import { db } from "@/database/db";
import { createRepository } from "@/database/createRepository";
import type { Strategy } from "../types";

export const strategyRepository = createRepository<Strategy>(db.strategies, "strategies");
