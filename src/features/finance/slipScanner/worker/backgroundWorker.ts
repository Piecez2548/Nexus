import { toErrorMessage } from "@/utils/asyncState";

// General-purpose background worker (GS-033): an enqueue-able task queue with
// bounded concurrency, retry+backoff, pause/resume, and cancellation. Tasks run
// as microtasks/timers off the render path so the UI thread is never blocked.
// Distinct from GS-007's stream-pull scan queue (which pulls from a provider) —
// this accepts arbitrary jobs enqueued over time; the two complement each other.

export interface BackgroundTask<T = unknown> {
  id: string;
  run: () => Promise<T>;
}

export interface TaskOutcome {
  id: string;
  ok: boolean;
  error?: string;
  attempts: number;
}

export type WorkerStatus = "idle" | "running" | "paused" | "cancelled" | "drained";

export interface BackgroundWorkerOptions {
  concurrency?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  onSettled?: (outcome: TaskOutcome) => void;
}

export interface BackgroundWorker {
  enqueue: (task: BackgroundTask) => void;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
  readonly status: WorkerStatus;
  readonly pending: number;
  whenDrained: () => Promise<void>;
}

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export function createBackgroundWorker(options: BackgroundWorkerOptions = {}): BackgroundWorker {
  const concurrency = Math.max(1, options.concurrency ?? 2);
  const maxRetries = options.maxRetries ?? 2;
  const retryDelayMs = options.retryDelayMs ?? 50;

  const queue: BackgroundTask[] = [];
  let active = 0;
  let status: WorkerStatus = "idle";
  let cancelled = false;
  let pauseGate: Promise<void> | null = null;
  let releasePause: (() => void) | null = null;
  const drainWaiters: Array<() => void> = [];

  function settleDrainIfIdle(): void {
    if (active === 0 && queue.length === 0) {
      if (!cancelled) status = status === "cancelled" ? status : "drained";
      drainWaiters.splice(0).forEach((resolve) => resolve());
    }
  }

  async function process(task: BackgroundTask): Promise<void> {
    let attempt = 0;
    for (;;) {
      attempt += 1;
      try {
        await task.run();
        options.onSettled?.({ id: task.id, ok: true, attempts: attempt });
        return;
      } catch (err) {
        if (attempt > maxRetries || cancelled) {
          options.onSettled?.({ id: task.id, ok: false, error: toErrorMessage(err), attempts: attempt });
          return;
        }
        await delay(retryDelayMs * attempt);
      }
    }
  }

  async function worker(): Promise<void> {
    for (;;) {
      if (cancelled) break;
      if (pauseGate) await pauseGate;
      if (cancelled) break;
      const task = queue.shift();
      if (!task) break;
      await process(task);
    }
    active -= 1;
    settleDrainIfIdle();
  }

  function pump(): void {
    if (cancelled || pauseGate) return;
    status = "running";
    while (active < concurrency && queue.length > 0) {
      active += 1;
      void worker();
    }
    settleDrainIfIdle();
  }

  return {
    enqueue(task) {
      if (cancelled) return;
      queue.push(task);
      pump();
    },
    pause() {
      if (status !== "running") return;
      status = "paused";
      pauseGate = new Promise((resolve) => {
        releasePause = resolve;
      });
    },
    resume() {
      if (status !== "paused") return;
      releasePause?.();
      pauseGate = null;
      releasePause = null;
      pump();
    },
    cancel() {
      cancelled = true;
      queue.length = 0;
      status = "cancelled";
      releasePause?.();
      pauseGate = null;
      settleDrainIfIdle();
    },
    get status() {
      return status;
    },
    get pending() {
      return queue.length;
    },
    whenDrained() {
      return new Promise<void>((resolve) => {
        if (active === 0 && queue.length === 0) resolve();
        else drainWaiters.push(resolve);
      });
    },
  };
}
