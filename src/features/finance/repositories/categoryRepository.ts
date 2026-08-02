import { db } from "@/database/db";
import { createRepository } from "@/database/createRepository";
import type { Category } from "../types";

export const categoryRepository = createRepository<Category>(db.categories, "categories");
