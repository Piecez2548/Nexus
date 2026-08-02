import { holdingRepository } from "@/features/portfolio/repositories/holdingRepository";
import { createCrudService } from "@/database/createCrudService";
import type { Holding } from "../types";

export const holdingService = createCrudService<Holding>(holdingRepository);
