import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { useTodoStore } from "@/features/todo/store/todoStore";
import TodoList from "@/features/todo/components/TodoList";
import TodoForm from "@/features/todo/components/TodoForm";
import TodoToolbar from "@/features/todo/components/TodoToolbar";
import Drawer from "@/components/ui/Drawer";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import { useTranslation } from "@/i18n/useTranslation";
import type { Todo as TodoItemType } from "@/features/todo/types";

export default function Todo() {
  const { todos, loading, error, loadTodos } = useTodoStore();
  const { t } = useTranslation();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState<TodoItemType | null>(null);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  function handleAdd() {
    setSelectedTodo(null);
    setIsDrawerOpen(true);
  }

  function handleEdit(todo: TodoItemType) {
    setSelectedTodo(todo);
    setIsDrawerOpen(true);
  }

  function handleClose() {
    setIsDrawerOpen(false);
    setSelectedTodo(null);
  }

  const filteredTodos = useMemo(() => {
    return todos.filter((todo) => {
      const query = search.toLowerCase();
      const matchSearch =
        query === "" ||
        todo.title.toLowerCase().includes(query) ||
        (todo.notes ?? "").toLowerCase().includes(query);

      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "completed" ? todo.completed : !todo.completed);

      const matchPriority = filterPriority === "all" || todo.priority === filterPriority;

      return matchSearch && matchStatus && matchPriority;
    });
  }, [todos, search, filterStatus, filterPriority]);

  const remaining = todos.filter((t) => !t.completed).length;

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("todo.pageTitle")}</h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-500">
            {t("todo.remainingCount", { count: remaining })}
          </p>
        </div>

        <button
          onClick={handleAdd}
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-zinc-900 dark:text-white transition hover:bg-violet-700"
        >
          <Plus size={18} />
          {t("todo.addTodo")}
        </button>
      </div>

      <TodoToolbar
        search={search}
        setSearch={setSearch}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterPriority={filterPriority}
        setFilterPriority={setFilterPriority}
      />

      {error ? (
        <ErrorState message={error} onRetry={loadTodos} />
      ) : loading && todos.length === 0 ? (
        <LoadingState label={t("todo.loading")} />
      ) : (
        <TodoList todos={filteredTodos} onEdit={handleEdit} />
      )}

      <Drawer open={isDrawerOpen} onClose={handleClose}>
        <TodoForm todo={selectedTodo} onDone={handleClose} />
      </Drawer>

    </div>
  );
}
