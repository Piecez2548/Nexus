import { subscriptionRepository } from "@/features/finance/repositories/subscriptionRepository";
import { createCrudService } from "@/database/createCrudService";
import type { Subscription } from "../types";

export const subscriptionService = createCrudService<Subscription>(subscriptionRepository);
