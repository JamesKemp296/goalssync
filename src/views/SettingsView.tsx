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
  fetchNotificationPrefs,
  getPushPermission,
  isPushSupported,
  isVapidConfigured,
  requestPushPermission,
  sendTestPush,
  setDailyReminderEnabled as updateDailyReminderEnabled,
  setWeeklyRecapEnabled as updateWeeklyRecapEnabled,
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
  const [dailyReminderEnabled, setDailyReminderEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(true)
  const [pushToggling, setPushToggling] = useState(false)
  const [dailyReminderToggling, setDailyReminderToggling] = useState(false)
  const [weeklyPushStatus, setWeeklyPushStatus] = useState('')
  const [dailyPushStatus, setDailyPushStatus] = useState('')
  const [testWeeklyPushLoading, setTestWeeklyPushLoading] = useState(false)
  const [testDailyPushLoading, setTestDailyPushLoading] = useState(false)
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
      try {
        const prefs = await fetchNotificationPrefs(session.user.id)
        if (!cancelled) {
          setPushEnabled(prefs.weeklyRecap)
          setDailyReminderEnabled(prefs.dailyReminder)
        }
      } catch (err) {
        if (!cancelled) {
          toast('Could not load notification settings', {
            subTitle: err instanceof Error ? err.message : 'Something went wrong.',
            variant: 'error',
          })
        }
      } finally {
        if (!cancelled) setPushLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [session.user.id, toast])

  const pushSupported = isPushSupported()
  const pushPermission = getPushPermission()
  const pushConfigured = isVapidConfigured()
  const pushBlocked = pushPermission === 'denied'
  const pushUnavailable =
    pushLoading ||
    !pushSupported ||
    !pushConfigured ||
    pushBlocked
  const weeklyHelperText = weeklyPushStatus
    ? weeklyPushStatus
    : !pushSupported
      ? 'Not supported in this browser.'
      : !pushConfigured
        ? 'Push is not configured for this environment.'
        : pushBlocked
          ? 'Notifications are blocked in browser settings.'
          : 'Monday 7am recap of your weekly lists.'
  const dailyHelperText = dailyPushStatus
    ? dailyPushStatus
    : !pushSupported
      ? 'Not supported in this browser.'
      : !pushConfigured
        ? 'Push is not configured for this environment.'
        : pushBlocked
          ? 'Notifications are blocked in browser settings.'
          : 'Nudge to finish open tasks on your daily lists.'

  const handlePushToggle = (checked: boolean) => {
    if (pushToggling) return
    void (async () => {
      setPushToggling(true)
      try {
        if (checked) {
          setWeeklyPushStatus('Allow notifications when prompted…')
          await requestPushPermission()
          setWeeklyPushStatus('Saving subscription…')
          await updateWeeklyRecapEnabled(session.user.id, true)
          setPushEnabled(true)
          toast('Weekly recap enabled', {
            subTitle: 'Every Monday at 7am.',
            variant: 'success',
          })
        } else {
          setWeeklyPushStatus('Turning off…')
          await updateWeeklyRecapEnabled(session.user.id, false)
          setPushEnabled(false)
          toast('Weekly recap disabled', {
            subTitle: 'Monday morning pushes are turned off.',
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
        setWeeklyPushStatus('')
      }
    })()
  }

  const handleDailyReminderToggle = (checked: boolean) => {
    if (dailyReminderToggling) return
    void (async () => {
      setDailyReminderToggling(true)
      try {
        if (checked) {
          setDailyPushStatus('Allow notifications when prompted…')
          await requestPushPermission()
          setDailyPushStatus('Saving subscription…')
          await updateDailyReminderEnabled(session.user.id, true)
          setDailyReminderEnabled(true)
          toast('Daily reminder enabled', {
            subTitle: 'Every night at 10pm when tasks are left.',
            variant: 'success',
          })
        } else {
          setDailyPushStatus('Turning off…')
          await updateDailyReminderEnabled(session.user.id, false)
          setDailyReminderEnabled(false)
          toast('Daily reminder disabled', {
            subTitle: 'Evening nudges are turned off.',
            variant: 'success',
          })
        }
      } catch (err) {
        toast('Could not update notifications', {
          subTitle: err instanceof Error ? err.message : 'Something went wrong.',
          variant: 'error',
        })
      } finally {
        setDailyReminderToggling(false)
        setDailyPushStatus('')
      }
    })()
  }

  const handleTestPush = async (type: 'weekly_recap' | 'daily_reminder') => {
    const setLoading =
      type === 'weekly_recap' ? setTestWeeklyPushLoading : setTestDailyPushLoading
    setLoading(true)
    try {
      const result = await sendTestPush(type)
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
      setLoading(false)
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
                <ListItem sx={{ pr: 2, gap: 1 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <TbBell size={18} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Weekly recap (Monday 7am)"
                    secondary={weeklyHelperText}
                  />
                  <Switch
                    edge="end"
                    checked={pushEnabled}
                    disabled={pushUnavailable || pushToggling}
                    onChange={(_, checked) => handlePushToggle(checked)}
                    slotProps={{
                      input: { 'aria-label': 'Toggle weekly recap notifications' },
                    }}
                    sx={{ flexShrink: 0 }}
                  />
                </ListItem>
                <Divider component="li" sx={{ mx: 2 }} />
                <ListItem sx={{ pr: 2, gap: 1 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <TbBell size={18} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Daily reminder (10pm)"
                    secondary={dailyHelperText}
                  />
                  <Switch
                    edge="end"
                    checked={dailyReminderEnabled}
                    disabled={pushUnavailable || dailyReminderToggling}
                    onChange={(_, checked) => handleDailyReminderToggle(checked)}
                    slotProps={{
                      input: { 'aria-label': 'Toggle daily reminder notifications' },
                    }}
                    sx={{ flexShrink: 0 }}
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
                    Send test pushes to this device using each notification
                    type&apos;s copy.
                  </Typography>
                  <LoadingButton
                    variant="outlined"
                    loading={testWeeklyPushLoading}
                    disabled={!pushEnabled || testWeeklyPushLoading}
                    onClick={() => void handleTestPush('weekly_recap')}
                  >
                    Test weekly recap push
                  </LoadingButton>
                  {!pushEnabled ? (
                    <Typography variant="caption" color="text.secondary">
                      Enable weekly recap notifications above first.
                    </Typography>
                  ) : null}
                  <LoadingButton
                    variant="outlined"
                    loading={testDailyPushLoading}
                    disabled={!dailyReminderEnabled || testDailyPushLoading}
                    onClick={() => void handleTestPush('daily_reminder')}
                  >
                    Test daily reminder push
                  </LoadingButton>
                  {!dailyReminderEnabled ? (
                    <Typography variant="caption" color="text.secondary">
                      Enable daily reminder notifications above first.
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
