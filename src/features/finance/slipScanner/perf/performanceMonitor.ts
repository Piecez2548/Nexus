// Performance Monitor (GS-036): per-stage runtime timing (QR / OCR / scan
// speed), cache-hit ratio, and memory sampling — complements GS-018's per-run
// counters and GS-020's cross-run analytics by measuring *how long each stage
// takes*. Note: browser JS cannot read CPU%, so "CPU" is represented honestly
// by per-stage throughput (ops/sec) rather than a fabricated percentage. Memory
// is sampled from `performance.memory` where available (Chromium), else null.

export type PerfStage = "qr" | "ocr" | "scan";

export interface StageStats {
  count: number;
  avgMs: number;
  perSec: number; // throughput (a CPU/work-rate proxy)
}

export interface PerfSnapshot {
  qr: StageStats;
  ocr: StageStats;
  scan: StageStats;
  cacheHitRatio: number;
  memory: { usedMB: number | null; peakMB: number | null };
}

interface Timing {
  count: number;
  totalMs: number;
}

export interface PerformanceMonitor {
  time: <T>(stage: PerfStage, fn: () => Promise<T>) => Promise<T>;
  record: (stage: PerfStage, ms: number) => void;
  setCacheHitRatio: (ratio: number) => void;
  sampleMemory: () => void;
  snapshot: () => PerfSnapshot;
  reset: () => void;
}

function defaultNow(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export function createPerformanceMonitor(now: () => number = defaultNow): PerformanceMonitor {
  const timings: Record<PerfStage, Timing> = {
    qr: { count: 0, totalMs: 0 },
    ocr: { count: 0, totalMs: 0 },
    scan: { count: 0, totalMs: 0 },
  };
  let cacheHitRatio = 0;
  let usedMB: number | null = null;
  let peakMB: number | null = null;

  function record(stage: PerfStage, ms: number): void {
    timings[stage].count += 1;
    timings[stage].totalMs += Math.max(0, ms);
  }

  function stageStats(stage: PerfStage): StageStats {
    const { count, totalMs } = timings[stage];
    return {
      count,
      avgMs: count > 0 ? totalMs / count : 0,
      perSec: totalMs > 0 ? count / (totalMs / 1000) : 0,
    };
  }

  return {
    async time(stage, fn) {
      const start = now();
      try {
        return await fn();
      } finally {
        record(stage, now() - start);
      }
    },
    record,
    setCacheHitRatio(ratio) {
      cacheHitRatio = ratio;
    },
    sampleMemory() {
      const mem = (performance as unknown as { memory?: { usedJSHeapSize?: number } }).memory;
      if (mem?.usedJSHeapSize) {
        usedMB = mem.usedJSHeapSize / (1024 * 1024);
        peakMB = Math.max(peakMB ?? 0, usedMB);
      }
    },
    snapshot() {
      return {
        qr: stageStats("qr"),
        ocr: stageStats("ocr"),
        scan: stageStats("scan"),
        cacheHitRatio,
        memory: { usedMB, peakMB },
      };
    },
    reset() {
      for (const stage of Object.keys(timings) as PerfStage[]) timings[stage] = { count: 0, totalMs: 0 };
      cacheHitRatio = 0;
      usedMB = null;
      peakMB = null;
    },
  };
}
