-- Resolve the live Supabase security/performance advisor findings without
-- changing row ownership semantics.  The SELECT wrapper lets PostgreSQL cache
-- auth.uid() once per statement instead of re-evaluating it for every row.

alter function public.set_synced_records_updated_at() set search_path = '';

alter policy "Users can manage their own records" on public.synced_records
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter policy "Users manage their own key" on public.user_encryption_keys
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter policy "Users manage their own backup codes" on public.mfa_backup_codes
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter policy "Users manage their own AI Coach usage" on public.ai_coach_daily_usage
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter policy "Users manage their own pairing requests" on public.device_pairing_requests
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
