import { Stack } from '@mui/material'
import SwipeActionButton from './SwipeActionButton'
import type { SwipeAction } from './swipeActions'
import { SWIPE_ACTION_BUTTON_GAP } from './swipeActions'

type SwipeActionButtonsProps = {
  actions: SwipeAction[]
  width: number
  inset?: { top?: number; bottom?: number }
}

export default function SwipeActionButtons({
  actions,
  width,
  inset = { top: 4, bottom: 4 },
}: SwipeActionButtonsProps) {
  if (actions.length === 0 || width === 0) return null

  return (
    <Stack
      direction="row"
      sx={{
        position: 'absolute',
        top: inset.top,
        right: 0,
        bottom: inset.bottom,
        width,
        zIndex: 0,
        justifyContent: 'flex-end',
        gap: `${SWIPE_ACTION_BUTTON_GAP}px`,
      }}
    >
      {actions.map((action) => (
        <SwipeActionButton
          key={action.key}
          label={action.label}
          icon={action.icon}
          color={action.color}
          onClick={action.onClick}
        />
      ))}
    </Stack>
  )
}
