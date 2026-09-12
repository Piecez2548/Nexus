create table if not exists public.device_pairing_requests (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  secret_hash text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'consumed')),
  encrypted_dek text,
  dek_iv text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

create index if not exists device_pairing_requests_user_expires_idx
  on public.device_pairing_requests (user_id, expires_at);

alter table public.device_pairing_requests enable row level security;

drop policy if exists "Users manage their own pairing requests" on public.device_pairing_requests;
create policy "Users manage their own pairing requests"
  on public.device_pairing_requests for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

