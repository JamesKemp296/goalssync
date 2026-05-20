-- Rewards tracker: per-list cadence, period history, badges, automatic resets.
-- Apply via `supabase db push` or in the Supabase SQL editor.

-- =========================
-- extensions
-- =========================
create extension if not exists pg_cron;

-- =========================
-- profiles.timezone
-- =========================
alter table public.profiles
  add column if not exists timezone text not null default 'UTC';

-- =========================
-- lists: time_frame + period anchors
-- =========================
alter table public.lists
  add column if not exists time_frame text not null default 'none';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'lists_time_frame_check'
      and conrelid = 'public.lists'::regclass
  ) then
    alter table public.lists
      add constraint lists_time_frame_check
      check (time_frame in ('none','daily','weekly','monthly'));
  end if;
end $$;

alter table public.lists
  add column if not exists current_period_started_at timestamptz;
alter table public.lists
  add column if not exists next_reset_at timestamptz;

create index if not exists lists_next_reset_at_idx
  on public.lists (next_reset_at)
  where time_frame <> 'none';

-- =========================
-- list_period_history (rollup)
-- =========================
create table if not exists public.list_period_history (
  id bigserial primary key,
  list_id bigint not null references public.lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  time_frame text not null check (time_frame in ('daily','weekly','monthly')),
  total_count int not null,
  completed_count int not null,
  completed_all boolean not null,
  created_at timestamptz not null default now(),
  unique (list_id, period_end)
);

create index if not exists list_period_history_user_period_idx
  on public.list_period_history (user_id, period_end desc);

create index if not exists list_period_history_list_period_idx
  on public.list_period_history (list_id, period_end desc);

alter table public.list_period_history enable row level security;

drop policy if exists "list_period_history select own" on public.list_period_history;
create policy "list_period_history select own"
  on public.list_period_history for select
  using (user_id = auth.uid());

-- =========================
-- todo_period_history (per-item snapshot)
-- =========================
create table if not exists public.todo_period_history (
  id bigserial primary key,
  list_period_history_id bigint not null
    references public.list_period_history(id) on delete cascade,
  todo_id bigint,
  task text not null,
  was_completed boolean not null
);

create index if not exists todo_period_history_period_idx
  on public.todo_period_history (list_period_history_id);
create index if not exists todo_period_history_todo_idx
  on public.todo_period_history (todo_id);

alter table public.todo_period_history enable row level security;

drop policy if exists "todo_period_history select own" on public.todo_period_history;
create policy "todo_period_history select own"
  on public.todo_period_history for select
  using (
    exists (
      select 1 from public.list_period_history h
      where h.id = todo_period_history.list_period_history_id
        and h.user_id = auth.uid()
    )
  );

-- =========================
-- badges_awarded
-- =========================
create table if not exists public.badges_awarded (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_key text not null,
  awarded_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (user_id, badge_key)
);

create index if not exists badges_awarded_user_idx
  on public.badges_awarded (user_id, awarded_at desc);

alter table public.badges_awarded enable row level security;

drop policy if exists "badges_awarded select own" on public.badges_awarded;
create policy "badges_awarded select own"
  on public.badges_awarded for select
  using (user_id = auth.uid());

-- =========================
-- compute_next_reset_at(list_id)
-- Returns the next UTC timestamp at which the list should reset, anchored to
-- the owning user's local timezone. Returns null for 'none' time_frame.
-- =========================
create or replace function public.compute_next_reset_at(p_list_id bigint)
returns timestamptz
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tf text;
  v_tz text;
  v_owner uuid;
  v_local timestamp;
  v_next_local timestamp;
  v_dow int;
  v_days_until_monday int;
begin
  select l.time_frame, l.user_id into v_tf, v_owner
    from public.lists l
   where l.id = p_list_id;

  if v_tf is null or v_tf = 'none' then
    return null;
  end if;

  select coalesce(p.timezone, 'UTC') into v_tz
    from public.profiles p where p.id = v_owner;
  if v_tz is null then v_tz := 'UTC'; end if;

  v_local := (now() at time zone v_tz);

  if v_tf = 'daily' then
    v_next_local := date_trunc('day', v_local) + interval '1 day';
  elsif v_tf = 'weekly' then
    -- ISO dow: Monday = 1 ... Sunday = 7. Reset is next local Monday 00:00.
    v_dow := extract(isodow from v_local);
    v_days_until_monday := case when v_dow = 1 then 7 else 8 - v_dow end;
    v_next_local := date_trunc('day', v_local) + (v_days_until_monday || ' days')::interval;
  elsif v_tf = 'monthly' then
    v_next_local := date_trunc('month', v_local) + interval '1 month';
  else
    return null;
  end if;

  return v_next_local at time zone v_tz;
