-- Profiles, friendships, invites + RLS for read-only friend access
-- Apply in Supabase SQL editor (or `supabase db push`).

-- =========================
-- profiles (mirrors auth.users)
-- =========================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  first_name text,
  last_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- =========================
-- friendships (one row per pair, ordered)
-- =========================
create table if not exists public.friendships (
  user_a_id uuid not null references auth.users(id) on delete cascade,
  user_b_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a_id, user_b_id),
  check (user_a_id < user_b_id)
);

alter table public.friendships enable row level security;

-- =========================
-- invites
-- =========================
create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  invited_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  unique (email, invited_by)
);

alter table public.invites enable row level security;

-- =========================
-- helpers
-- =========================
create or replace function public.is_friend(other_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.friendships f
    where (f.user_a_id = auth.uid() and f.user_b_id = other_id)
       or (f.user_b_id = auth.uid() and f.user_a_id = other_id)
  );
$$;

revoke all on function public.is_friend(uuid) from public;
grant execute on function public.is_friend(uuid) to authenticated;

-- =========================
-- triggers: profile + invite acceptance on signup
-- =========================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  inviter_id uuid;
  pair_a uuid;
  pair_b uuid;
begin
  -- create profile
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    lower(new.email),
    nullif(coalesce(new.raw_user_meta_data->>'first_name', ''), ''),
    nullif(coalesce(new.raw_user_meta_data->>'last_name', ''), '')
  )
  on conflict (id) do nothing;

  -- accept any pending invites for this email and friend with each inviter
  for inviter_id in
    select invited_by
    from public.invites
    where lower(email) = lower(new.email)
      and accepted_at is null
  loop
    if inviter_id is not null and inviter_id <> new.id then
      pair_a := least(inviter_id, new.id);
      pair_b := greatest(inviter_id, new.id);
      insert into public.friendships (user_a_id, user_b_id)
      values (pair_a, pair_b)
      on conflict do nothing;
    end if;
  end loop;

  update public.invites
     set accepted_at = now(), accepted_by = new.id
   where lower(email) = lower(new.email)
     and accepted_at is null;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================
-- RLS policies: profiles
-- =========================
drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read"
  on public.profiles for select
  using (id = auth.uid() or public.is_friend(id));

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- (no insert/delete policies: profiles created/maintained via trigger / admin only)

-- =========================
-- RLS policies: friendships
-- =========================
drop policy if exists "friendships read own" on public.friendships;
create policy "friendships read own"
  on public.friendships for select
  using (auth.uid() in (user_a_id, user_b_id));

-- (no insert/update/delete from clients; trigger / service role only)

-- =========================
-- RLS policies: invites
-- =========================
drop policy if exists "invites read own" on public.invites;
create policy "invites read own"
  on public.invites for select
  using (invited_by = auth.uid());

drop policy if exists "invites insert own" on public.invites;
create policy "invites insert own"
  on public.invites for insert
  with check (invited_by = auth.uid());

-- =========================
-- RLS policies: lists (extend existing select to friends, read-only)
-- =========================
-- Drop pre-existing select policies that scope only to owner (names may vary).
do $$
begin
  if exists (
    select 1 from pg_policies where schemaname='public' and tablename='lists' and cmd='SELECT'
  ) then
    -- Best effort: remove any obvious owner-only select policy. Adjust the names below
    -- to match your project if needed.
    execute 'drop policy if exists "Allow read own lists" on public.lists';
    execute 'drop policy if exists "lists select own" on public.lists';
    execute 'drop policy if exists "Enable read access for users" on public.lists';
  end if;
end $$;

drop policy if exists "lists select self or friend" on public.lists;
create policy "lists select self or friend"
  on public.lists for select
  using (user_id = auth.uid() or public.is_friend(user_id));

-- Ensure write policies remain owner-only. Recreate explicitly to be safe.
drop policy if exists "lists insert own" on public.lists;
create policy "lists insert own"
  on public.lists for insert
  with check (user_id = auth.uid());

drop policy if exists "lists update own" on public.lists;
create policy "lists update own"
  on public.lists for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "lists delete own" on public.lists;
create policy "lists delete own"
  on public.lists for delete
  using (user_id = auth.uid());

-- =========================
-- RLS policies: todos (read-only friend access via parent list)
-- =========================
do $$
begin
  if exists (
    select 1 from pg_policies where schemaname='public' and tablename='todos' and cmd='SELECT'
  ) then
    execute 'drop policy if exists "Allow read own todos" on public.todos';
    execute 'drop policy if exists "todos select own" on public.todos';
    execute 'drop policy if exists "Enable read access for users" on public.todos';
  end if;
end $$;

drop policy if exists "todos select self or friend" on public.todos;
create policy "todos select self or friend"
  on public.todos for select
  using (
    exists (
      select 1 from public.lists l
      where l.id = todos.list_id
        and (l.user_id = auth.uid() or public.is_friend(l.user_id))
    )
  );

drop policy if exists "todos insert on own list" on public.todos;
create policy "todos insert on own list"
  on public.todos for insert
  with check (
    exists (
      select 1 from public.lists l
      where l.id = todos.list_id and l.user_id = auth.uid()
    )
  );

drop policy if exists "todos update on own list" on public.todos;
create policy "todos update on own list"
  on public.todos for update
  using (
    exists (
      select 1 from public.lists l
      where l.id = todos.list_id and l.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.lists l
      where l.id = todos.list_id and l.user_id = auth.uid()
    )
  );

drop policy if exists "todos delete on own list" on public.todos;
create policy "todos delete on own list"
  on public.todos for delete
  using (
    exists (
      select 1 from public.lists l
      where l.id = todos.list_id and l.user_id = auth.uid()
    )
  );

-- =========================
-- backfill: profiles for any existing auth.users
-- =========================
insert into public.profiles (id, email, first_name, last_name)
select u.id,
       lower(u.email),
       nullif(coalesce(u.raw_user_meta_data->>'first_name',''),''),
       nullif(coalesce(u.raw_user_meta_data->>'last_name',''),'')
  from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
