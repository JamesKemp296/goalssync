-- Consistency (consistency_30): 90% success rate over the past 30 days
-- (same formula as home RollupStats success rate).

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
  v_success_30 numeric;
  v_periods_30 int;
  v_has_perfect_daily boolean;
  v_daily_perfect_count int;
  v_weekly_perfect_count int;
  v_daily_max_streak int;
  v_weekly_max_streak int;
  v_weekly_big_list_id bigint;
  v_weekly_big_total int;
  v_monthly_big_list_id bigint;
  v_monthly_big_total int;
begin
  if v_user is null then
    return;
  end if;

  if exists (select 1 from public.lists l where l.user_id = v_user limit 1) then
    insert into public.badges_awarded (user_id, badge_key, metadata)
      values (v_user, 'first_list', '{}'::jsonb)
      on conflict do nothing;
  end if;

  select coalesce(p.timezone, 'UTC') into v_tz
    from public.profiles p
   where p.id = v_user;
  if v_tz is null then
    v_tz := 'UTC';
  end if;
  v_local := now() at time zone v_tz;

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

  select count(*) into v_periods_30
    from public.list_period_history
   where user_id = v_user
     and period_end >= now() - interval '30 days';

  if v_periods_30 > 0 then
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
          'consistency_30',
          jsonb_build_object('rate', v_success_30, 'periods', v_periods_30)
        )
        on conflict do nothing;
    end if;
  end if;

  select count(*) into v_daily_perfect_count
    from public.list_period_history
   where user_id = v_user
     and time_frame = 'daily'
     and completed_all = true;

  if v_daily_perfect_count >= 3 then
    insert into public.badges_awarded (user_id, badge_key, metadata)
      values (
        v_user,
        'daily_three_peat',
        jsonb_build_object('count', v_daily_perfect_count)
      )
      on conflict do nothing;
  end if;

  if v_daily_perfect_count >= 10 then
    insert into public.badges_awarded (user_id, badge_key, metadata)
      values (
        v_user,
        'daily_ten',
        jsonb_build_object('count', v_daily_perfect_count)
      )
      on conflict do nothing;
  end if;

  if v_daily_perfect_count >= 30 then
    insert into public.badges_awarded (user_id, badge_key, metadata)
      values (
        v_user,
        'goal_getter',
        jsonb_build_object('count', v_daily_perfect_count)
      )
      on conflict do nothing;
  end if;

  select count(*) into v_weekly_perfect_count
    from public.list_period_history
   where user_id = v_user
     and time_frame = 'weekly'
     and completed_all = true;

  if v_weekly_perfect_count >= 3 then
    insert into public.badges_awarded (user_id, badge_key, metadata)
      values (
        v_user,
        'weekly_three_peat',
        jsonb_build_object('count', v_weekly_perfect_count)
      )
      on conflict do nothing;
  end if;

  if v_weekly_perfect_count >= 9 then
    insert into public.badges_awarded (user_id, badge_key, metadata)
      values (
        v_user,
        'weekly_eight',
        jsonb_build_object('count', v_weekly_perfect_count)
      )
      on conflict do nothing;
  end if;

  select h.list_id, h.total_count
    into v_weekly_big_list_id, v_weekly_big_total
    from public.list_period_history h
   where h.user_id = v_user
     and h.time_frame = 'weekly'
     and h.completed_all = true
     and h.total_count >= 5
   order by h.period_end desc
   limit 1;

  if v_weekly_big_list_id is not null then
    insert into public.badges_awarded (user_id, badge_key, metadata)
      values (
        v_user,
        'weekly_big_five',
        jsonb_build_object(
          'list_id',
          v_weekly_big_list_id,
          'total_count',
          v_weekly_big_total
        )
      )
      on conflict do nothing;
  end if;

  select h.list_id, h.total_count
    into v_monthly_big_list_id, v_monthly_big_total
    from public.list_period_history h
   where h.user_id = v_user
     and h.time_frame = 'monthly'
     and h.completed_all = true
     and h.total_count >= 8
   order by h.period_end desc
   limit 1;

  if v_monthly_big_list_id is not null then
    insert into public.badges_awarded (user_id, badge_key, metadata)
      values (
        v_user,
        'monthly_big_eight',
        jsonb_build_object(
          'list_id',
          v_monthly_big_list_id,
          'total_count',
          v_monthly_big_total
        )
      )
      on conflict do nothing;
  end if;

  with streak_rows as (
    select
      h.list_id,
      (h.period_end at time zone 'UTC')::date as d,
      row_number() over (
        partition by h.list_id
        order by (h.period_end at time zone 'UTC')::date
      ) as rn
    from public.list_period_history h
    where h.user_id = v_user
      and h.time_frame = 'daily'
      and h.completed_all = true
  ),
  streak_groups as (
    select
      list_id,
      d - (rn * interval '1 day') as grp
    from streak_rows
  ),
  streak_counts as (
    select list_id, grp, count(*) as streak_len
    from streak_groups
    group by list_id, grp
  )
  select coalesce(max(streak_len), 0) into v_daily_max_streak
  from streak_counts;

  if v_daily_max_streak >= 3 then
    insert into public.badges_awarded (user_id, badge_key, metadata)
      values (
        v_user,
        'daily_streak_3',
        jsonb_build_object('streak', v_daily_max_streak)
      )
      on conflict do nothing;
  end if;

  with streak_rows as (
    select
      h.list_id,
      (h.period_end at time zone 'UTC')::date as d,
      row_number() over (
        partition by h.list_id
        order by (h.period_end at time zone 'UTC')::date
      ) as rn
    from public.list_period_history h
    where h.user_id = v_user
      and h.time_frame = 'weekly'
      and h.completed_all = true
  ),
  streak_groups as (
    select
      list_id,
      d - (rn * interval '7 days') as grp
    from streak_rows
  ),
  streak_counts as (
    select list_id, grp, count(*) as streak_len
    from streak_groups
    group by list_id, grp
  )
  select coalesce(max(streak_len), 0) into v_weekly_max_streak
  from streak_counts;

  if v_weekly_max_streak >= 3 then
    insert into public.badges_awarded (user_id, badge_key, metadata)
      values (
        v_user,
        'weekly_streak_3',
        jsonb_build_object('streak', v_weekly_max_streak)
      )
      on conflict do nothing;
  end if;

  if v_weekly_max_streak >= 6 then
    insert into public.badges_awarded (user_id, badge_key, metadata)
      values (
        v_user,
        'weekly_streak_6',
        jsonb_build_object('streak', v_weekly_max_streak)
      )
      on conflict do nothing;
  end if;
end;
$$;

revoke all on function public.evaluate_user_badges() from public;
grant execute on function public.evaluate_user_badges() to authenticated;
