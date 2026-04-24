import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { CircularProgress, Box, Alert, Container } from '@mui/material'
import { supabase, supabaseConfigError } from './supabase'
import View from './components/View'
import AuthView from './views/AuthView'
import ListsView from './views/ListsView'
import TodosView from './views/TodosView'

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
      <View>
        <Container maxWidth="sm" sx={{ mt: 8 }}>
          <Alert severity="error">
            {supabaseConfigError}. Create `.env` from `.env.example` and restart `npm run dev`.
          </Alert>
        </Container>
      </View>
    )
  }

  if (session === undefined) {
    return (
      <View>
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </View>
    )
  }

  return (
    <View>
      <Routes>
        <Route
          path="/login"
          element={session ? <Navigate to="/" replace /> : <AuthView />}
        />
        <Route
          path="/"
          element={session ? <ListsView session={session} /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/lists/:listId"
          element={session ? <TodosView session={session} /> : <Navigate to="/login" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </View>
  )
}
