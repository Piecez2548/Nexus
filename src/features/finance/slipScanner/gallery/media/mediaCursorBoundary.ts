const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

// Date inputs describe the person's local calendar day, while MediaStore and
// File.lastModified use absolute timestamps. Convert date-only values at the
// boundary so "To 2026-09-16" includes that entire local day. Full ISO
// cursors from incremental scans remain untouched.
export function mediaCursorMs(value: string | undefined, endOfDay = false): number | undefined {
  if (!value) return undefined;
  const match = DATE_ONLY.exec(value);
  const ms = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + (endOfDay ? 1 : 0)).getTime()
    : Date.parse(value);
  return Number.isNaN(ms) ? undefined : ms;
}

export function mediaCursorIso(value: string | undefined, endOfDay = false): string | undefined {
  const ms = mediaCursorMs(value, endOfDay);
  return ms === undefined ? undefined : new Date(ms).toISOString();
}
