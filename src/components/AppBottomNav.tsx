import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material'
import { TbHome, TbListCheck, TbSettings, TbUsers } from 'react-icons/tb'
import { useLocation, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'

type Tab = {
  value: string
  label: string
  icon: ReactNode
  disabled?: boolean
}

const TABS: Tab[] = [
  { value: '/home', label: 'Home', icon: <TbHome size={20} /> },
  { value: '/lists', label: 'Lists', icon: <TbListCheck size={20} /> },
  { value: '/friends', label: 'Friends', icon: <TbUsers size={20} /> },
  { value: '/settings', label: 'Settings', icon: <TbSettings size={20} /> },
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
        border: 'none',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        borderRadius: 0,
        overflow: 'hidden',
        pb: 'env(safe-area-inset-bottom)',
        pl: 'env(safe-area-inset-left)',
        pr: 'env(safe-area-inset-right)',
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
