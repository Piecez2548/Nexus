-- Prevent an older offline edit from overwriting a newer live cloud record.
-- The app writes canonical UTC ISO strings to data.updatedAt, so lexical and
-- chronological ordering are equivalent for valid application payloads.
create or replace function public.set_synced_records_updated_at()
returns trigger as $$
begin
  if tg_op = 'UPDATE' then
    -- A tombstone is terminal for its syncId.
    if old.deleted_at is not null and new.deleted_at is null then
      new.data = old.data;
      new.deleted_at = old.deleted_at;
    -- Preserve the newer live payload when an older device reconnects later.
    elsif old.deleted_at is null
      and new.deleted_at is null
      and old.data ->> 'updatedAt' is not null
      and new.data ->> 'updatedAt' is not null
      and old.data ->> 'updatedAt' > new.data ->> 'updatedAt' then
      new.data = old.data;
    end if;
  end if;

  -- Pull cursors always use the server clock, independent of device clocks.
  new.updated_at = now();
  return new;
end;
$$ language plpgsql
set search_path = '';
