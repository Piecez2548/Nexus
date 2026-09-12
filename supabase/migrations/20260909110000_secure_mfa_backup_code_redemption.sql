-- Backup codes are an MFA recovery factor. Password-only (aal1) sessions
-- must not be able to list their hashes or replace the registered set.
drop policy if exists "Users manage their own backup codes" on public.mfa_backup_codes;

create policy "AAL2 users read their own backup codes" on public.mfa_backup_codes
  for select using (
    (select auth.uid()) = user_id and (select auth.jwt() ->> 'aal') = 'aal2'
  );

create policy "AAL2 users insert their own backup codes" on public.mfa_backup_codes
  for insert with check (
    (select auth.uid()) = user_id and (select auth.jwt() ->> 'aal') = 'aal2'
  );

create policy "AAL2 users delete their own backup codes" on public.mfa_backup_codes
  for delete using (
    (select auth.uid()) = user_id and (select auth.jwt() ->> 'aal') = 'aal2'
  );

create table if not exists public.mfa_backup_code_attempts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null default now(),
  attempt_count integer not null default 0 check (attempt_count >= 0)
);

alter table public.mfa_backup_code_attempts enable row level security;

create or replace function public.redeem_mfa_backup_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  normalized_code text := upper(regexp_replace(trim(p_code), '[[:space:]-]', '', 'g'));
  current_attempt_count integer;
  matched_id uuid;
begin
  if current_user_id is null or normalized_code !~ '^[A-HJ-NP-Z2-9]{10}$' then
    return false;
  end if;

  insert into public.mfa_backup_code_attempts (user_id, window_started_at, attempt_count)
  values (current_user_id, now(), 1)
  on conflict (user_id) do update
    set window_started_at = case
          when public.mfa_backup_code_attempts.window_started_at < now() - interval '15 minutes' then now()
          else public.mfa_backup_code_attempts.window_started_at
        end,
        attempt_count = case
          when public.mfa_backup_code_attempts.window_started_at < now() - interval '15 minutes' then 1
          else public.mfa_backup_code_attempts.attempt_count + 1
        end
  returning attempt_count into current_attempt_count;

  if current_attempt_count > 5 then
    return false;
  end if;

  delete from public.mfa_backup_codes
  where user_id = current_user_id
    and used_at is null
    and code_hash = encode(extensions.digest(salt || ':' || normalized_code, 'sha256'), 'hex')
  returning id into matched_id;

  if matched_id is not null then
    delete from public.mfa_backup_code_attempts where user_id = current_user_id;
    return true;
  end if;
  return false;
end;
$$;

revoke all on function public.redeem_mfa_backup_code(text) from public, anon;
grant execute on function public.redeem_mfa_backup_code(text) to authenticated;
