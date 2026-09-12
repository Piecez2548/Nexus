-- generate_weekly_digests() deliberately runs with elevated privileges so
-- pg_cron can aggregate every eligible user's records. PostgreSQL grants
-- EXECUTE on new functions to PUBLIC by default, so revoke that implicit
-- client-callable path and leave execution to the database owner/cron role.
do $$
begin
  -- Older installations created this routine by applying schema.sql
  -- manually; a brand-new migration-only database may not have it yet.
  if to_regprocedure('public.generate_weekly_digests()') is not null then
    revoke execute on function public.generate_weekly_digests() from public;
    revoke execute on function public.generate_weekly_digests() from anon;
    revoke execute on function public.generate_weekly_digests() from authenticated;
  end if;
end $$;
