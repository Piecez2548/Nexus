import { supabase } from "@/lib/supabaseClient";
import type { WeeklyDigest } from "@/features/automation/types";

// Reads/writes public.automation_weekly_digests (supabase/schema.sql) --
// same "treat a read failure as nothing to show, never throw" convention
// backupCodes.ts already uses, since a missing digest is a completely
// normal, expected state (no cron run yet, or an encrypted account that
// will never get one), not an error condition worth surfacing.
export async function getLatestUnseenDigest(userId: string): Promise<WeeklyDigest | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("automation_weekly_digests")
    .select("id, period_start, period_end, income, expense, net, transaction_count")
    .eq("user_id", userId)
    .is("seen_at", null)
    .order("period_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export async function markDigestSeen(id: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("automation_weekly_digests").update({ seen_at: new Date().toISOString() }).eq("id", id);
}