end;
$$;

revoke all on function public.compute_next_reset_at(bigint) from public;
grant execute on function public.compute_next_reset_at(bigint) to authenticated;

-- =========================
-- Trigger: keep next_reset_at / current_period_started_at in sync with time_frame
-- =========================
create or replace function public.lists_sync_period_anchors()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- New row
  if tg_op = 'INSERT' then
    if new.time_frame is null or new.time_frame = 'none' then
      new.current_period_started_at := null;
      new.next_reset_at := null;
    else
      new.current_period_started_at := coalesce(new.current_period_started_at, now());
      -- next_reset_at is computed after insert (needs id + owner row)
      -- but we have user_id at insert time, so compute inline using same logic
      new.next_reset_at := null; -- temporary; updated by AFTER trigger
    end if;
    return new;
  end if;

  -- Updates: only act when time_frame changed
  if tg_op = 'UPDATE' and new.time_frame is distinct from old.time_frame then
    if new.time_frame = 'none' then
      new.current_period_started_at := null;
      new.next_reset_at := null;
    else
      new.current_period_started_at := now();
      new.next_reset_at := null; -- updated by AFTER trigger
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.lists_compute_reset_after()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.time_frame is null or new.time_frame = 'none' then
    return new;
  end if;
  if new.next_reset_at is null then
    update public.lists
       set next_reset_at = public.compute_next_reset_at(new.id)
     where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists lists_sync_period_anchors_trg on public.lists;
create trigger lists_sync_period_anchors_trg
  before insert or update on public.lists
  for each row execute function public.lists_sync_period_anchors();

drop trigger if exists lists_compute_reset_after_trg on public.lists;
create trigger lists_compute_reset_after_trg
  after insert or update on public.lists
  for each row execute function public.lists_compute_reset_after();

