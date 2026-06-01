import type { ReactNode } from 'react'

export const SWIPE_ACTION_BUTTON_WIDTH = 50
export const SWIPE_ACTION_BUTTON_GAP = 8
export const SWIPE_ACTION_REVEAL_GAP = 8

export type SwipeActionColor = 'info' | 'warning' | 'error' | 'secondary' | 'primary'

export type SwipeAction = {
  key: string
  label: string
  icon: ReactNode
  color: SwipeActionColor
  onClick: () => void
}

export function computeSwipeActionsWidth(actionCount: number): number {
  if (actionCount <= 0) return 0
  return (
    SWIPE_ACTION_BUTTON_WIDTH * actionCount +
    SWIPE_ACTION_BUTTON_GAP * Math.max(0, actionCount - 1) +
    SWIPE_ACTION_REVEAL_GAP
  )
}

export function swipeActionButtonsWidth(actionCount: number): number {
  const total = computeSwipeActionsWidth(actionCount)
  return total > 0 ? total - SWIPE_ACTION_REVEAL_GAP : 0
}
