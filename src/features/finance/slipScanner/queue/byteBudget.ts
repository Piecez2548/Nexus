// Memory protection for the scan queue: a byte semaphore that caps the total
// image bytes held in flight across all workers at once. A worker acquires
// its image's estimated size before reading it into memory and releases after
// processing, so a huge gallery (or a burst of large images) can never blow
// past the budget regardless of how many workers are running. This is also
// what makes batching "dynamic" — the effective in-flight count adapts to
// image size (many small images or few large ones fit the same budget).
export class ByteBudget {
  private available: number;
  private readonly max: number;
  private readonly waiters: Array<{ need: number; resolve: () => void }> = [];

  constructor(max: number) {
    this.max = Math.max(1, max);
    this.available = this.max;
  }

  // Reserves `bytes` (clamped to the budget so a single oversized image can
  // consume the whole budget but never deadlock by needing more than exists).
  async acquire(bytes: number): Promise<void> {
    const need = Math.min(Math.max(0, bytes), this.max);
    if (this.available >= need) {
      this.available -= need;
      return;
    }
    await new Promise<void>((resolve) => this.waiters.push({ need, resolve }));
  }

  release(bytes: number): void {
    const amount = Math.min(Math.max(0, bytes), this.max);
    this.available += amount;
    // Wake waiters (FIFO) that now fit, deducting on their behalf so the
    // acquire() that was parked doesn't double-subtract.
    while (this.waiters.length > 0 && this.available >= this.waiters[0].need) {
      const waiter = this.waiters.shift();
      if (!waiter) break;
      this.available -= waiter.need;
      waiter.resolve();
    }
  }
}
