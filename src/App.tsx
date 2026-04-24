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

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (supabaseConfigError) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Alert severity="error">
          {supabaseConfigError}. Create `.env` from `.env.example` and restart `npm run dev`.
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
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<HomeView />} />
        <Route path="/lists" element={<ListsView />} />
        <Route path="/lists/:listId" element={<TodosView />} />
        <Route path="/settings" element={<SettingsView session={session} />} />
        <Route path="/login" element={<Navigate to="/home" replace />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Route>
    </Routes>
  )
}
