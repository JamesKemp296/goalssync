import { Box } from '@mui/material'
import type { SwipeActionColor } from './swipeActions'
import { SWIPE_ACTION_BUTTON_WIDTH } from './swipeActions'

type SwipeActionButtonProps = {
  label: string
  icon: React.ReactNode
  color: SwipeActionColor
  onClick: () => void
}

export default function SwipeActionButton({
  label,
  icon,
  color,
  onClick,
}: SwipeActionButtonProps) {
  return (
    <Box
      component="button"
      type="button"
      aria-label={label}
      onClick={onClick}
      data-no-toggle="true"
      sx={{
        width: SWIPE_ACTION_BUTTON_WIDTH,
        border: 0,
        borderRadius: 2,
        cursor: 'pointer',
        bgcolor: `${color}.main`,
        color: `${color}.contrastText`,
        display: 'grid',
        placeItems: 'center',
        '&:active': { opacity: 0.9 },
      }}
    >
      {icon}
    </Box>
  )
}
