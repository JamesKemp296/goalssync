-- Instant badge checks for daily lists.
-- Allows client to trigger "first_perfect_day" and "early_bird" immediately
-- when a list becomes fully complete, instead of waiting for reset cron.

create or replace function public.award_instant_badges_for_list(p_list_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_owner uuid;
  v_time_frame text;
  v_total int;
  v_completed int;
  v_tz text;
  v_local timestamp;
begin
  if v_user is null then
    return;
  end if;

  select l.user_id, l.time_frame
    into v_owner, v_time_frame
    from public.lists l
   where l.id = p_list_id;

  -- Only list owner can trigger badge checks for this list.
  if v_owner is null or v_owner <> v_user then
    return;
  end if;

  -- Instant checks currently only apply to daily lists.
  if v_time_frame <> 'daily' then
    return;
  end if;

  select count(*),
         coalesce(sum(case when t.is_complete then 1 else 0 end), 0)
    into v_total, v_completed
    from public.todos t
   where t.list_id = p_list_id;

  -- Require at least one todo and all todos complete.
  if v_total = 0 or v_completed <> v_total then
    return;
  end if;

  insert into public.badges_awarded (user_id, badge_key, metadata)
  values (
    v_user,
    'first_perfect_day',
    jsonb_build_object('list_id', p_list_id, 'source', 'instant')
  )
  on conflict do nothing;

  select coalesce(p.timezone, 'UTC') into v_tz
    from public.profiles p
   where p.id = v_user;
  if v_tz is null then
    v_tz := 'UTC';
  end if;

  v_local := now() at time zone v_tz;
  if extract(hour from v_local) < 12 then
    insert into public.badges_awarded (user_id, badge_key, metadata)
    values (
      v_user,
      'early_bird',
      jsonb_build_object('list_id', p_list_id, 'source', 'instant')
    )
    on conflict do nothing;
  end if;
end;
$$;

revoke all on function public.award_instant_badges_for_list(bigint) from public;
grant execute on function public.award_instant_badges_for_list(bigint) to authenticated;
