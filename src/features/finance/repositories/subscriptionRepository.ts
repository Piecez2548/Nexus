import { db } from "@/database/db";
import { createRepository } from "@/database/createRepository";
import type { Subscription } from "../types";

export const subscriptionRepository = createRepository<Subscription>(db.subscriptions, "subscriptions");
