import { netWorthSnapshotRepository } from "@/features/finance/repositories/netWorthSnapshotRepository";
import { createCrudService } from "@/database/createCrudService";
import type { NetWorthSnapshot } from "../types";

export const netWorthSnapshotService = createCrudService<NetWorthSnapshot>(netWorthSnapshotRepository);
