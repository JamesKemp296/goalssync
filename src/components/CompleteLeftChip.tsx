import { Box, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'

type CompleteLeftChipProps = {
  kind: 'complete' | 'left'
  count: number
  accentColor: string
}

export default function CompleteLeftChip({
  kind,
  count,
  accentColor,
}: CompleteLeftChipProps) {
  const isComplete = kind === 'complete'
  const label = `${count} ${isComplete ? 'completed' : 'left'}`

  return (
    <Box
      sx={{
        px: 1,
        py: 0.5,
        borderRadius: 999,
        bgcolor: isComplete ? alpha(accentColor, 0.18) : 'action.hover',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          fontSize: '0.55rem',
          color: isComplete ? accentColor : 'text.secondary',
          textAlign: 'center',
        }}
      >
        {label}
      </Typography>
    </Box>
  )
}
