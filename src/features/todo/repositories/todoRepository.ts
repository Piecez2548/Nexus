import { db } from "@/database/db";
import { createRepository } from "@/database/createRepository";
import type { Todo } from "../types";

export const todoRepository = createRepository<Todo>(db.todos, "todos");
