-- Nexus cloud sync schema.
-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
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
