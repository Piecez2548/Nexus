export type TimerPhase = "work" | "rest";
export type TimerStatus = "idle" | "running" | "paused" | "complete";

export interface TimerConfig {
  workSeconds: number;
  restSeconds: number;
  totalRounds: number;
}

export interface TimerState {
  status: TimerStatus;
  phase: TimerPhase;
  currentRound: number; // 1-indexed
  runStartedAt: number | null; // epoch ms the current running segment began; null when paused/idle/complete
  bankedActiveMs: number; // total active (non-paused) ms for the whole session, excluding the in-progress segment
  phaseBankedActiveMsAtStart: number; // snapshot of bankedActiveMs when the current phase began
  config: TimerConfig;
}

export interface TimerFinishResult {
  totalElapsedSeconds: number;
  roundsCompleted: number;
}
