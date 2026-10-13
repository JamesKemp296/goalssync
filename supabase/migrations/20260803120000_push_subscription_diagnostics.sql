-- Persist per-subscription delivery errors so failures (e.g. Android-only
-- push failures masked by a successful iOS send) are visible outside of a
-- one-off manual test push.

alter table public.push_subscriptions
  add column if not exists last_error text,
  add column if not exists last_error_at timestamptz,
  add column if not exists last_success_at timestamptz;
