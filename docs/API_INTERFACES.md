# API Interfaces

**Last Updated:** 2026-08-02

## Overview

Nexus has no HTTP API of its own — there is no backend server (see [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md)). "Interfaces" here means the shared TypeScript contracts that cross module boundaries: the repository/service factory shapes every feature builds on, the sync/encryption DTOs, and the AI Gateway's request/response types (designed for a future real API, not wired to one today). Feature-internal types (`Transaction`, `Trade`, `Habit`, etc.) live in each module's own `types/index.ts` and are documented per-module in [MODULES.md](MODULES.md), not repeated here.

## Shared Interfaces

### `SyncMeta` — `src/utils/syncMeta.ts`

Mixed into every synced entity. Dexie's own auto-increment `id` is only unique per-device, so `syncId` (a UUID) is the actual cross-device identity used as the cloud primary key.

```ts
interface SyncMeta {
  syncId?: string;
  updatedAt?: string;
  deletedAt?: string;
}

function withSyncMeta<T extends SyncMeta>(entity: T): T; // stamps syncId (if absent) + fresh updatedAt
```

### `AsyncState` — `src/utils/asyncState.ts`

Not generic — a single fixed shape spread into every entity store's initial state.

```ts
interface AsyncState { loading: boolean; error: string | null; }
const initialAsyncState: AsyncState = { loading: false, error: null };
function toErrorMessage(err: unknown, fallback?: string): string; // normalizes Error and Supabase PostgrestError shapes
```

### `TranslateFn` — `src/i18n/useTranslation.ts`

The i18n contract threaded through every Zod schema factory and several async utility functions (`enableEncryption`, `reescrowDek`, `importBackup`, ...).

```ts
type TranslateFn = (key: string, params?: Record<string, string | number>) => string;
```

## Repository / Service Interface Contracts

The app's real internal "API" — every feature module's persistence layer conforms to one of these two shapes.

```ts
// src/database/createRepository.ts
function createRepository<T extends SyncMeta & { id?: number }>(
  table: Table<T, number>,
  tableName: SyncTableName,
  options?: { plaintextKeys?: (keyof T)[] }
): {
  getAll: () => Promise<T[]>;
  add: (entity: T) => Promise<number>;
  update: (id: number, entity: T) => Promise<number>;
  remove: (id: number) => Promise<void>;       // also records a Tombstone
  decryptOptional: (row: T | undefined) => Promise<T | undefined>;
};

// src/database/createCrudService.ts
function createCrudService<T>(repository: {
  getAll: () => Promise<T[]>; add: (item: T) => Promise<number>;
  update: (id: number, item: T) => Promise<number>; remove: (id: number) => Promise<void>;
}): {
  list: () => Promise<T[]>;
  create: (item: T) => Promise<number>;
  update: (id: number, item: T) => Promise<number>;
  remove: (id: number) => Promise<void>;
};
```

Used by ~12 repositories / ~9 services; the repositories/services that intentionally implement a *different* shape (`merchantRepository` — read-only; `goalMilestoneEventRepository` — no `update`, extra `getForGoal`; `accountService`/`categoryService`/`recipientProfileService` — real extra logic) are listed in [DEPENDENCY_GRAPH.md](DEPENDENCY_GRAPH.md) and [MODULES.md](MODULES.md).

## DTOs — Sync

`src/features/sync/types.ts`:

```ts
type SyncTableName = "transactions" | "accounts" | "categories" | "recipientProfiles"
  | "budgets" | "goals" | "transactionTemplates" | "trades" | "todos" | "habits"
  | "holdings" | "calendarEvents" | "scheduleItems" | "goalMilestoneEvents";
  // merchants deliberately excluded — reference/seed data, not personal

interface Tombstone { id?: number; table: SyncTableName; syncId: string; deletedAt: string; }
interface SyncStateRow { key: string; value: string; }
```

**Request/response shape against Supabase** (not a hand-defined interface — the literal shape of a `synced_records` row, see [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)):

```ts
{ id: string /* = syncId */; table_name: SyncTableName; user_id: string;
  data: Record<string, unknown>; updated_at: string; deleted_at: string | null }
```

## DTOs — Encryption

`src/features/encryption/crypto/encryption.ts`:

