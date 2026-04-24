import { Box } from '@mui/material'
import { Outlet } from 'react-router-dom'
import AppBottomNav from './AppBottomNav'

export default function AppShell() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      <Box sx={{ flex: 1, pb: 14 }}>
        <Outlet />
      </Box>
      <AppBottomNav />
    </Box>
  )
}
