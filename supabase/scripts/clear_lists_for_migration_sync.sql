-- Clears list/todo data and resets migration history for friends (20260425) only.
-- Run: npm run db:clear-lists
-- Then: npm run db:push

truncate table public.todos cascade;
truncate table public.lists cascade;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'todo_period_history'
  ) then
    truncate table public.todo_period_history cascade;
  end if;
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'list_period_history'
  ) then
    truncate table public.list_period_history cascade;
  end if;
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'badges_awarded'
  ) then
    truncate table public.badges_awarded cascade;
  end if;
end $$;

-- Remove mismatched friends migration row (checksum differs from local file).
delete from supabase_migrations.schema_migrations
where version = '20260425';
