import { economicEventRepository } from "@/features/trading/repositories/economicEventRepository";
import { createCrudService } from "@/database/createCrudService";
import type { EconomicEvent } from "../types";

export const economicEventService = createCrudService<EconomicEvent>(economicEventRepository);
