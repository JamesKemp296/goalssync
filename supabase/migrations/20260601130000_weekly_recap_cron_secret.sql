-- Use CRON_SECRET + anon key for weekly-recap-push (service_role JWT matching was unreliable).

create or replace function public.invoke_weekly_recap_push()
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_url text;
  v_anon_key text;
  v_cron_secret text;
  v_request_id bigint;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets
   where name = 'weekly_recap_push_url';

  select decrypted_secret into v_anon_key
    from vault.decrypted_secrets
   where name = 'anon_key';

  select decrypted_secret into v_cron_secret
    from vault.decrypted_secrets
   where name = 'cron_secret';

  if v_url is null or v_anon_key is null or v_cron_secret is null then
    raise notice 'weekly recap push skipped: configure vault secrets weekly_recap_push_url, anon_key, and cron_secret';
    return null;
  end if;

  select net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon_key,
      'apikey', v_anon_key,
      'x-cron-secret', v_cron_secret
    ),
    body := '{}'::jsonb
  ) into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function public.invoke_weekly_recap_push() from public;
