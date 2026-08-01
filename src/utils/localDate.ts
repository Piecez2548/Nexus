// Shared local-calendar-date helpers. Never `new Date("YYYY-MM-DD")` (parses
// as UTC midnight) or `.toISOString().slice(0,10)` (also UTC) — both drift
// across a day boundary relative to a locally-constructed Date in any
// non-UTC timezone. Every date-string field in this app ("YYYY-MM-DD") is
// meant to be read/written as a local calendar date.
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}
