-- Supabase projects created after the original one no longer give the API
-- roles table privileges by default. On the current project the
-- authenticated role had only TRUNCATE/REFERENCES/TRIGGER on every app table,
-- so every sync request failed with "permission denied for table
-- synced_records" and data stayed on the device. Row-level security on each
-- table still limits a user to their own rows; this grant only lets those
-- policies apply. mfa_backup_code_attempts is left out on purpose: it is only
-- reached through the security-definer redeem_mfa_backup_code() function.
grant select, insert, update, delete on
  public.synced_records,
  public.user_encryption_keys,
  public.device_pairing_requests,
  public.mfa_backup_codes,
  public.automation_weekly_digests,
  public.ai_coach_daily_usage
to authenticated;
