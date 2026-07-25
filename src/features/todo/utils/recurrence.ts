import type { TodoRecurrence } from "@/features/todo/types";

function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Advances a YYYY-MM-DD date string by one recurrence interval, anchored on
// the todo's own due date when it has one, or today otherwise. Parsed and
// rebuilt as a local calendar date throughout — see periodRange.ts for why
// `new Date(dateString)` (UTC midnight) isn't used here.
export function nextDueDate(recurring: TodoRecurrence, fromDate?: string): string {
  const base = fromDate
    ? (() => {
        const [year, month, day] = fromDate.split("-").map(Number);
        return new Date(year, month - 1, day);
      })()
    : new Date();

  switch (recurring) {
    case "daily":
      base.setDate(base.getDate() + 1);
      break;
    case "weekly":
      base.setDate(base.getDate() + 7);
      break;
    case "monthly":
      base.setMonth(base.getMonth() + 1);
      break;
  }

  return toDateString(base);
}
