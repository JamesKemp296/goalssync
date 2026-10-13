import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
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
import {
  TbBell,
  TbCalendar,
  TbLogout2,
  TbMail,
  TbMoon,
  TbX,
} from 'react-icons/tb'
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
  notificationSettingsHint,
  PushPermissionError,
  requestPushPermission,
  sendTestPush,
  setDailyReminderEnabled as updateDailyReminderEnabled,
  setWeeklyRecapEnabled as updateWeeklyRecapEnabled,
  unsupportedMessage,
} from '../pushNotifications'
import { usePushPermission } from '../usePushPermission'
import { supabase } from '../supabase'
import { useThemeMode } from '../components/ThemeModeProvider'

type SettingsViewProps = {
  session: Session
}

type NotificationKind = 'weekly' | 'daily'

const NOTIFICATION_KINDS: NotificationKind[] = ['weekly', 'daily']

const NOTIFICATION_COPY: Record<
  NotificationKind,
  {
    description: string
    onTitle: string
    onSubtitle: string
    offTitle: string
    offSubtitle: string
  }
> = {
  weekly: {
    description:
      'A quick look at how your weekly lists went, every Monday at 7am.',
    onTitle: 'Weekly recap is on',
    onSubtitle: 'You’ll get it every Monday at 7am.',
    offTitle: 'Weekly recap is off',
    offSubtitle: 'You won’t get Monday recaps anymore.',
  },
  daily: {
    description: 'A nudge at 10pm if anything’s left on your daily lists.',
    onTitle: 'Daily reminder is on',
    onSubtitle:
      'We’ll nudge you at 10pm if anything’s left on your daily lists.',
    offTitle: 'Daily reminder is off',
    offSubtitle: 'No more evening nudges.',
  },
}

const SAVE_NOTIFICATION_PREF: Record<
  NotificationKind,
  (userId: string, enabled: boolean) => Promise<void>
> = {
  weekly: updateWeeklyRecapEnabled,
  daily: updateDailyReminderEnabled,
}

