-- Nexus cloud sync schema.
-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
--
-- Dashboard-only setup this file can't do for you: Authentication > Email
-- Templates > "Confirm signup" must include the {{ .Token }} variable, or
-- sign-up emails will only carry a confirmation link, not the 6-digit OTP
-- code the app's sign-up flow asks the user to enter.
--
-- One generic table holds every synced entity type as a JSON payload,
-- keyed by (id, table_name). The client always reads/writes local
-- IndexedDB first — this table exists purely to relay changes between a
-- user's own devices, never queried directly for display.

create table if not exists public.synced_records (
  id uuid not null,
  table_name text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (id, table_name)
);

create index if not exists synced_records_user_table_updated_idx
  on public.synced_records (user_id, table_name, updated_at);

alter table public.synced_records enable row level security;

drop policy if exists "Users can manage their own records" on public.synced_records;

create policy "Users can manage their own records"
  on public.synced_records
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- The client always sends its own `updated_at` in the upsert payload (its
-- own device clock), which bypasses the `default now()` above entirely —
-- and every device's pull cursor is "give me everything with updated_at >=
-- the last row I saw." If one device's clock runs even slightly behind
-- another's, anything it writes (including a deletion) can land with a
-- timestamp "before" the other device's already-advanced cursor, making it
-- permanently invisible to that device no matter how many times it
-- resyncs. This trigger makes the column authoritative from Postgres's own
-- clock — identical for every request regardless of which device sent it
-- — so the pull cursor is immune to client clock skew.
create or replace function public.set_synced_records_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_synced_records_updated_at on public.synced_records;

create trigger set_synced_records_updated_at
  before insert or update on public.synced_records
  for each row
  execute function public.set_synced_records_updated_at();

-- One-time nudge for rows already stuck behind a skewed device's cursor
-- from before this trigger existed — a no-op update still fires the
-- trigger above, refreshing every row's updated_at to the server's clock
-- so pending changes (including deletions) can finally be seen.
update public.synced_records set updated_at = updated_at;

-- Encryption-at-rest: escrows a copy of each user's Data Encryption Key
-- (DEK), wrapped with a key derived from their account password, so a
-- forgotten PIN can still be recovered by signing back in (see
-- src/features/encryption/migration/enableEncryption.ts and
-- src/features/encryption/recovery/recoverDekFromEscrow.ts). RLS scopes
-- every row strictly to its own owner — Supabase itself never sees the
-- plaintext DEK, only the wrapped (AES-GCM ciphertext) form.
create table if not exists public.user_encryption_keys (
  user_id uuid primary key references auth.users(id) on delete cascade,
  wrapped_dek text not null,
  dek_iv text not null,
  escrow_salt text not null,
  escrow_iterations int not null,
  created_at timestamptz not null default now()
);

alter table public.user_encryption_keys enable row level security;

drop policy if exists "Users manage their own key" on public.user_encryption_keys;

create policy "Users manage their own key" on public.user_encryption_keys
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Two-factor authentication: TOTP backup/recovery codes. Generated once at
-- enrollment (and on regeneration), shown to the user exactly once in
-- plaintext, stored here only as a salted hash -- reuses the same
-- salted-SHA-256 approach as src/features/lock/utils/pinHash.ts, appropriate
-- here because a backup code is already a high-entropy random secret
-- (unlike a human-chosen PIN). Verified entirely client-side, same as every
-- other client-verified secret in this app -- there is no custom backend
-- anywhere in Nexus (see docs/PROJECT_ARCHITECTURE.md). TOTP factor
-- enrollment itself lives entirely in Supabase Auth's own tables
-- (auth.mfa_factors), not here -- this table is only the custom recovery
-- mechanism Supabase's native MFA API doesn't provide.
create table if not exists public.mfa_backup_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null,
  salt text not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists mfa_backup_codes_user_idx on public.mfa_backup_codes (user_id);

alter table public.mfa_backup_codes enable row level security;

drop policy if exists "Users manage their own backup codes" on public.mfa_backup_codes;

create policy "Users manage their own backup codes" on public.mfa_backup_codes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- AI Coach -- Anthropic Claude fallback (see supabase/functions/ai-coach).
-- Tracks how many ai-coach requests each user has made today, so the Edge
-- Function can enforce a per-user daily cap without ever touching a
-- service-role key. increment_ai_coach_usage() below runs SECURITY INVOKER
-- (the Postgres default, spelled out here for clarity) -- i.e. as the
-- calling user -- so the same auth.uid() = user_id RLS policy every other
-- table in this file uses protects this one too: a user can only ever
-- see/increment their own row, there is no cross-user read/write path, and
-- there is no service-role bypass anywhere in this feature.
create table if not exists public.ai_coach_daily_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  usage_date date not null default ((now() at time zone 'utc')::date),
  request_count int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

