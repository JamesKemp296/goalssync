-- Comprehensive badge evaluation RPC. Called from the client whenever todos
-- change or when the home page mounts so badges always stay in sync without
-- waiting for the period-reset cron job.

create or replace function public.evaluate_user_badges()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_tz text;
  v_local timestamp;
  v_lifetime int;
  v_completed_now int;
  v_period_count int;
  v_success_30 numeric;
  v_periods_30 int;
  v_has_perfect_daily boolean;
begin
  if v_user is null then
    return;
  end if;

  select coalesce(p.timezone, 'UTC') into v_tz
    from public.profiles p
   where p.id = v_user;
  if v_tz is null then
    v_tz := 'UTC';
  end if;
  v_local := now() at time zone v_tz;

  -- century_completer: 100+ todos completed (live + closed history)
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
      values (
        v_user,
        'century_completer',
        jsonb_build_object('lifetime', v_completed_now + v_lifetime)
      )
      on conflict do nothing;
  end if;

  -- first_perfect_day + early_bird: any daily list fully completed right now
  select exists (
    select 1 from public.lists l
     where l.user_id = v_user
       and l.time_frame = 'daily'
       and exists (select 1 from public.todos t where t.list_id = l.id)
       and not exists (
         select 1 from public.todos t
          where t.list_id = l.id and t.is_complete = false
       )
  ) into v_has_perfect_daily;

  if v_has_perfect_daily then
    insert into public.badges_awarded (user_id, badge_key, metadata)
      values (
        v_user,
        'first_perfect_day',
        jsonb_build_object('source', 'realtime')
      )
      on conflict do nothing;

    if extract(hour from v_local) < 12 then
      insert into public.badges_awarded (user_id, badge_key, metadata)
        values (
          v_user,
          'early_bird',
          jsonb_build_object('source', 'realtime')
        )
        on conflict do nothing;
    end if;
  end if;

  -- consistency_30: 30+ closed periods across all lists
  select count(*) into v_period_count
    from public.list_period_history
   where user_id = v_user;
  if v_period_count >= 30 then
    insert into public.badges_awarded (user_id, badge_key, metadata)
      values (
        v_user,
        'consistency_30',
        jsonb_build_object('periods', v_period_count)
      )
      on conflict do nothing;
  end if;

  -- goal_getter: 90%+ perfect periods in last 30 days (min 10 periods)
  select count(*) into v_periods_30
    from public.list_period_history
   where user_id = v_user
     and period_end >= now() - interval '30 days';

  if v_periods_30 >= 10 then
    select round(
        100.0 * count(*) filter (where completed_all) / nullif(count(*), 0)
      )
      into v_success_30
      from public.list_period_history
     where user_id = v_user
       and period_end >= now() - interval '30 days';
    if v_success_30 is not null and v_success_30 >= 90 then
      insert into public.badges_awarded (user_id, badge_key, metadata)
        values (
          v_user,
          'goal_getter',
          jsonb_build_object('rate', v_success_30, 'periods', v_periods_30)
        )
        on conflict do nothing;
    end if;
  end if;
end;
$$;

revoke all on function public.evaluate_user_badges() from public;
grant execute on function public.evaluate_user_badges() to authenticated;
