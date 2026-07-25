import TodoItem from "@/features/todo/components/TodoItem";
import { useTranslation } from "@/i18n/useTranslation";
import type { Todo } from "@/features/todo/types";

interface Props {
  todos: Todo[];
  onEdit: (todo: Todo) => void;
}

function sortTodos(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });
}

export default function TodoList({ todos, onEdit }: Props) {
  const { t } = useTranslation();

  if (todos.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-zinc-500 dark:text-zinc-400">
        {t("todo.emptyState")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortTodos(todos).map((todo) => (
        <TodoItem key={todo.id} todo={todo} onEdit={() => onEdit(todo)} />
      ))}
    </div>
  );
}