```ts
interface EncryptedEnvelope { v: number; iv: string; ct: string; }   // AES-GCM, base64 IV + ciphertext+tag
interface WrappedKey { wrapped: string; iv: string; }

function deriveKek(secret: string, salt: string, iterations?: number): Promise<CryptoKey>;
function generateDek(): Promise<CryptoKey>;
function wrapDek(dek: CryptoKey, kek: CryptoKey): Promise<WrappedKey>;
function unwrapDek(wrapped: WrappedKey, kek: CryptoKey): Promise<CryptoKey>;
function encryptField(dek: CryptoKey, data: unknown): Promise<EncryptedEnvelope>;
function decryptField<T>(dek: CryptoKey, envelope: EncryptedEnvelope): Promise<T>;
```

Server-side escrow row shape (`public.user_encryption_keys`, see [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)): `{user_id, wrapped_dek, dek_iv, escrow_salt, escrow_iterations, created_at}`.

## DTOs — AI Gateway (`src/ai/`) — designed, not wired into any feature

These are real, fully-typed interfaces — but zero feature code imports them today (confirmed via repo-wide grep). Documented here as the seam a future real-LLM integration would use; see [AI_ANALYTICS.md](AI_ANALYTICS.md) and [DECISIONS.md](DECISIONS.md).

```ts
// src/ai/models/AIContext.ts
interface AIContext { domain?: string; data?: Record<string, unknown>; }

// src/ai/models/AIRequest.ts — the "request object"
interface AIRequest {
  prompt: string; systemPrompt?: string; context?: AIContext;
  temperature?: number; maxTokens?: number;
  metadata?: Record<string, unknown>; sessionId?: string;
}

// src/ai/models/AIResponse.ts — the "response object"
interface TokenUsage { promptTokens: number; completionTokens: number; totalTokens: number; }
interface AIResponse {
  content: string; confidence: number; provider: string; executionTimeMs: number;
  tokenUsage?: TokenUsage; metadata?: Record<string, unknown>;
}

// src/ai/models/ProviderConfiguration.ts
interface RetryPolicy { maxRetries: number; backoffMs: number; }
interface ProviderConfiguration {
  providerName: string; apiKey?: string; endpoint?: string; model?: string;
  timeoutMs?: number; retryPolicy?: RetryPolicy; temperature?: number;
  extra?: Record<string, unknown>; // named escape hatch, not an index signature — keeps typed fields typo-safe
}

// src/ai/interfaces/AIProvider.ts — the interface a real LLM provider would implement
interface AIProvider {
  readonly name: string;
  initialize(config: ProviderConfiguration): Promise<void>;
  isAvailable(): Promise<boolean>;
  analyze(request: AIRequest): Promise<AIResponse>;
  summarize(request: AIRequest): Promise<AIResponse>;
  chat(request: AIRequest): Promise<AIResponse>;
  generateRecommendations(request: AIRequest): Promise<AIResponse>;
  shutdown(): Promise<void>;
}
```

## Models — AI Analytics engine (the app's largest internal type surface)

`src/features/finance/aiAnalytics/models/index.ts` re-exports 13 model files (`enums`, `financial-health.model`, `financial-snapshot.model`, `category-analysis.model`, `merchant-analysis.model`, `behavior-analysis.model`, `budget-analysis.model`, `cashflow-analysis.model`, `forecast.model`, `recommendation.model`, `insight.model`, `statistics.model`, `timeline.model`) — the module's own header comment describes this barrel as "the single import path a future API layer or AI provider integration consumes this engine's types through." The top-level `FinancialAnalysisInput` / `FinancialAnalysisResult` / `FinancialIntelligenceEngine` contract (`aiAnalytics/types.ts`) is the batch pipeline's own request/response pair — see [AI_ANALYTICS.md](AI_ANALYTICS.md) for the full field-by-field breakdown, which is too large to usefully duplicate here.

## Current Status

All contracts above are implemented and in active use except the AI Gateway DTOs (`AIRequest`/`AIResponse`/`AIProvider`/`ProviderConfiguration`), which are fully built and tested but not consumed anywhere yet.

## Future Improvements

If a real backend or LLM provider is ever integrated, the `AIProvider` interface and the service-layer swap point (see [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md)'s "Future Backend Architecture") are the two seams designed in advance for it.
