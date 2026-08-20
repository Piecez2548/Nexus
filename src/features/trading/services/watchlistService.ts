import { watchlistRepository } from "@/features/trading/repositories/watchlistRepository";
import { createCrudService } from "@/database/createCrudService";
import type { WatchlistItem } from "../types";

export const watchlistService = createCrudService<WatchlistItem>(watchlistRepository);
