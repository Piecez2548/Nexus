-- Wake foreground clients as soon as another device changes shared sync data.
-- The client still runs the existing deterministic full sync; realtime is a
-- low-latency trigger only, with the five-second poll retained as fallback.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'synced_records'
  ) then
    alter publication supabase_realtime add table public.synced_records;
  end if;
end;
$$;
