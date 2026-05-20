import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { Alert, Box, CircularProgress, Container } from '@mui/material'
import { supabase, supabaseConfigError } from './supabase'
import AppShell from './components/AppShell'
import AuthView from './views/AuthView'
import HomeView from './views/HomeView'
import ListsView from './views/ListsView'
import TodosView from './views/TodosView'
import SettingsView from './views/SettingsView'
import ResetPasswordView from './views/ResetPasswordView'
import FriendsView from './views/FriendsView'

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) =>
      setSession(s),
    )
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase || !session?.user) return
    const userId = session.user.id
    const browserTz =
      Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    void (async () => {
      const { data } = await supabase!
        .from('profiles')
        .select('timezone')
        .eq('id', userId)
        .maybeSingle()
      const current = (data as { timezone?: string } | null)?.timezone
      if (current === browserTz) return
      const { error: updateProfileError } = await supabase!
        .from('profiles')
        .update({ timezone: browserTz })
        .eq('id', userId)
      if (updateProfileError) return

      // Existing timed lists may have been anchored to UTC before timezone sync.
      // Recompute each list's next reset moment using server-side timezone logic.
      const { data: timedLists } = await supabase!
        .from('lists')
        .select('id,time_frame')
        .eq('user_id', userId)
        .neq('time_frame', 'none')
      const rows =
        (timedLists as { id: number; time_frame: string }[] | null) ?? []
      await Promise.all(
        rows.map(async (row) => {
          const { data: nextResetAt } = await supabase!.rpc(
            'compute_next_reset_at',
            { p_list_id: row.id },
          )
          await supabase!
            .from('lists')
            .update({ next_reset_at: nextResetAt })
            .eq('id', row.id)
        }),
      )
    })()
  }, [session?.user?.id])

  if (supabaseConfigError) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Alert severity="error">
          {supabaseConfigError}. Create `.env` from `.env.example` and restart
          `npm run dev`.
        </Alert>
      </Container>
    )
  }

  if (session === undefined) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<AuthView />} />
        <Route path="/login/forgot-password" element={<AuthView />} />
        <Route path="/reset-password" element={<ResetPasswordView />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/reset-password" element={<ResetPasswordView />} />
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<HomeView />} />
        <Route path="/lists" element={<ListsView />} />
        <Route path="/lists/:listId" element={<TodosView />} />
        <Route path="/friends" element={<FriendsView />} />
        <Route path="/settings" element={<SettingsView session={session} />} />
        <Route path="/login" element={<Navigate to="/home" replace />} />
        <Route
          path="/login/forgot-password"
          element={<Navigate to="/home" replace />}
        />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Route>
    </Routes>
  )
}
