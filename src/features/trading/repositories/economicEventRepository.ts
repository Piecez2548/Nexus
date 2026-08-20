import { db } from "@/database/db";
import { createRepository } from "@/database/createRepository";
import type { EconomicEvent } from "../types";

export const economicEventRepository = createRepository<EconomicEvent>(db.economicEvents, "economicEvents");
