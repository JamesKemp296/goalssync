-- Allow each authenticated user to create their own profile row.
-- Needed for client-side profile upsert in SettingsView when a profile row
-- does not yet exist.

drop policy if exists "profiles self insert" on public.profiles;
create policy "profiles self insert"
  on public.profiles for insert
  with check (id = auth.uid());
