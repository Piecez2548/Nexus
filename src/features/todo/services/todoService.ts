import { todoRepository } from "@/features/todo/repositories/todoRepository";
import type { Todo } from "../types";

export const todoService = {
  list: () => todoRepository.getAll(),

  create: (todo: Todo) => todoRepository.add(todo),

  update: (id: number, todo: Todo) =>
    todoRepository.update(id, todo),

  remove: (id: number) => todoRepository.remove(id),
};
