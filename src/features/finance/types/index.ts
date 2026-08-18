import type { SyncMeta } from "@/utils/syncMeta";

export type TransactionType =
  | "income"
  | "expense"
  | "transfer"
  | "refund"
  | "adjustment";

export type TransactionStatus = "completed" | "pending";

export type RecurringFrequency = "daily" | "weekly" | "monthly" | "yearly";

export interface RecurringInfo {
  frequency: RecurringFrequency;
}

export interface Transaction extends SyncMeta {
  id?: number;
  title: string;
  amount: number;
  type: TransactionType;
  account: string;
  toAccount?: string;
  category?: string;
  date: string;
  time?: string;
  tags?: string[];
  attachment?: string;
  note?: string;
  status?: TransactionStatus;
  recurring?: RecurringInfo | null;
  // Identifier used by the Rule Engine / Learning Engine to recognize a
  // recurring payee (e.g. a phone number or PromptPay ID) across visits.
  recipient?: string;
  favorite?: boolean;
}

// Quick Add: a reusable transaction template pinned for one-click entry
// (e.g. "Starbucks", "Netflix", "Rent") — separate from a starred/favorited
// transaction record. Clicking one pre-fills the transaction form; the user
// typically only needs to confirm or enter the amount.
export interface TransactionTemplate extends SyncMeta {
  id?: number;
  name: string;
  type: TransactionType;
  category?: string;
  account: string;
  toAccount?: string;
  amount?: number;
  recipient?: string;
  icon?: string;
  color?: string;
}

export type AccountType =
  | "cash"
  | "bank"
  | "credit_card"
  | "investment"
  | "crypto"
  | "loan"
  | "digital_wallet"
  | "other";

export interface Account extends SyncMeta {
  id?: number;
  name: string;
  type: AccountType;
  icon: string;
  color: string;
}

export type CategoryType = "income" | "expense";

export interface Category extends SyncMeta {
  id?: number;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
}

// Learning Engine: a per-user profile built from transaction history,
// keyed by recipient identifier (phone/PromptPay/etc). Once confident,
// the Rule Engine auto-applies its category to future transactions with
// the same recipient instead of asking again.
export interface RecipientProfile extends SyncMeta {
  id?: number;
  recipientKey: string;
  alias: string;
  category: string;
  account?: string;
  transactionCount: number;
  totalAmount: number;
  lastUsedDate: string;
  confidenceScore: number;
}

// Static/seeded lookup used as a fallback suggestion before a user has
// any transaction history of their own with a given recipient.
export interface Merchant {
  id?: number;
  name: string;
  category: string;
  icon?: string;
}

export type BudgetPeriod = "monthly" | "weekly" | "yearly";

export interface Budget extends SyncMeta {
  id?: number;
  category: string;
  amount: number;
  period: BudgetPeriod;
}

export interface Goal extends SyncMeta {
  id?: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  icon?: string;
  color?: string;
}

export type GoalMilestoneTier = 25 | 50 | 75 | 100;

// Logs the moment a Goal's progress crosses a 25/50/75/100% tier. Written
// once by goalMilestoneService.checkAndLogCrossings, never updated — read
// by the AI Analytics Financial Timeline. Logging starts from whenever this
// feature ships (no historical backfill, since only the current
// Goal.currentAmount snapshot exists — there's no record of past crossings).
export interface GoalMilestoneEvent extends SyncMeta {
  id?: number;
  goalSyncId: string; // Goal's own syncId — stable across devices, unlike local id
  goalName: string; // denormalized for display even if the Goal is later deleted
  tier: GoalMilestoneTier;
  reachedAt: string; // ISO timestamp, set once, never updated
}

// FIN-002 Net Worth. Deliberately NOT auto-derived from Account/Transaction
// data -- Account carries no balance field at all (name/type/icon/color
// only; nothing in this app computes a per-account balance anywhere), so
// there is no existing "account balance" to safely map onto an asset or
// liability. Modeled as its own manually-tracked entity instead, the same
// shape as Portfolio's Holding (a user-entered current value, no live price
// feed). One unified model with a `kind` discriminator rather than two
// near-identical Asset/Liability verticals, the same call already made for
// Vault's password/note/recoveryKey shapes.
export type NetWorthItemKind = "asset" | "liability";
export type AssetCategory = "cash" | "bank" | "investment" | "property" | "vehicle" | "crypto" | "other";
export type LiabilityCategory = "creditCard" | "loan" | "mortgage" | "other";
export type NetWorthCategory = AssetCategory | LiabilityCategory;

export interface NetWorthItem extends SyncMeta {
  id?: number;
  kind: NetWorthItemKind;
  name: string;
  category: NetWorthCategory;
  // Always a non-negative magnitude -- `kind` determines whether it adds to
  // or subtracts from net worth, so the sign is never encoded in the value
  // itself (a user mistyping a negative number would otherwise silently
  // flip which side of the ledger it lands on).
  value: number;
  icon: string;
  color: string;
  note?: string;
  createdAt: string;
}

// One row per calendar day, upserted by netWorthTrackingService whenever
// totals change as a side effect of adding/editing/deleting a NetWorthItem
// -- mirrors GoalMilestoneEvent's "log what already happened, no backfill"
// precedent above: history starts from whenever this feature ships, since
// there is no record of past asset/liability values to reconstruct.
export interface NetWorthSnapshot extends SyncMeta {
  id?: number;
  date: string; // "YYYY-MM-DD" local, via @/utils/localDate -- one row per day
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  recordedAt: string; // ISO timestamp of when this row was last written
}
