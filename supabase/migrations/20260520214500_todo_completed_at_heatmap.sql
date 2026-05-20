-- Track when a todo was completed so the heatmap can count completions by day
-- even when a list is only partially complete.

alter table public.todos
  add column if not exists completed_at timestamptz null;

-- Backfill currently-complete todos so they appear in the heatmap immediately.
update public.todos
   set completed_at = now()
 where is_complete = true
   and completed_at is null;

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
       set is_complete = false,
           -- Daily list completions are represented by list_period_history,
           -- so clear daily timestamps to avoid double-counting.
           completed_at = case
             when v_row.time_frame = 'daily' then null
             else completed_at
           end
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
grant execute on function public.reset_due_lists() to authenticated;
