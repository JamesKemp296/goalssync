import { useEffect } from 'react'
import { Box } from '@mui/material'
import { Outlet, useLocation } from 'react-router-dom'
import AppBottomNav from './AppBottomNav'

export default function AppShell() {
  const location = useLocation()

  useEffect(() => {
    const path = location.pathname
    let view = 'Goals Sync'

    if (path === '/home' || path === '/') view = 'Home'
    else if (path === '/lists') view = 'Lists'
    else if (path.startsWith('/lists/')) view = 'List'
    else if (path === '/friends') view = 'Friends'
    else if (path === '/settings') view = 'Settings'
    else if (path === '/login') view = 'Sign in'

    document.title = `${view} • Goals Sync`
  }, [location.pathname])

  return (
    <Box
      sx={{
        height: '100dvh',
        maxHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          // Bottom nav is position:fixed — reserve its height so content isn’t covered
          pb: '64px',
          overflowY: 'auto',
        }}
      >
        <Outlet />
      </Box>
      <AppBottomNav />
    </Box>
  )
}
