export interface AsyncState {
  loading: boolean;
  error: string | null;
}

export const initialAsyncState: AsyncState = {
  loading: false,
  error: null,
};

// Supabase's client rejects with plain PostgrestError-shaped objects
// (`{message, details, hint, code}`), not real `Error` instances — checking
// only `instanceof Error` would silently swallow the actual reason and fall
// through to the generic fallback below.
export function toErrorMessage(err: unknown, fallback = "Something went wrong."): string {
  if (err instanceof Error) return err.message;

  if (err && typeof err === "object" && typeof (err as { message?: unknown }).message === "string") {
    return (err as { message: string }).message;
  }

  return fallback;
}
