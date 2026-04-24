import type { ReactNode } from 'react'
import { Box } from '@mui/material'

type ViewProps = {
  children: ReactNode
}

export default function View({ children }: ViewProps) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      {children}
    </Box>
  )
}
