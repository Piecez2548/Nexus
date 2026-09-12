-- Prevent a stale client from resurrecting a record after another device
-- has deleted it. Re-creating an item uses a new sync id.
create or replace function public.set_synced_records_updated_at()
returns trigger as $$
begin
  if tg_op = 'UPDATE' and old.deleted_at is not null and new.deleted_at is null then
    new.data = old.data;
    new.deleted_at = old.deleted_at;
  end if;
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;
