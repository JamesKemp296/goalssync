import { useState } from 'react'
import type { FormEvent } from 'react'
import { Box, Button, Card, Stack, TextField, Tab, Tabs, Typography, Alert } from '@mui/material'
import { supabase } from '../supabase'

type Msg = { type: 'error' | 'success'; text: string }

export default function AuthView() {
  const [tab, setTab] = useState(0)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<Msg | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setLoading(true)
    setMsg(null)
    const { error } =
      tab === 0
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })
    if (error) setMsg({ type: 'error', text: error.message })
    else if (tab === 1) setMsg({ type: 'success', text: 'Check your email to confirm your account.' })
    setLoading(false)
  }

  return (
    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Card sx={{ p: 3, width: 360 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>Todo</Typography>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="Sign in" />
          <Tab label="Sign up" />
        </Tabs>
        <form onSubmit={submit}>
          <Stack spacing={2}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {msg && <Alert severity={msg.type}>{msg.text}</Alert>}
            <Button type="submit" variant="contained" disabled={loading}>
              {tab === 0 ? 'Sign in' : 'Sign up'}
            </Button>
          </Stack>
        </form>
      </Card>
    </Box>
  )
}
