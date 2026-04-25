import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  Stack,
  TextField,
  Typography,
  Alert,
  Link,
} from '@mui/material'
import { supabase } from '../supabase'
import AceCatIcon from '../components/AceCatIcon'

type Msg = { type: 'error' | 'success'; text: string }

export default function AuthView() {
  const location = useLocation()
  const isForgotPassword = location.pathname === '/login/forgot-password'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [forgotEmail, setForgotEmail] = useState('')
  const [msg, setMsg] = useState<Msg | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const raw = window.location.hash.replace(/^#/, '')
    if (!raw) return
    const params = new URLSearchParams(raw)
    const errorCode = params.get('error_code')
    const error = params.get('error')
    if (error !== 'access_denied' && errorCode !== 'otp_expired') return

    const description = params.get('error_description')
    const decoded =
      description != null
        ? decodeURIComponent(description.replace(/\+/g, ' '))
        : ''

    if (errorCode === 'otp_expired') {
      setMsg({
        type: 'error',
        text: 'This reset link was already used or is no longer valid. Request a new link from Forgot password, then use only the newest email and open it once. If it still fails, try pasting the link into your browser (some email apps open links in the background and use up the token).',
      })
    } else {
      setMsg({
        type: 'error',
        text: decoded || 'Sign-in link was denied or is no longer valid.',
      })
    }

    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${window.location.search}`,
    )
  }, [])

  const submitAuth = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setLoading(true)
    setMsg(null)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) setMsg({ type: 'error', text: error.message })
    setLoading(false)
  }

  const submitForgot = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setLoading(true)
    setMsg(null)
    const redirectTo = `${window.location.origin}/reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(
      forgotEmail.trim(),
      { redirectTo },
    )
    if (error) setMsg({ type: 'error', text: error.message })
    else
      setMsg({
        type: 'success',
        text: 'If an account exists for that email, you will receive a reset link shortly.',
      })
    setLoading(false)
  }

  const authChrome = (
    <Stack spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
      <AceCatIcon width={72} height={72} aria-hidden />
      <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
        Goals Sync
      </Typography>
    </Stack>
  )

  if (isForgotPassword) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
          bgcolor: 'background.default',
        }}
      >
        <Card sx={{ p: 3, width: '100%', maxWidth: 360 }}>
          {authChrome}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2, textAlign: 'center' }}
          >
            Enter your email and we&apos;ll send you a link to choose a new
            password.
          </Typography>
          <form onSubmit={submitForgot}>
            <Stack spacing={2}>
              <TextField
                label="Email"
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                autoComplete="email"
                fullWidth
              />
              {msg && <Alert severity={msg.type}>{msg.text}</Alert>}
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                fullWidth
              >
                Send reset link
              </Button>
              <Typography variant="body2" sx={{ textAlign: 'center' }}>
                <Link component={RouterLink} to="/login" underline="hover">
                  Back to sign in
                </Link>
              </Typography>
            </Stack>
          </form>
        </Card>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        bgcolor: 'background.default',
      }}
    >
      <Card sx={{ p: 3, width: '100%', maxWidth: 360 }}>
        {authChrome}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2, textAlign: 'center' }}
        >
          Sign in with the email used in your invite.
        </Typography>
        <form onSubmit={submitAuth}>
          <Stack spacing={2}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              fullWidth
            />
            <Typography variant="body2" sx={{ textAlign: 'right' }}>
              <Link
                component={RouterLink}
                to="/login/forgot-password"
                underline="hover"
              >
                Forgot password?
              </Link>
            </Typography>
            {msg && <Alert severity={msg.type}>{msg.text}</Alert>}
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              fullWidth
            >
              Sign in
            </Button>
          </Stack>
        </form>
      </Card>
    </Box>
  )
}
