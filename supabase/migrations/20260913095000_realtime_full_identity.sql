-- Realtime UPDATE payloads can otherwise contain only changed columns plus
-- the primary key. `table_name` is stable during a row edit, so the client
-- cannot identify the affected sync table and falls back to a full pull.
-- FULL identity keeps the existing user/table filter and supplies the stable
-- routing columns for UPDATE and DELETE events without changing row data.
alter table if exists public.synced_records replica identity full;
