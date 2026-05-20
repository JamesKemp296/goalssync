-- Nuclear option: wipe ALL migration history and list data, then run `npm run db:push`
-- to re-apply every local migration from scratch.
-- Friends/profiles SQL uses IF NOT EXISTS — safe on an existing project.

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

delete from supabase_migrations.schema_migrations;
