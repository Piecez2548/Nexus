import { db } from "@/database/db";
import { createRepository } from "@/database/createRepository";
import type { Holding } from "../types";

export const holdingRepository = createRepository<Holding>(db.holdings, "holdings");
