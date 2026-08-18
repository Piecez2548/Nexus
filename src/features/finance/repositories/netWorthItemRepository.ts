import { db } from "@/database/db";
import { createRepository } from "@/database/createRepository";
import type { NetWorthItem } from "../types";

export const netWorthItemRepository = createRepository<NetWorthItem>(db.netWorthItems, "netWorthItems");
