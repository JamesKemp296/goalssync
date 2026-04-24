import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material'
import HomeRoundedIcon from '@mui/icons-material/HomeRounded'
import FormatListBulletedRoundedIcon from '@mui/icons-material/FormatListBulletedRounded'
import GroupRoundedIcon from '@mui/icons-material/GroupRounded'
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded'
import { useLocation, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'

type Tab = {
  value: string
  label: string
  icon: ReactNode
  disabled?: boolean
}

const TABS: Tab[] = [
  { value: '/home', label: 'Home', icon: <HomeRoundedIcon /> },
  { value: '/lists', label: 'Lists', icon: <FormatListBulletedRoundedIcon /> },
  {
    value: '/friends',
    label: 'Friends',
    icon: <GroupRoundedIcon />,
    disabled: true,
  },
  { value: '/settings', label: 'Settings', icon: <SettingsRoundedIcon /> },
]

export default function AppBottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const activeTab =
    TABS.find((t) => pathname.startsWith(t.value))?.value ?? '/home'

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        overflow: 'hidden',
      }}
    >
      <BottomNavigation
        value={activeTab}
        onChange={(_, value: string) => navigate(value)}
        showLabels
        sx={{ height: 64, bgcolor: 'transparent' }}
      >
        {TABS.map((tab) => (
          <BottomNavigationAction
            key={tab.value}
            value={tab.value}
            label={tab.label}
            icon={tab.icon}
            disabled={tab.disabled}
          />
        ))}
      </BottomNavigation>
    </Paper>
  )
}
