import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { Alert, Box, Button, Card, Link, Stack, TextField, Typography } from '@mui/material'
import { supabase } from '../supabase'
import AceCatIcon from '../components/AceCatIcon'

type Msg = { type: 'error' | 'success'; text: string }

export default function ResetPasswordView() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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

    setMsg({
      type: 'error',
      text:
        errorCode === 'otp_expired'
          ? 'This reset link is already used or has expired. Please request a new reset email and open only the newest link once.'
          : decoded || 'Reset link is invalid or no longer valid.',
    })

    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${window.location.search}`,
    )
  }, [])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    if (password.length < 8) {
      setMsg({
        type: 'error',
        text: 'Password must be at least 8 characters.',
      })
      return
    }
    if (password !== confirmPassword) {
      setMsg({ type: 'error', text: 'Passwords do not match.' })
      return
    }

    setLoading(true)
    setMsg(null)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setMsg({
        type: 'error',
        text:
          error.message ||
          'Could not reset password. Open the latest reset email and try again.',
      })
      setLoading(false)
      return
    }

    setMsg({ type: 'success', text: 'Password updated. Redirecting to Home...' })
    setLoading(false)
    window.setTimeout(() => navigate('/home', { replace: true }), 800)
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
        <Stack spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
          <AceCatIcon width={72} height={72} aria-hidden />
          <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
            Reset password
          </Typography>
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Choose a new password for your account.
        </Typography>

        <form onSubmit={submit}>
          <Stack spacing={2}>
            <TextField
              label="New password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              fullWidth
            />
            <TextField
              label="Confirm new password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              fullWidth
            />
            {msg && <Alert severity={msg.type}>{msg.text}</Alert>}
            <Button type="submit" variant="contained" disabled={loading} fullWidth>
              Save new password
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
