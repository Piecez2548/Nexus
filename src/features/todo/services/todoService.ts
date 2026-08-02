import { todoRepository } from "@/features/todo/repositories/todoRepository";
import { createCrudService } from "@/database/createCrudService";
import type { Todo } from "../types";

export const todoService = createCrudService<Todo>(todoRepository);
