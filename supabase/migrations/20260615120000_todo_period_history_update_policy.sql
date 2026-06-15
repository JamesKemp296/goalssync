-- Allow users to update was_completed on their own todo_period_history rows
drop policy if exists "todo_period_history update own" on public.todo_period_history;
create policy "todo_period_history update own"
  on public.todo_period_history for update
  using (
    exists (
      select 1 from public.list_period_history h
      where h.id = todo_period_history.list_period_history_id
        and h.user_id = auth.uid()
    )
  );

-- Allow users to update completed_count on their own list_period_history rows
-- (needed to keep the heatmap accurate after toggling historical todos)
drop policy if exists "list_period_history update own" on public.list_period_history;
create policy "list_period_history update own"
  on public.list_period_history for update
  using (user_id = auth.uid());
