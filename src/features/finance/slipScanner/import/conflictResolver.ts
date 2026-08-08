import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";
import type { Transaction } from "@/features/finance/types";

// Import Conflict Resolver (GS-032): when an incoming slip is a likely
// duplicate of an existing transaction, decide how to reconcile them. Pure
// policy + per-item / batch resolution + a field merge. The importer (GS-016)
// acts on the returned decisions.

export type ConflictResolution = "replace" | "skip" | "merge" | "keep-both";

export interface ImportConflict {
  candidate: SlipCandidate;
  existingId: number | null; // matched existing transaction, if any
  duplicateProbability: number; // from the Smart Duplicate Engine (GS-031)
}

export interface ConflictDecision {
  candidate: SlipCandidate;
  existingId: number | null;
  resolution: ConflictResolution;
}

export interface ResolveBatchOptions {
  applyToAll?: ConflictResolution; // batch resolution — one choice for every conflict
  overrides?: Map<string, ConflictResolution>; // per-candidate overrides (by candidate id)
}

// Default automatic policy from the duplicate probability: a near-certain
// duplicate is skipped; a merely-likely one is kept for the user to review.
export function defaultResolution(probability: number): ConflictResolution {
  if (probability >= 0.85) return "skip";
  return "keep-both";
}

export function resolveConflict(conflict: ImportConflict, override?: ConflictResolution): ConflictDecision {
  return {
    candidate: conflict.candidate,
    existingId: conflict.existingId,
    resolution: override ?? defaultResolution(conflict.duplicateProbability),
  };
}

export function resolveBatch(conflicts: ImportConflict[], options: ResolveBatchOptions = {}): ConflictDecision[] {
  return conflicts.map((conflict) =>
    resolveConflict(conflict, options.applyToAll ?? options.overrides?.get(conflict.candidate.id)),
  );
}

// Group decisions by the action the importer must take.
export function partitionDecisions(decisions: ConflictDecision[]): Record<ConflictResolution, ConflictDecision[]> {
  const groups: Record<ConflictResolution, ConflictDecision[]> = { replace: [], skip: [], merge: [], "keep-both": [] };
  for (const decision of decisions) groups[decision.resolution].push(decision);
  return groups;
}

// Merge a slip candidate into an existing transaction: keep the user's existing
// values, fill only the gaps from the slip (time, and a bank/reference note),
// so a merge never overwrites data the user may have edited.
export function mergeCandidate(existing: Transaction, candidate: SlipCandidate): Transaction {
  const noteParts = [candidate.bankName, candidate.reference].filter(
    (part): part is string => typeof part === "string" && part.trim() !== "",
  );
  return {
    ...existing,
    time: existing.time ?? candidate.time,
    note: existing.note && existing.note.trim() !== "" ? existing.note : noteParts.join(" · ") || existing.note,
  };
}
