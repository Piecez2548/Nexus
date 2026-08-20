import Dexie from "dexie";
import type {
  Transaction,
  Account,
  Category,
  RecipientProfile,
  Merchant,
  Budget,
  Goal,
  GoalMilestoneEvent,
  TransactionTemplate,
  NetWorthItem,
  NetWorthSnapshot,
  Subscription,
  BudgetPeriodSnapshot,
} from "@/features/finance/types";
import type { Trade, Strategy, WatchlistItem } from "@/features/trading/types";
import type { Todo } from "@/features/todo/types";
import type { Habit } from "@/features/habits/types";
import type { Holding } from "@/features/portfolio/types";
import type { CalendarEvent } from "@/features/calendar/types";
import type { ScheduleItem } from "@/features/schedule/types";
import type { Tombstone, SyncStateRow } from "@/features/sync/types";
import type { SlipScanRun, ScanCacheEntry, ScanCandidateEntry } from "@/features/finance/slipScanner/models/scanTypes";
import type { ImportHistoryEntry } from "@/features/finance/slipScanner/models/importHistory";
import type { VaultEntry } from "@/features/vault/types";
import type { AuditLogRow } from "@/features/security/auditLog";
import type { WorkoutExercise, WorkoutEntry } from "@/features/workouts/types";

class NexusDatabase extends Dexie {

  public transactions;
  public accounts;
  public categories;
  public trades;
  public recipientProfiles;
  public merchants;
  public budgets;
  public goals;
  public transactionTemplates;
  public todos;
  public habits;
  public holdings;
  public calendarEvents;
  public scheduleItems;
  public goalMilestoneEvents;
  public syncTombstones;
  public syncState;
  public slipScanRuns;
  public slipScanCache;
  public slipImportHistory;
  public vaultEntries;
  public auditLog;
  public workoutExercises;
  public workoutEntries;
  public netWorthItems;
  public netWorthSnapshots;
  public subscriptions;
  public budgetPeriodSnapshots;
  public slipScanCandidates;
  public strategies;
  public watchlistItems;

