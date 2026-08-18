import { netWorthItemRepository } from "@/features/finance/repositories/netWorthItemRepository";
import { createCrudService } from "@/database/createCrudService";
import type { NetWorthItem } from "../types";

export const netWorthItemService = createCrudService<NetWorthItem>(netWorthItemRepository);
