import { db } from "@/database/db";
import { createRepository } from "@/database/createRepository";
import type { Habit } from "../types";

export const habitRepository = createRepository<Habit>(db.habits, "habits");