-- =========================
-- evaluate_badges_for_list: award badges driven by a single list reset.
-- Called from reset_due_lists() after a period closes.
-- =========================
create or replace function public.evaluate_badges_for_list(
  p_list_id bigint,
  p_user_id uuid,
  p_time_frame text,
  p_period_end timestamptz,
  p_total int,
  p_completed int,
  p_completed_all boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_streak int;
  v_lifetime int;
  v_iso_week text;
  v_yyyy_mm text;
begin
  -- Perfect-week / perfect-month (one badge per ISO week / per month)
  if p_completed_all and p_total > 0 then
    if p_time_frame = 'weekly' then
      v_iso_week := to_char(p_period_end - interval '1 day', 'IYYY-"W"IW');
      insert into public.badges_awarded (user_id, badge_key, metadata)
        values (p_user_id, 'perfect_week_' || v_iso_week,
                jsonb_build_object('list_id', p_list_id, 'period_end', p_period_end))
        on conflict do nothing;
    elsif p_time_frame = 'monthly' then
      v_yyyy_mm := to_char(p_period_end - interval '1 day', 'YYYY-MM');
      insert into public.badges_awarded (user_id, badge_key, metadata)
        values (p_user_id, 'flawless_month_' || v_yyyy_mm,
                jsonb_build_object('list_id', p_list_id, 'period_end', p_period_end))
        on conflict do nothing;
    elsif p_time_frame = 'daily' then
      insert into public.badges_awarded (user_id, badge_key, metadata)
        values (p_user_id, 'first_perfect_day',
                jsonb_build_object('list_id', p_list_id, 'period_end', p_period_end))
        on conflict do nothing;
    end if;
  end if;

  -- Streak badge: 7 consecutive completed_all periods on same list, ending here.
  if p_completed_all and p_total > 0 then
    with recent as (
      select completed_all,
             row_number() over (order by period_end desc) as rn
        from public.list_period_history
       where list_id = p_list_id
       order by period_end desc
       limit 7
    )
    select count(*) into v_streak from recent where completed_all;
    if v_streak >= 7 then
      insert into public.badges_awarded (user_id, badge_key, metadata)
        values (p_user_id, 'first_streak_7',
                jsonb_build_object('list_id', p_list_id, 'period_end', p_period_end))
        on conflict do nothing;
    end if;
  end if;

  -- Lifetime: 100 todos ever completed across all the user's lists
  select coalesce(sum(completed_count), 0) into v_lifetime
    from public.list_period_history
   where user_id = p_user_id;
  if v_lifetime >= 100 then
    insert into public.badges_awarded (user_id, badge_key, metadata)
      values (p_user_id, 'century_completer',
              jsonb_build_object('lifetime', v_lifetime))
      on conflict do nothing;
  end if;
end;
$$;

revoke all on function public.evaluate_badges_for_list(bigint, uuid, text, timestamptz, int, int, boolean) from public;

-- =========================
-- award_lifetime_badges: client-callable RPC, evaluates only the cheap lifetime
-- badges (called after toggling a todo so users get instant feedback).
-- =========================
create or replace function public.award_lifetime_badges()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_lifetime int;
  v_completed_now int;
begin
  if v_user is null then return; end if;

  -- Lifetime from todos table (current period completions) + closed history
  select coalesce(sum(case when t.is_complete then 1 else 0 end), 0)
    into v_completed_now
    from public.todos t
    join public.lists l on l.id = t.list_id
   where l.user_id = v_user;

  select coalesce(sum(completed_count), 0) into v_lifetime
    from public.list_period_history
   where user_id = v_user;

  if (v_completed_now + v_lifetime) >= 100 then
    insert into public.badges_awarded (user_id, badge_key, metadata)
      values (v_user, 'century_completer',
              jsonb_build_object('lifetime', v_completed_now + v_lifetime))
      on conflict do nothing;
  end if;
end;
$$;

revoke all on function public.award_lifetime_badges() from public;
grant execute on function public.award_lifetime_badges() to authenticated;

-- =========================
-- reset_due_lists: process every list whose next_reset_at is in the past.
-- Snapshots the period, unchecks todos, advances next_reset_at, awards badges.
-- =========================
create or replace function public.reset_due_lists()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_history_id bigint;
  v_total int;
  v_completed int;
  v_completed_all boolean;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_count int := 0;
begin
  for v_row in
    select id, user_id, time_frame, current_period_started_at, next_reset_at
      from public.lists
     where time_frame <> 'none'
       and next_reset_at is not null
       and next_reset_at <= now()
     order by next_reset_at
  loop
    v_period_start := coalesce(v_row.current_period_started_at, v_row.next_reset_at - interval '1 day');
    v_period_end := v_row.next_reset_at;

    select count(*),
           sum(case when t.is_complete then 1 else 0 end)
      into v_total, v_completed
      from public.todos t
     where t.list_id = v_row.id;
    v_total := coalesce(v_total, 0);
    v_completed := coalesce(v_completed, 0);
    v_completed_all := v_total > 0 and v_completed = v_total;

    insert into public.list_period_history (
      list_id, user_id, period_start, period_end, time_frame,
      total_count, completed_count, completed_all
    )
    values (
      v_row.id, v_row.user_id, v_period_start, v_period_end, v_row.time_frame,
      v_total, v_completed, v_completed_all
    )
    on conflict (list_id, period_end) do update
      set total_count = excluded.total_count,
          completed_count = excluded.completed_count,
          completed_all = excluded.completed_all
    returning id into v_history_id;

    insert into public.todo_period_history (
      list_period_history_id, todo_id, task, was_completed
    )
    select v_history_id, t.id, t.task, t.is_complete
      from public.todos t
     where t.list_id = v_row.id;

    update public.todos
       set is_complete = false
     where list_id = v_row.id;

    update public.lists
       set current_period_started_at = v_period_end,
           next_reset_at = public.compute_next_reset_at(v_row.id)
     where id = v_row.id;

    perform public.evaluate_badges_for_list(
      v_row.id, v_row.user_id, v_row.time_frame,
      v_period_end, v_total, v_completed, v_completed_all
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.reset_due_lists() from public;

-- =========================
-- Schedule reset_due_lists every 10 minutes via pg_cron.
-- =========================
do $$
begin
  if exists (
    select 1 from cron.job where jobname = 'reset-due-lists'
  ) then
    perform cron.unschedule('reset-due-lists');
  end if;
  perform cron.schedule(
    'reset-due-lists',
    '*/10 * * * *',
    $cron$select public.reset_due_lists();$cron$
  );
end $$;

-- =========================
-- Backfill: initialize period anchors for any existing timeframed lists (none yet, but safe).
-- =========================
update public.lists
   set current_period_started_at = now(),
       next_reset_at = public.compute_next_reset_at(id)
 where time_frame <> 'none'
   and next_reset_at is null;
