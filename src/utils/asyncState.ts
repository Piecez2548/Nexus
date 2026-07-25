export interface AsyncState {
  loading: boolean;
  error: string | null;
}

export const initialAsyncState: AsyncState = {
  loading: false,
  error: null,
};

export function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong.";
}
