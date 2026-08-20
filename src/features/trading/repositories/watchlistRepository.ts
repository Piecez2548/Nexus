import { db } from "@/database/db";
import { createRepository } from "@/database/createRepository";
import type { WatchlistItem } from "../types";

export const watchlistRepository = createRepository<WatchlistItem>(db.watchlistItems, "watchlistItems");
