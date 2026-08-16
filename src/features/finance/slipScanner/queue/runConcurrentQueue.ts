export interface QueueSettleResult<T> {
  item: T;
  ok: boolean; // false once retries are exhausted
  attempts: number;
}

export interface ConcurrentQueueParams<T> {
  // The job source — pulled lazily so only ~concurrency items are ever in
  // flight (the source itself is the backpressure; nothing is buffered).
  source: AsyncIterable<T>;
  // Per-item work; throwing triggers a retry.
  handler: (item: T) => Promise<void>;
  concurrency: number;
  maxRetries: number;
  retryDelayMs: number;
  // Cooperative pause: workers await this before each pull, so a paused scan
  // stops taking new work while in-flight items finish.
  waitWhilePaused: () => Promise<void>;
  isCancelled: () => boolean;
  onSettled: (result: QueueSettleResult<T>) => void | Promise<void>;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// A concurrency-limited worker pool over an async source: N workers each pull
// one item at a time (pulls are serialized so a shared async iterator is
// never advanced re-entrantly), process it with bounded retries, then pull
// the next. Fast workers naturally pull more, so throughput self-balances —
// dynamic batching without fixed batch boundaries. Fully platform-independent
// (no DOM, no plugin): the scan orchestration supplies the source, handler,
// and pause/cancel hooks.
export async function runConcurrentQueue<T>(params: ConcurrentQueueParams<T>): Promise<void> {
  const iterator = params.source[Symbol.asyncIterator]();
  let pullChain: Promise<void> = Promise.resolve();
  let exhausted = false;

  function pull(): Promise<IteratorResult<T>> {
    const next = pullChain.then(() => iterator.next());
    pullChain = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  }

  async function processWithRetry(item: T): Promise<void> {
    for (let attempt = 1; ; attempt++) {
      if (params.isCancelled()) return;
      try {
        await params.handler(item);
        await params.onSettled({ item, ok: true, attempts: attempt });
        return;
      } catch {
        if (attempt > params.maxRetries) {
          await params.onSettled({ item, ok: false, attempts: attempt });
          return;
        }
        await delay(params.retryDelayMs * attempt);
      }
    }
  }

  async function worker(laneId: number): Promise<void> {
    for (;;) {
      await params.waitWhilePaused();
      if (params.isCancelled() || exhausted) return;

      // TEMPORARY perf-investigation instrumentation (gallery-scan speed
      // investigation, PERF task plan) — directly measures whether pull()
      // itself (the shared async-iterator chain) is a hidden serialization
      // point (Q10/Q11), independent of anything inside the handler. Remove
      // once confirmed/fixed.
      const pullStart = typeof performance !== "undefined" ? performance.now() : Date.now();
      const next = await pull();
      const pullMs = (typeof performance !== "undefined" ? performance.now() : Date.now()) - pullStart;
      console.debug(`[perf-investigation] queuePull lane=${laneId} pullMs=${Math.round(pullMs)} done=${next.done}`);
      if (next.done) {
        exhausted = true;
        return;
      }

      // Re-check after the (awaited) pull, so a pause/cancel that landed while
      // pulling is honored before starting work.
      await params.waitWhilePaused();
      if (params.isCancelled()) return;

      await processWithRetry(next.value);
    }
  }

  const lanes = Array.from({ length: Math.max(1, params.concurrency) }, (_, laneId) => worker(laneId));
  await Promise.all(lanes);
}
