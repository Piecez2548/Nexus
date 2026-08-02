import { db } from "@/database/db";
import { createRepository } from "@/database/createRepository";
import type { Goal } from "../types";

export const goalRepository = createRepository<Goal>(db.goals, "goals");
