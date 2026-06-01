import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import dayjs from 'dayjs'
import {
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  IconButton,
  ListItem,
  List,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
  useTheme,
} from '@mui/material'
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { LoadingButton } from '@mui/lab'
import { TbBell, TbCalendar, TbLogout2, TbMail, TbMoon, TbX } from 'react-icons/tb'
import AppHeader from '../components/AppHeader'
import AvatarCatPeek from '../components/AvatarCatPeek'
import CatRunGame from '../components/CatRunGame'
import { useAppToast } from '../components/AppSnackbar'
import { isLindseyUser } from '../lindseyUx'
import { isDeveloperUser } from '../developerAccess'
import {
  fetchPushEnabled,
  getPushPermission,
  isPushSupported,
  isVapidConfigured,
  sendTestPush,
  subscribeToPush,
  unsubscribeFromPush,
} from '../pushNotifications'
import { supabase } from '../supabase'
import { useThemeMode } from '../components/ThemeModeProvider'

type SettingsViewProps = {
  session: Session
}

export default function SettingsView({ session }: SettingsViewProps) {
  const toast = useAppToast()
  const theme = useTheme()
  const { mode, setMode } = useThemeMode()
  const metadata = session.user.user_metadata as
    | Record<string, unknown>
    | undefined
  const email = session.user.email ?? '—'
  const [firstName, setFirstName] = useState(
    typeof metadata?.first_name === 'string' ? metadata.first_name : '',
  )
  const [lastName, setLastName] = useState(
    typeof metadata?.last_name === 'string' ? metadata.last_name : '',
  )
  const [birthday, setBirthday] = useState(
    typeof metadata?.birthday === 'string' ? metadata.birthday : '',
  )
  const [draftFirstName, setDraftFirstName] = useState(firstName)
  const [draftLastName, setDraftLastName] = useState(lastName)
  const [draftBirthday, setDraftBirthday] = useState(birthday)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [avatarDrawerOpen, setAvatarDrawerOpen] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(true)
  const [pushToggling, setPushToggling] = useState(false)
  const [testPushLoading, setTestPushLoading] = useState(false)
  const displayName = [firstName.trim(), lastName.trim()]
    .filter(Boolean)
    .join(' ')
  const initial = (displayName[0] ?? email[0] ?? '?').toUpperCase()
  const lindseyUser = isLindseyUser(firstName.trim(), email)
  const catSvgSrc = lindseyUser ? '/icons/nutmeg.svg' : '/icons/ace.svg'
  const catName = lindseyUser ? 'Nutmeg' : 'Ace'
  const gameColors = useMemo(
    () => ({
      background: theme.palette.background.default,
      text: theme.palette.text.primary,
      ground: theme.palette.divider,
      obstacle: theme.palette.secondary.main,
      accent: theme.palette.primary.main,
    }),
    [theme],
  )
  const isDeveloper = isDeveloperUser(session.user.email)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setPushLoading(true)
      const enabled = await fetchPushEnabled(session.user.id)
      if (!cancelled) {
        setPushEnabled(enabled)
        setPushLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [session.user.id])

  const pushSupported = isPushSupported()
  const pushPermission = getPushPermission()
  const pushConfigured = isVapidConfigured()
  const pushBlocked = pushPermission === 'denied'
  const pushHelperText = !pushSupported
    ? 'Not supported in this browser.'
    : !pushConfigured
      ? 'Push is not configured for this environment.'
      : pushBlocked
        ? 'Notifications are blocked in browser settings.'
        : 'Monday 7am recap of your weekly lists.'

  const handlePushToggle = async (checked: boolean) => {
    setPushToggling(true)
    try {
      if (checked) {
        await subscribeToPush(session.user.id)
        setPushEnabled(true)
        toast('Notifications enabled', {
          subTitle: 'Weekly recap every Monday at 7am.',
          variant: 'success',
        })
      } else {
        await unsubscribeFromPush(session.user.id)
        setPushEnabled(false)
        toast('Notifications disabled', {
          subTitle: 'Weekly recap pushes are turned off.',
          variant: 'success',
        })
      }
    } catch (err) {
      toast('Could not update notifications', {
        subTitle: err instanceof Error ? err.message : 'Something went wrong.',
        variant: 'error',
      })
    } finally {
      setPushToggling(false)
    }
  }

  const handleTestPush = async () => {
    setTestPushLoading(true)
    try {
      const result = await sendTestPush()
      toast(result.title, {
        subTitle: result.body,
        variant: 'success',
      })
    } catch (err) {
      toast('Test push failed', {
        subTitle: err instanceof Error ? err.message : 'Something went wrong.',
        variant: 'error',
      })
    } finally {
      setTestPushLoading(false)
    }
  }

  const saveProfile = async () => {
    if (!supabase) return
    setSavingProfile(true)
    const nextFirstName = draftFirstName.trim()
    const nextLastName = draftLastName.trim()
    const { error } = await supabase.auth.updateUser({
      data: {
        ...session.user.user_metadata,
        first_name: nextFirstName || null,
        last_name: nextLastName || null,
        birthday: draftBirthday || null,
      },
    })
    if (error) {
      setSavingProfile(false)
      toast('Could not save profile', {
        subTitle: error.message,
        variant: 'error',
      })
      return
    }
    if (session.user.email) {
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: session.user.id,
        email: session.user.email.toLowerCase(),
        first_name: nextFirstName || null,
        last_name: nextLastName || null,
      })
      if (profileError) {
        setSavingProfile(false)
        toast('Profile partially saved', {
          subTitle: `Public profile sync failed: ${profileError.message}`,
          variant: 'error',
        })
        return
      }
    }
    setSavingProfile(false)
    setFirstName(nextFirstName)
    setLastName(nextLastName)
    setBirthday(draftBirthday)
    setIsEditingProfile(false)
    toast('Profile saved', {
      subTitle: 'Your account details were updated.',
      variant: 'success',
    })
  }

  return (
    <>
      <AppHeader title="Settings" />
      <Container maxWidth="sm" sx={{ py: 2 }}>
        <Stack spacing={1}>
          <Paper sx={{ p: 2, pb: 1, textAlign: 'center' }}>
            <AvatarCatPeek
              initial={initial}
              lindseyUser={lindseyUser}
              catName={catName}
              onClick={() => setAvatarDrawerOpen(true)}
            />
            <Typography variant="h6" noWrap>
              {displayName || email}
            </Typography>
          </Paper>
          <Box>
            <Typography
              variant="overline"
              sx={{ color: 'text.secondary', fontWeight: 600 }}
            >
              Account
            </Typography>
            <Paper>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <TbMail size={18} />
                  </ListItemIcon>
                  <ListItemText primary="Email" secondary={email} />
                </ListItem>
                <Divider component="li" sx={{ mx: 2 }} />
                <ListItem>
                  <ListItemIcon>
                    <TbCalendar size={18} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Created"
                    secondary={dayjs(session.user.created_at).format(
                      'MM/DD/YYYY',
                    )}
                  />
                </ListItem>
                <Divider component="li" sx={{ mx: 2 }} />
                <ListItem
                  secondaryAction={
                    <Switch
                      edge="end"
                      checked={mode === 'dark'}
                      onChange={(_, checked) =>
                        setMode(checked ? 'dark' : 'light')
                      }
                      slotProps={{
                        input: { 'aria-label': 'Toggle dark mode' },
                      }}
                    />
                  }
                >
                  <ListItemIcon>
                    <TbMoon size={18} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Dark mode"
                    secondary={mode === 'dark' ? 'On' : 'Off'}
                  />
                </ListItem>
              </List>
            </Paper>
          </Box>
          <Box>
            <Typography
              variant="overline"
              sx={{ color: 'text.secondary', fontWeight: 600, pt: 1 }}
            >
              Notifications
            </Typography>
            <Paper>
              <List>
                <ListItem
                  secondaryAction={
                    <Switch
                      edge="end"
                      checked={pushEnabled}
                      disabled={
                        pushLoading ||
                        pushToggling ||
                        !pushSupported ||
                        !pushConfigured ||
                        pushBlocked
                      }
                      onChange={(_, checked) => void handlePushToggle(checked)}
                      slotProps={{
                        input: { 'aria-label': 'Toggle weekly recap notifications' },
                      }}
                    />
                  }
                >
                  <ListItemIcon>
                    <TbBell size={18} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Weekly recap (Monday 7am)"
                    secondary={pushHelperText}
                  />
                </ListItem>
              </List>
            </Paper>
          </Box>
          <Box>
            <Box
              sx={{
                pt: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography
                variant="overline"
                sx={{ color: 'text.secondary', fontWeight: 600 }}
              >
                Profile
              </Typography>
              <Button
                variant="text"
                size="small"
                onClick={() => {
                  if (isEditingProfile) {
                    setDraftFirstName(firstName)
                    setDraftLastName(lastName)
                    setDraftBirthday(birthday)
                    setIsEditingProfile(false)
                    return
                  }
                  setDraftFirstName(firstName)
                  setDraftLastName(lastName)
                  setDraftBirthday(birthday)
                  setIsEditingProfile(true)
                }}
              >
                {isEditingProfile ? 'Cancel' : 'Edit'}
              </Button>
            </Box>
            <Paper sx={{ p: 2 }}>
              <Stack spacing={1.5}>
                {isEditingProfile ? (
                  <>
                    <TextField
                      label="First name"
                      value={draftFirstName}
                      onChange={(e) => setDraftFirstName(e.target.value)}
                      fullWidth
                      size="small"
                    />
                    <Divider />
                    <TextField
                      label="Last name"
                      value={draftLastName}
                      onChange={(e) => setDraftLastName(e.target.value)}
                      fullWidth
                      size="small"
                    />
                    <Divider />
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                      <DatePicker
                        label="Birthday"
                        value={draftBirthday ? dayjs(draftBirthday) : null}
                        onChange={(value) =>
                          setDraftBirthday(
                            value?.isValid() ? value.format('YYYY-MM-DD') : '',
                          )
                        }
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            size: 'small',
                          },
                        }}
                      />
                    </LocalizationProvider>
                  </>
                ) : (
                  <>
                    <Box sx={{ px: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        First name
                      </Typography>
                      <Typography>{firstName || '—'}</Typography>
                    </Box>
                    <Divider />
                    <Box sx={{ px: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Last name
                      </Typography>
                      <Typography>{lastName || '—'}</Typography>
                    </Box>
                    <Divider />
                    <Box sx={{ px: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Birthday
                      </Typography>
                      <Typography>
                        {birthday ? dayjs(birthday).format('MM/DD/YYYY') : '—'}
                      </Typography>
                    </Box>
                  </>
                )}
                {isEditingProfile ? (
                  <LoadingButton
                    variant="contained"
                    color="primary"
                    onClick={() => void saveProfile()}
                    loading={savingProfile}
                    fullWidth
                  >
                    Save profile
                  </LoadingButton>
                ) : null}
              </Stack>
            </Paper>
          </Box>

          {isDeveloper ? (
            <Box>
              <Typography
                variant="overline"
                sx={{ color: 'text.secondary', fontWeight: 600, pt: 1 }}
              >
                Developer
              </Typography>
              <Paper sx={{ p: 2 }}>
                <Stack spacing={1.5}>
                  <Typography variant="body2" color="text.secondary">
                    Send a test weekly-recap push to this device now (uses your
                    latest weekly history when available).
                  </Typography>
                  <LoadingButton
                    variant="outlined"
                    loading={testPushLoading}
                    disabled={!pushEnabled || testPushLoading}
                    onClick={() => void handleTestPush()}
                  >
                    Send test push
                  </LoadingButton>
                  {!pushEnabled ? (
                    <Typography variant="caption" color="text.secondary">
                      Enable weekly recap notifications above first.
                    </Typography>
                  ) : null}
                </Stack>
              </Paper>
            </Box>
          ) : null}

          <Button
            variant="contained"
            color="primary"
            startIcon={<TbLogout2 size={18} />}
            onClick={() => void supabase?.auth.signOut()}
          >
            Sign out
          </Button>
        </Stack>
      </Container>

      <Drawer
        anchor="bottom"
        open={avatarDrawerOpen}
        onClose={() => setAvatarDrawerOpen(false)}
        slotProps={{
          paper: {
            sx: {
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              maxHeight: '88dvh',
              pb: 'calc(8px + env(safe-area-inset-bottom))',
            },
          },
        }}
      >
        <Box
          sx={{
            px: 2,
            pt: 2,
            pb: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Run, {catName}!
          </Typography>
          <IconButton
            aria-label="Close game"
            onClick={() => setAvatarDrawerOpen(false)}
            edge="end"
          >
            <TbX size={20} />
          </IconButton>
        </Box>
        {avatarDrawerOpen ? (
          <CatRunGame catSvgSrc={catSvgSrc} colors={gameColors} />
        ) : null}
      </Drawer>
    </>
  )
}
