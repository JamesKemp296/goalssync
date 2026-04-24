import type { Session } from '@supabase/supabase-js'
import {
  Avatar,
  Button,
  Container,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Switch,
  Typography,
} from '@mui/material'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'
import AppHeader from '../components/AppHeader'
import { supabase } from '../supabase'
import { useThemeMode } from '../components/ThemeModeProvider'

type SettingsViewProps = {
  session: Session
}

export default function SettingsView({ session }: SettingsViewProps) {
  const { mode, setMode } = useThemeMode()
  const email = session.user.email ?? '—'
  const initial = (email[0] ?? '?').toUpperCase()

  return (
    <>
      <AppHeader title="Settings" />
      <Container maxWidth="sm" sx={{ pt: 2 }}>
        <Stack spacing={2}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                mx: 'auto',
                mb: 1.5,
                bgcolor: 'primary.main',
                fontWeight: 900,
                fontSize: 32,
              }}
            >
              {initial}
            </Avatar>
            <Typography variant="overline" color="text.secondary">
              Signed in as
            </Typography>
            <Typography variant="h6" noWrap>
              {email}
            </Typography>
          </Paper>

          <Paper>
            <Typography
              variant="overline"
              sx={{ px: 3, pt: 2, display: 'block', color: 'text.secondary' }}
            >
              Account
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <EmailOutlinedIcon />
                </ListItemIcon>
                <ListItemText primary="Email" secondary={email} />
              </ListItem>
              <Divider component="li" />
              <ListItem
                secondaryAction={
                  <Switch
                    edge="end"
                    checked={mode === 'dark'}
                    onChange={(_, checked) =>
                      setMode(checked ? 'dark' : 'light')
                    }
                    inputProps={{ 'aria-label': 'Toggle dark mode' }}
                  />
                }
              >
                <ListItemIcon>
                  <DarkModeOutlinedIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Dark mode"
                  secondary={mode === 'dark' ? 'On' : 'Off'}
                />
              </ListItem>
            </List>
          </Paper>

          <Button
            variant="outlined"
            color="error"
            startIcon={<LogoutRoundedIcon />}
            onClick={() => void supabase?.auth.signOut()}
          >
            Sign out
          </Button>
        </Stack>
      </Container>
    </>
  )
}
