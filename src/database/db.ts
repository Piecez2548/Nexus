import Dexie from "dexie";
import type {
  Transaction,
  Account,
  Category,
  RecipientProfile,
  Merchant,
  Budget,
  Goal,
  TransactionTemplate,
} from "@/features/finance/types";
import type { Trade } from "@/features/trading/types";
import type { Todo } from "@/features/todo/types";
import type { Tombstone, SyncStateRow } from "@/features/sync/types";

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
  public syncTombstones;
  public syncState;

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

    this.syncTombstones =
      this.table<Tombstone, number>("syncTombstones");

    this.syncState =
      this.table<SyncStateRow, string>("syncState");
  }
}

export const db = new NexusDatabase();
