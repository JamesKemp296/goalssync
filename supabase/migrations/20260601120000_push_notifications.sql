-- Push notification subscriptions, send log, and weekly recap cron trigger.

alter table public.profiles
  add column if not exists push_enabled boolean not null default false;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions select own" on public.push_subscriptions;
create policy "push_subscriptions select own"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "push_subscriptions insert own" on public.push_subscriptions;
create policy "push_subscriptions insert own"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions update own" on public.push_subscriptions;
create policy "push_subscriptions update own"
  on public.push_subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions delete own" on public.push_subscriptions;
create policy "push_subscriptions delete own"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

create table if not exists public.notification_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null,
  period_key text not null,
  sent_at timestamptz not null default now(),
  unique (user_id, notification_type, period_key)
);

create index if not exists notification_log_user_type_idx
  on public.notification_log (user_id, notification_type, period_key);

alter table public.notification_log enable row level security;

drop policy if exists "notification_log select own" on public.notification_log;
create policy "notification_log select own"
  on public.notification_log for select
  using (auth.uid() = user_id);

-- Writes are service-role only (edge function); no insert policy for authenticated.

create extension if not exists pg_net with schema extensions;

-- Invokes the weekly-recap-push edge function via pg_net.
-- Requires vault secrets (create once in Supabase dashboard):
--   weekly_recap_push_url = https://<project-ref>.supabase.co/functions/v1/weekly-recap-push
--   service_role_key      = <service role key>
create or replace function public.invoke_weekly_recap_push()
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_url text;
  v_service_role text;
  v_request_id bigint;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets
   where name = 'weekly_recap_push_url';

  select decrypted_secret into v_service_role
    from vault.decrypted_secrets
   where name = 'service_role_key';

  if v_url is null or v_service_role is null then
    raise notice 'weekly recap push skipped: configure vault secrets weekly_recap_push_url and service_role_key';
    return null;
  end if;

  select net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role
    ),
    body := '{}'::jsonb
  ) into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function public.invoke_weekly_recap_push() from public;

do $$
begin
  if exists (
    select 1 from cron.job where jobname = 'weekly-recap-push'
  ) then
    perform cron.unschedule('weekly-recap-push');
  end if;
  perform cron.schedule(
    'weekly-recap-push',
    '*/15 * * * *',
    $cron$select public.invoke_weekly_recap_push();$cron$
  );
end $$;
