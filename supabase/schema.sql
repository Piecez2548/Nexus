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
