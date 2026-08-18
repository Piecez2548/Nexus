import { db } from "@/database/db";
import { createRepository } from "@/database/createRepository";
import type { NetWorthSnapshot } from "../types";

export const netWorthSnapshotRepository = createRepository<NetWorthSnapshot>(db.netWorthSnapshots, "netWorthSnapshots");