alter table public.ai_coach_daily_usage enable row level security;

drop policy if exists "Users manage their own AI Coach usage" on public.ai_coach_daily_usage;

create policy "Users manage their own AI Coach usage"
  on public.ai_coach_daily_usage
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Atomic increment-and-return: a single upsert, so concurrent requests from
-- the same user serialize on Postgres's own row lock instead of racing a
-- separate count-then-insert (which could let a user briefly exceed the
-- cap under concurrency). SECURITY INVOKER means this function has no more
-- power than the calling user already has via RLS above -- it is not a
-- service-role bypass, just a way to make "increment my own row" atomic.
create or replace function public.increment_ai_coach_usage()
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_count int;
begin
  insert into public.ai_coach_daily_usage (user_id, usage_date, request_count)
  values (auth.uid(), (now() at time zone 'utc')::date, 1)
  on conflict (user_id, usage_date)
  do update set request_count = public.ai_coach_daily_usage.request_count + 1,
                updated_at = now()
  returning request_count into new_count;

  return new_count;
end;
$$;

-- Automation -- weekly financial digest, server-computed even while the
-- app is closed (see docs/DECISIONS.md for why this is scoped to
-- non-encrypted accounts only). Rows are written exclusively by
-- generate_weekly_digests() below -- never by the client.
create table if not exists public.automation_weekly_digests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  income numeric not null,
  expense numeric not null,
  net numeric not null,
  transaction_count int not null,
  seen_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, period_start)
);

create index if not exists automation_weekly_digests_user_idx on public.automation_weekly_digests (user_id, period_start);

alter table public.automation_weekly_digests enable row level security;

drop policy if exists "Users read their own weekly digests" on public.automation_weekly_digests;
create policy "Users read their own weekly digests" on public.automation_weekly_digests
  for select using (auth.uid() = user_id);

drop policy if exists "Users mark their own weekly digests seen" on public.automation_weekly_digests;
create policy "Users mark their own weekly digests seen" on public.automation_weekly_digests
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Deliberately no insert/delete policy for the authenticated role -- only
-- generate_weekly_digests() (SECURITY DEFINER, below) ever creates rows;
-- a user must never be able to fabricate their own digest.

-- SECURITY DEFINER (unlike increment_ai_coach_usage()'s SECURITY INVOKER
-- above): this function's whole job is computing a digest for EVERY
-- eligible user in one pass, which requires reading across user
-- boundaries no RLS-respecting invoker role could ever do. Pinned
-- search_path per Postgres's own SECURITY DEFINER hardening guidance.
-- Defensive regex guards below exist because ONE malformed row must never
-- abort every other user's digest in the same batch.
create or replace function public.generate_weekly_digests()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period_end date := current_date;
  v_period_start date := current_date - 7;
begin
  insert into public.automation_weekly_digests (user_id, period_start, period_end, income, expense, net, transaction_count)
  select
    sr.user_id,
    v_period_start,
    v_period_end,
    coalesce(sum((sr.data->>'amount')::numeric) filter (where sr.data->>'type' = 'income'), 0),
    coalesce(sum((sr.data->>'amount')::numeric) filter (where sr.data->>'type' = 'expense'), 0),
    coalesce(sum((sr.data->>'amount')::numeric) filter (where sr.data->>'type' = 'income'), 0)
      - coalesce(sum((sr.data->>'amount')::numeric) filter (where sr.data->>'type' = 'expense'), 0),
    count(*)
  from public.synced_records sr
  where sr.table_name = 'transactions'
    and sr.deleted_at is null
    and sr.data->>'type' in ('income', 'expense')
    and sr.data->>'amount' ~ '^-?\d+(\.\d+)?$'
    and sr.data->>'date' ~ '^\d{4}-\d{2}-\d{2}'
    and (sr.data->>'date')::date >= v_period_start
    and (sr.data->>'date')::date < v_period_end
    and sr.user_id not in (select user_id from public.user_encryption_keys)
  group by sr.user_id
  having count(*) > 0
  on conflict (user_id, period_start) do nothing;
end;
$$;

-- Requires the pg_cron extension (Supabase Dashboard -> Database ->
-- Extensions -> pg_cron, one toggle, no external account). Wrapped so
-- re-running this file BEFORE that toggle is flipped doesn't abort the
-- whole script -- it just notices and skips; re-run this file again after
-- enabling pg_cron to actually schedule the job. cron.schedule() itself
-- upserts by job name, so this is safe to run repeatedly either way.
do $$
begin
  perform cron.schedule('nexus-weekly-digest', '0 9 * * 1', $cron$select public.generate_weekly_digests();$cron$);
exception when undefined_function or invalid_schema_name then
  raise notice 'pg_cron not enabled yet -- enable it in Supabase Dashboard > Database > Extensions, then re-run this file to schedule the weekly digest job.';
end $$;
