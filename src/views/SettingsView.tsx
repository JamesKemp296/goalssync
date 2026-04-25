import { useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import dayjs from 'dayjs'
import {
  Box,
  Avatar,
  Alert,
  Button,
  Container,
  Divider,
  ListItem,
  List,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { LoadingButton } from '@mui/lab'
import { TbCalendar, TbLogout2, TbMail, TbMoon } from 'react-icons/tb'
import AppHeader from '../components/AppHeader'
import { supabase } from '../supabase'
import { useThemeMode } from '../components/ThemeModeProvider'

type SettingsViewProps = {
  session: Session
}

export default function SettingsView({ session }: SettingsViewProps) {
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
  const [profileFeedback, setProfileFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const displayName = [firstName.trim(), lastName.trim()]
    .filter(Boolean)
    .join(' ')
  const initial = (displayName[0] ?? email[0] ?? '?').toUpperCase()

  const saveProfile = async () => {
    if (!supabase) return
    setSavingProfile(true)
    setProfileFeedback(null)
    const { error } = await supabase.auth.updateUser({
      data: {
        ...session.user.user_metadata,
        first_name: draftFirstName.trim() || null,
        last_name: draftLastName.trim() || null,
        birthday: draftBirthday || null,
      },
    })
    setSavingProfile(false)
    if (error) {
      setProfileFeedback({
        type: 'error',
        message: error.message,
      })
      return
    }
    setFirstName(draftFirstName.trim())
    setLastName(draftLastName.trim())
    setBirthday(draftBirthday)
    setIsEditingProfile(false)
    setProfileFeedback({
      type: 'success',
      message: 'Profile saved.',
    })
  }

  return (
    <>
      <AppHeader title="Settings" />
      <Container maxWidth="sm" sx={{ pt: 2 }}>
        <Stack spacing={1}>
          <Paper sx={{ p: 2, pb: 1, textAlign: 'center' }}>
            <Avatar
              sx={{
                width: 50,
                height: 50,
                mx: 'auto',
                bgcolor: 'primary.main',
                fontWeight: 900,
                fontSize: 28,
              }}
            >
              {initial}
            </Avatar>
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
                  setProfileFeedback(null)
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
                {profileFeedback ? (
                  <Alert severity={profileFeedback.type}>
                    {profileFeedback.message}
                  </Alert>
                ) : null}
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

          <Button
            variant="contained"
            color="warning"
            startIcon={<TbLogout2 size={18} />}
            onClick={() => void supabase?.auth.signOut()}
          >
            Sign out
          </Button>
        </Stack>
      </Container>
    </>
  )
}
