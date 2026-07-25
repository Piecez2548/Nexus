import { create } from "zustand";
import { todoService } from "@/features/todo/services/todoService";
import { nextDueDate } from "@/features/todo/utils/recurrence";
import { useGamificationStore } from "@/store/gamificationStore";
import { XP_REWARDS } from "@/utils/xpRewards";
import { initialAsyncState, toErrorMessage } from "@/utils/asyncState";
import type { Todo } from "@/features/todo/types";
import type { TodoFormData } from "@/features/todo/schemas/todoSchema";

interface TodoState {
  todos: Todo[];
  loading: boolean;
  error: string | null;

  loadTodos: () => Promise<void>;
  addTodo: (data: TodoFormData) => Promise<void>;
  updateTodo: (id: number, data: TodoFormData) => Promise<void>;
  deleteTodo: (id: number) => Promise<void>;
  toggleComplete: (id: number) => Promise<void>;
}

export const useTodoStore =
  create<TodoState>((set, get) => ({
    todos: [],
    ...initialAsyncState,

    loadTodos: async () => {
      set({ loading: true, error: null });

      try {
        const todos = await todoService.list();
        set({ todos, loading: false });
      } catch (err) {
        set({ loading: false, error: toErrorMessage(err) });
      }
    },

    async addTodo(data) {
      const todo: Todo = {
        ...data,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      await todoService.create(todo);
      const todos = await todoService.list();
      set({ todos });
    },

    async updateTodo(id, data) {
      const existing = get().todos.find((t) => t.id === id);
      if (!existing) return;

      await todoService.update(id, { ...existing, ...data });
      const todos = await todoService.list();
      set({ todos });
    },

    async deleteTodo(id) {
      await todoService.remove(id);
      const todos = await todoService.list();
      set({ todos });
    },

    async toggleComplete(id) {
      const existing = get().todos.find((t) => t.id === id);
      if (!existing) return;

      const completed = !existing.completed;
      await todoService.update(id, {
        ...existing,
        completed,
        completedAt: completed ? new Date().toISOString() : undefined,
      });

      // Completing (not un-completing) is the only transition that earns XP
      // and spawns the next occurrence of a recurring todo.
      if (completed) {
        useGamificationStore.getState().addXp(XP_REWARDS.todoCompleted[existing.priority]);

        if (existing.recurring) {
          await todoService.create({
            title: existing.title,
            notes: existing.notes,
            priority: existing.priority,
            recurring: existing.recurring,
            dueDate: nextDueDate(existing.recurring, existing.dueDate),
            completed: false,
            createdAt: new Date().toISOString(),
          });
        }
      }

      const todos = await todoService.list();
      set({ todos });
    },
  }));