  constructor() {
    super("NexusDatabase");

    this.version(2).stores({
      transactions:
        "++id,title,amount,type,category,account,date",

      accounts:
        "++id,name",

      categories:
        "++id,name,type",
    });

    this.version(3).stores({
      transactions:
        "++id,title,amount,type,category,account,toAccount,date,status,*tags",

      accounts:
        "++id,name,type",

      categories:
        "++id,name,type",
    });

    this.version(4).stores({
      transactions:
        "++id,title,amount,type,category,account,toAccount,date,status,*tags",

      accounts:
        "++id,name,type",

      categories:
        "++id,name,type",

      trades:
        "++id,symbol,market,direction,status,entryDate,strategy,*tags",
    });

    this.version(5).stores({
      transactions:
        "++id,title,amount,type,category,account,toAccount,date,status,recipient,*tags",

      accounts:
        "++id,name,type",

      categories:
        "++id,name,type",

      trades:
        "++id,symbol,market,direction,status,entryDate,strategy,*tags",

      recipientProfiles:
        "++id,&recipientKey,category",

      merchants:
        "++id,&name,category",

      budgets:
        "++id,&category,period",

      goals:
        "++id,name",
    });

    this.version(6).stores({
      transactionTemplates:
        "++id,name,type,category,account",
    });

    this.version(7).stores({
      todos:
        "++id,completed,dueDate,priority",
    });

    this.version(8).stores({
      transactions:
        "++id,title,amount,type,category,account,toAccount,date,status,recipient,*tags,syncId,updatedAt",

      accounts:
        "++id,name,type,syncId,updatedAt",

      categories:
        "++id,name,type,syncId,updatedAt",

      trades:
        "++id,symbol,market,direction,status,entryDate,strategy,*tags,syncId,updatedAt",

      recipientProfiles:
        "++id,&recipientKey,category,syncId,updatedAt",

      budgets:
        "++id,&category,period,syncId,updatedAt",

      goals:
        "++id,name,syncId,updatedAt",

      transactionTemplates:
        "++id,name,type,category,account,syncId,updatedAt",

      todos:
        "++id,completed,dueDate,priority,syncId,updatedAt",

      syncTombstones:
        "++id,table,syncId,deletedAt",

      syncState:
        "&key",
    });

    // Encryption-at-rest (opt-in — see src/features/encryption): once a row
    // is encrypted, its business fields live inside one opaque
    // `encryptedContent` blob and can no longer be indexed directly, so
    // those per-field indexes are dropped here. This is purely an index
    // trim — Dexie only stops maintaining these indexes, it does not alter
    // any row's stored content — so it's safe to ship independently of and
    // before the actual opt-in migration that rewrites row shapes.
    // `&recipientKey` and `&category` are kept: those two fields
    // deliberately stay plaintext (see encryptedRepository.ts) to preserve
    // their unique-index lookups.
    this.version(9).stores({
      transactions:
        "++id,syncId,updatedAt",

      accounts:
        "++id,syncId,updatedAt",

      categories:
        "++id,syncId,updatedAt",

      trades:
        "++id,syncId,updatedAt",

      recipientProfiles:
        "++id,&recipientKey,syncId,updatedAt",

      budgets:
        "++id,&category,syncId,updatedAt",

      goals:
        "++id,syncId,updatedAt",

      transactionTemplates:
        "++id,syncId,updatedAt",

      todos:
        "++id,syncId,updatedAt",
    });

    // Purely additive — new table, no existing data touched.
    this.version(10).stores({
      habits:
        "++id,syncId,updatedAt",
    });

    // Purely additive — new table, no existing data touched.
    this.version(11).stores({
      holdings:
        "++id,syncId,updatedAt",
    });

    // Purely additive — new table, no existing data touched.
    this.version(12).stores({
      calendarEvents:
        "++id,syncId,updatedAt",
    });

    // Purely additive — new table, no existing data touched.
    this.version(13).stores({
      scheduleItems:
        "++id,syncId,updatedAt",
    });

    // Purely additive — new table, no existing data touched.
    this.version(14).stores({
      goalMilestoneEvents:
        "++id,syncId,updatedAt",
    });

    // Gallery Scanner (GS-006) — device-local, NOT synced (no syncId): each
    // device scans its own gallery. slipScanRuns is the resumable scan
    // session/checkpoint; slipScannedAssets powers incremental scan (by
    // assetId) and duplicate prevention (by contentHash). Purely additive.
    this.version(15).stores({
      slipScanRuns:
        "++id,status,startedAt",

      slipScannedAssets:
        "++id,&assetId,contentHash,runId",
    });

    // Gallery Scanner (GS-008) — the GS-006 slipScannedAssets store is
    // superseded by a versioned production scan cache. Drop the old table
    // (rebuildable, unreleased) and create slipScanCache with the richer
    // shape (last-modified, status, ocr/payload/parser versions, failure
    // count). Additive to history; a fresh DB just lands on slipScanCache.
    this.version(16).stores({
      slipScannedAssets: null,

      slipScanCache:
        "++id,&assetId,contentHash,status",
    });

    // v17 adds slipImportHistory (GS-035): a device-local log of Smart Import
    // runs (date/source/bank/amount/status/duration/errors) for the Import
    // History view. Additive — a fresh DB just creates it.
    this.version(17).stores({
      slipImportHistory:
        "++id,importedAt,status,bank",
    });

    // v18 adds vaultEntries (VAULT-001..004): password manager / secure
    // notes / recovery keys, one unified entry shape. Always encrypted (see
    // vaultEntryRepository.ts) — no plaintext-indexed fields, so no field
    // beyond the standard syncId/updatedAt needs an index. Additive.
    this.version(18).stores({
      vaultEntries:
        "++id,syncId,updatedAt",
    });

    // v19 adds auditLog (SEC-002): a persisted, device-local, append-only
    // security audit trail (see src/features/security/auditLog.ts). Deliberately
    // NOT synced (no syncId) -- diagnostic/operational data local to this
    // device, like slipScanRuns/slipImportHistory above, not personal content
    // to carry across devices. Additive.
    this.version(19).stores({
      auditLog:
        "++id,at,type",
    });

    // v20 adds the Workout Tracker (catalog + log, mirrors Category +
    // Transaction rather than Habit's single-table shape -- see
    // src/features/workouts/types/index.ts). `workoutEntries` indexes `date`
    // for cheap "logged on this day" lookups; route points (GPS-tracked
    // entries) live inline on the row, same pattern as Habit.completedDates.
    // Additive, no existing data touched.
    this.version(20).stores({
      workoutExercises:
        "++id,syncId,updatedAt",

      workoutEntries:
        "++id,date,syncId,updatedAt",
    });

    // v21 adds Net Worth (FIN-002): netWorthItems (assets/liabilities, one
    // unified model with a `kind` discriminator -- see
    // src/features/finance/types/index.ts) and netWorthSnapshots (a
    // date-keyed history log, one row per calendar day, upserted whenever
    // totals change -- mirrors goalMilestoneEvents' "log what happened, no
    // backfill" shape). Additive, no existing data touched.
    this.version(21).stores({
      netWorthItems:
        "++id,syncId,updatedAt",

      netWorthSnapshots:
        "++id,date,syncId,updatedAt",
    });

    // v22 adds the Subscription Manager (FIN-004): a manually-tracked
    // entity independent of both existing subscription *detectors* (see
    // src/features/finance/types/index.ts) -- status/nextBillingDate/note
    // have no equivalent in a derived view. No per-field index beyond the
    // standard synced-and-encrypted shape (business-field filtering, e.g.
    // by status, happens in-memory in the store/hook, matching every other
    // small entity table's own convention). Additive, no existing data
    // touched.
    this.version(22).stores({
      subscriptions:
        "++id,syncId,updatedAt",
    });

    // v23 adds FIN-001 Budget Improvements: budgetPeriodSnapshots, an
    // upsert-by-(budgetSyncId, periodStart) history log of each budget's
    // past-period performance -- see src/features/finance/types/index.ts.
    // Unlike the write-once GoalMilestoneEvent log, a period's spend can be
    // recomputed many times before it ends, so this mirrors NetWorthSnapshot's
    // upsert shape instead. Additive, no existing data touched.
    this.version(23).stores({
      budgetPeriodSnapshots:
        "++id,syncId,updatedAt",
    });

    // v24 adds slipScanCandidates (BUG-05 fix): persists each extracted slip
    // candidate as soon as it's produced, mirroring slipScanCache's per-asset
    // persistence. Without this, a candidate extracted by an interrupted scan
    // (app kill, crash, reload) was held only in transient React state and
    // permanently lost -- while the asset itself was already marked "scanned"
    // in slipScanCache, so a resume would skip re-extracting it too. Device-
    // local, not synced (no syncId), like slipScanRuns/slipScanCache. Additive,
    // no existing data touched.
    this.version(24).stores({
      slipScanCandidates:
        "++id,runId,assetId",
    });

    // v25 adds the Strategy Library / Playbook: user-authored reference
    // entries documenting a trading strategy's rules (distinct from
    // Trade.strategy, a free-text label on individual trades -- see
    // src/features/trading/types/index.ts). No unique-name constraint --
    // strategy names may legitimately repeat across variations, so `name`
    // is a plain index, not `&name`. Additive, no existing data touched.
    this.version(25).stores({
      strategies:
        "++id,syncId,updatedAt",
    });

    // v26 adds the trading Watchlist: symbols the user is tracking, no live
    // price of any kind (this app has no price feed, paid or otherwise --
    // see Holdings' own manual-price precedent). Additive, no existing data
    // touched.
    this.version(26).stores({
      watchlistItems:
        "++id,symbol,syncId,updatedAt",
    });

    this.transactions =
      this.table<Transaction, number>("transactions");

    this.accounts =
      this.table<Account, number>("accounts");

    this.categories =
      this.table<Category, number>("categories");

    this.trades =
      this.table<Trade, number>("trades");

    this.recipientProfiles =
      this.table<RecipientProfile, number>("recipientProfiles");

    this.merchants =
      this.table<Merchant, number>("merchants");

    this.budgets =
      this.table<Budget, number>("budgets");

    this.goals =
      this.table<Goal, number>("goals");

    this.transactionTemplates =
      this.table<TransactionTemplate, number>("transactionTemplates");

    this.todos =
      this.table<Todo, number>("todos");

    this.habits =
      this.table<Habit, number>("habits");

    this.holdings =
      this.table<Holding, number>("holdings");

    this.calendarEvents =
      this.table<CalendarEvent, number>("calendarEvents");

    this.scheduleItems =
      this.table<ScheduleItem, number>("scheduleItems");

    this.goalMilestoneEvents =
      this.table<GoalMilestoneEvent, number>("goalMilestoneEvents");

    this.syncTombstones =
      this.table<Tombstone, number>("syncTombstones");

    this.syncState =
      this.table<SyncStateRow, string>("syncState");

    this.slipScanRuns =
      this.table<SlipScanRun, number>("slipScanRuns");

    this.slipScanCache =
      this.table<ScanCacheEntry, number>("slipScanCache");

    this.slipImportHistory =
      this.table<ImportHistoryEntry, number>("slipImportHistory");

    this.vaultEntries =
      this.table<VaultEntry, number>("vaultEntries");

    this.auditLog =
      this.table<AuditLogRow, number>("auditLog");

    this.workoutExercises =
      this.table<WorkoutExercise, number>("workoutExercises");

    this.workoutEntries =
      this.table<WorkoutEntry, number>("workoutEntries");

    this.netWorthItems =
      this.table<NetWorthItem, number>("netWorthItems");

    this.netWorthSnapshots =
      this.table<NetWorthSnapshot, number>("netWorthSnapshots");

    this.subscriptions =
      this.table<Subscription, number>("subscriptions");

    this.budgetPeriodSnapshots =
      this.table<BudgetPeriodSnapshot, number>("budgetPeriodSnapshots");

    this.slipScanCandidates =
      this.table<ScanCandidateEntry, number>("slipScanCandidates");

    this.strategies =
      this.table<Strategy, number>("strategies");

    this.watchlistItems =
      this.table<WatchlistItem, number>("watchlistItems");
  }
}

export const db = new NexusDatabase();
