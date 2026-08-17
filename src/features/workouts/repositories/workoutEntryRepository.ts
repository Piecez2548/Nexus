import { db } from "@/database/db";
import { createRepository } from "@/database/createRepository";
import type { WorkoutEntry } from "../types";

export const workoutEntryRepository = createRepository<WorkoutEntry>(db.workoutEntries, "workoutEntries");