function setForKind<T>(
  setter: Dispatch<SetStateAction<Record<NotificationKind, T>>>,
  kind: NotificationKind,
  value: NoInfer<T>,
) {
  setter((prev) => ({ ...prev, [kind]: value }))
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
  const [notificationsOn, setNotificationsOn] = useState<
    Record<NotificationKind, boolean>
  >({ weekly: false, daily: false })
  const [pushLoading, setPushLoading] = useState(true)
  const [toggling, setToggling] = useState<Record<NotificationKind, boolean>>({
    weekly: false,
    daily: false,
  })
  const [notificationStatus, setNotificationStatus] = useState<
    Record<NotificationKind, string>
  >({ weekly: '', daily: '' })
  const [awaitingPermission, setAwaitingPermission] = useState<
    Record<NotificationKind, boolean>
  >({ weekly: false, daily: false })
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
          setNotificationsOn({
            weekly: prefs.weeklyRecap,
            daily: prefs.dailyReminder,
          })
        }
      } catch (err) {
        if (!cancelled) {
          toast('Couldn’t load your notification settings', {
            subTitle:
              err instanceof Error
                ? err.message
                : 'Please try again in a moment.',
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
  const pushPermission = usePushPermission()
  const pushConfigured = isVapidConfigured()
  const pushBlocked = pushPermission === 'denied'
  const pushUnavailable =
    pushLoading || !pushSupported || !pushConfigured || pushBlocked

  const helperText = (kind: NotificationKind): string => {
    if (notificationStatus[kind]) return notificationStatus[kind]
    if (!pushSupported) return unsupportedMessage()
    if (!pushConfigured) return 'Notifications aren’t available right now.'
    if (pushBlocked) {
      return `Notifications are turned off for the app. ${notificationSettingsHint()}`
    }
    if (awaitingPermission[kind]) {
      return `Almost there. ${notificationSettingsHint()}`
    }
    return NOTIFICATION_COPY[kind].description
  }

  const toggleNotification = (kind: NotificationKind, checked: boolean) => {
    if (toggling[kind]) return
    const copy = NOTIFICATION_COPY[kind]
    // Must stay synchronous up to requestPushPermission so the tap still
    // counts as the user gesture that allows the permission popup.
    void (async () => {
      setForKind(setToggling, kind, true)
      setForKind(setAwaitingPermission, kind, false)
      try {
        if (checked) {
          if (getPushPermission() === 'default') {
            setForKind(
              setNotificationStatus,
              kind,
              'Tap “Allow” when your phone asks.',
            )
          }
          await requestPushPermission({
            onSlow: () =>
              setForKind(
                setNotificationStatus,
                kind,
                'Still waiting for your phone to ask…',
              ),
          })
        }
        setForKind(
          setNotificationStatus,
          kind,
          checked ? 'Turning on…' : 'Turning off…',
        )
        await SAVE_NOTIFICATION_PREF[kind](session.user.id, checked)
        setForKind(setNotificationsOn, kind, checked)
        toast(checked ? copy.onTitle : copy.offTitle, {
          subTitle: checked ? copy.onSubtitle : copy.offSubtitle,
          variant: 'success',
        })
      } catch (err) {
        const noAnswer =
          err instanceof PushPermissionError && err.reason === 'no-answer'
        if (noAnswer) setForKind(setAwaitingPermission, kind, true)
        toast(
          noAnswer
            ? 'One more step'
            : checked
              ? 'Couldn’t turn on notifications'
              : 'Couldn’t turn off notifications',
          {
            subTitle:
              err instanceof Error
                ? err.message
                : 'Something went wrong. Please try again.',
            variant: noAnswer ? 'info' : 'error',
          },
        )
      } finally {
        setForKind(setToggling, kind, false)
        setForKind(setNotificationStatus, kind, '')
      }
    })()
  }

  // If the popup never appeared and the user allowed notifications in system
  // settings instead, finish turning on whatever they tapped.
  useEffect(() => {
    if (pushPermission === 'default') return
    for (const kind of NOTIFICATION_KINDS) {
      if (!awaitingPermission[kind]) continue
      if (pushPermission === 'granted') {
        toggleNotification(kind, true)
      } else {
        setForKind(setAwaitingPermission, kind, false)
      }
    }
  }, [pushPermission, awaitingPermission])

  const handleTestPush = async (type: 'weekly_recap' | 'daily_reminder') => {
    const setLoading =
      type === 'weekly_recap'
        ? setTestWeeklyPushLoading
        : setTestDailyPushLoading
    setLoading(true)
    try {
      const result = await sendTestPush(type)
      const failures = result.results.filter((r) => !r.success)
      toast(result.title, {
        subTitle: result.body,
        variant: 'success',
      })
      // A test push can "succeed" overall (e.g. delivered to an iPhone) while
      // silently failing on another registered device (e.g. Android) — call
      // that out explicitly so it isn't mistaken for working everywhere.
      for (const failure of failures) {
        toast(`Push failed on ${failure.device}`, {
          subTitle: failure.error ?? 'Unknown error',
          variant: 'error',
        })
      }
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
                    secondary={helperText('weekly')}
                  />
                  <Switch
                    edge="end"
                    checked={notificationsOn.weekly}
                    disabled={pushUnavailable || toggling.weekly}
                    onChange={(_, checked) =>
                      toggleNotification('weekly', checked)
                    }
                    slotProps={{
                      input: {
                        'aria-label': 'Toggle weekly recap notifications',
                      },
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
                    secondary={helperText('daily')}
                  />
                  <Switch
                    edge="end"
                    checked={notificationsOn.daily}
                    disabled={pushUnavailable || toggling.daily}
                    onChange={(_, checked) =>
                      toggleNotification('daily', checked)
                    }
                    slotProps={{
                      input: {
                        'aria-label': 'Toggle daily reminder notifications',
                      },
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
                    disabled={!notificationsOn.weekly || testWeeklyPushLoading}
                    onClick={() => void handleTestPush('weekly_recap')}
                  >
                    Test weekly recap push
                  </LoadingButton>
                  {!notificationsOn.weekly ? (
                    <Typography variant="caption" color="text.secondary">
                      Enable weekly recap notifications above first.
                    </Typography>
                  ) : null}
                  <LoadingButton
                    variant="outlined"
                    loading={testDailyPushLoading}
                    disabled={!notificationsOn.daily || testDailyPushLoading}
                    onClick={() => void handleTestPush('daily_reminder')}
                  >
                    Test daily reminder push
                  </LoadingButton>
                  {!notificationsOn.daily ? (
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
