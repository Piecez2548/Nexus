// Local Telemetry (PLT-019): collect app metrics — performance timings, error
// counts, memory samples, and startup time — entirely on-device. It NEVER sends
// anything online (no network calls here by construction); it's for local
// inspection / the developer tools only. Note: browser JS can't read CPU%, so
// "CPU" is represented by per-operation timing/throughput rather than a
// fabricated percentage.

export interface TimingStat {
  count: number;
  totalMs: number;
  avgMs: number;
}

export interface TelemetrySnapshot {
  timings: Record<string, TimingStat>;
  errors: number;
  errorSamples: string[];
  memory: { usedMB: number | null; peakMB: number | null };
  startupMs: number | null;
}

export interface LocalTelemetry {
  recordTiming: (name: string, ms: number) => void;
  time: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
  recordError: (message: string) => void;
  sampleMemory: () => void;
  recordStartup: (ms: number) => void;
  snapshot: () => TelemetrySnapshot;
  reset: () => void;
}

const MAX_ERROR_SAMPLES = 20;

function defaultNow(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export function createLocalTelemetry(now: () => number = defaultNow): LocalTelemetry {
  const timings = new Map<string, { count: number; totalMs: number }>();
  let errors = 0;
  let errorSamples: string[] = [];
  let usedMB: number | null = null;
  let peakMB: number | null = null;
  let startupMs: number | null = null;

  function recordTiming(name: string, ms: number): void {
    const t = timings.get(name) ?? { count: 0, totalMs: 0 };
    t.count += 1;
    t.totalMs += Math.max(0, ms);
    timings.set(name, t);
  }

  return {
    recordTiming,
    async time(name, fn) {
      const start = now();
      try {
        return await fn();
      } finally {
        recordTiming(name, now() - start);
      }
    },
    recordError(message) {
      errors += 1;
      errorSamples.push(message);
      if (errorSamples.length > MAX_ERROR_SAMPLES) errorSamples = errorSamples.slice(-MAX_ERROR_SAMPLES);
    },
    sampleMemory() {
      const mem = (performance as unknown as { memory?: { usedJSHeapSize?: number } }).memory;
      if (mem?.usedJSHeapSize) {
        usedMB = mem.usedJSHeapSize / (1024 * 1024);
        peakMB = Math.max(peakMB ?? 0, usedMB);
      }
    },
    recordStartup(ms) {
      startupMs = ms;
    },
    snapshot() {
      const out: Record<string, TimingStat> = {};
      for (const [name, t] of timings) {
        out[name] = { count: t.count, totalMs: t.totalMs, avgMs: t.count > 0 ? t.totalMs / t.count : 0 };
      }
      return { timings: out, errors, errorSamples: [...errorSamples], memory: { usedMB, peakMB }, startupMs };
    },
    reset() {
      timings.clear();
      errors = 0;
      errorSamples = [];
      usedMB = null;
      peakMB = null;
      startupMs = null;
    },
  };
}

// App-wide singleton.
export const localTelemetry = createLocalTelemetry();
