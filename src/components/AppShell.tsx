import { Box } from '@mui/material'
import { Outlet } from 'react-router-dom'
import AppBottomNav from './AppBottomNav'

export default function AppShell() {
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
