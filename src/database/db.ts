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
} from "@/features/finance/types";
import type { Trade } from "@/features/trading/types";
import type { Todo } from "@/features/todo/types";
import type { Habit } from "@/features/habits/types";
import type { Holding } from "@/features/portfolio/types";
import type { CalendarEvent } from "@/features/calendar/types";
import type { ScheduleItem } from "@/features/schedule/types";
import type { Tombstone, SyncStateRow } from "@/features/sync/types";
import type { SlipScanRun, SlipScannedAsset } from "@/features/finance/slipScanner/models/scanTypes";

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
  public slipScannedAssets;

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

    this.slipScannedAssets =
      this.table<SlipScannedAsset, number>("slipScannedAssets");
  }
}

export const db = new NexusDatabase();
