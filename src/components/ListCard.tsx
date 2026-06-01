import { useEffect, useState } from 'react'
import { Box, Card, LinearProgress, Skeleton, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { TbPin, TbRefresh } from 'react-icons/tb'
import { getListIconComponent, normalizeListIcon } from '../listIcons'
import {
  TIME_FRAME_SHORT,
  computeNextResetAt,
  formatResetCountdown,
  type ListTimeFrame,
} from '../timeFrames'
import SwipeActionButtons from './swipe/SwipeActionButtons'
import type { SwipeAction } from './swipe/swipeActions'
import { swipeActionButtonsWidth } from './swipe/swipeActions'
import type { SwipeRevealGroup } from './swipe/useSwipeRevealGroup'

type ListCardSwipeRow = ReturnType<SwipeRevealGroup<number>['bindRow']>

type ListCardProps = {
  listId: number
  title: string
  listColor: string
  progress: number
  total: number
  completed: number
  iconKey?: string | null
  isPinned?: boolean
  loading?: boolean
  timeFrame?: ListTimeFrame
  nextResetAt?: string | null
  swipeActions?: SwipeAction[]
  swipeRow?: ListCardSwipeRow
}

export default function ListCard({
  listId: _listId,
  title,
  listColor,
  progress,
  total,
  completed,
  iconKey,
  isPinned = false,
  loading = false,
  timeFrame,
  nextResetAt = null,
  swipeActions = [],
  swipeRow,
}: ListCardProps) {
  const [now, setNow] = useState(() => new Date())
  const showCadence = !!timeFrame && timeFrame !== 'none' && !loading

  useEffect(() => {
    if (!nextResetAt && !showCadence) return
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [nextResetAt, showCadence])

  const ListIcon = getListIconComponent(normalizeListIcon(iconKey))
  const effectiveResetAt =
    nextResetAt ??
    (showCadence && timeFrame
      ? computeNextResetAt(timeFrame, now)?.toISOString() ?? null
      : null)
  const resetLabel = !loading ? formatResetCountdown(effectiveResetAt, now) : ''
  const metaLine = resetLabel
    ? `${completed} / ${total} • ${resetLabel}`
    : `${completed} / ${total}`

  const actionButtonsWidth = swipeActionButtonsWidth(swipeActions.length)

  const cardBody = (
    <Box
      sx={{
        px: 1.5,
        py: 1.25,
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
        <Box
          sx={{
            flexShrink: 0,
            aspectRatio: '1',
            width: (theme) => theme.spacing(3.5),
            borderRadius: 1.5,
            bgcolor: loading ? 'action.hover' : alpha(listColor, 0.16),
            color: listColor,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          {loading ? (
            <Skeleton variant="rounded" width="50%" height="50%" />
          ) : (
            <ListIcon size={18} />
          )}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              minWidth: 0,
              minHeight: 22,
            }}
          >
            {loading ? (
              <Skeleton variant="rounded" width="55%" height={22} sx={{ flex: 1 }} />
            ) : (
              <Typography
                noWrap
                sx={{
                  flex: 1,
                  minWidth: 0,
                  fontWeight: 600,
                  lineHeight: 1,
                }}
              >
                {title}
              </Typography>
            )}
            {!loading && isPinned ? (
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: listColor,
                  flexShrink: 0,
                  px: 0.5,
                }}
                aria-hidden
              >
                <TbPin size={14} />
              </Box>
            ) : null}
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              minWidth: 0,
              minHeight: 20,
            }}
          >
            {loading ? (
              <Skeleton variant="rounded" width="45%" height={18} />
            ) : (
              <Typography variant="body2" color="text.secondary" noWrap sx={{ minWidth: 0 }}>
                {metaLine}
              </Typography>
            )}
            {loading ? (
              <Skeleton variant="rounded" width={56} height={20} sx={{ borderRadius: 999, flexShrink: 0 }} />
            ) : (
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.4,
                  flexShrink: 0,
                  px: 0.75,
                  py: 0.15,
                  borderRadius: 999,
                  bgcolor: alpha(listColor, 0.14),
                  color: listColor,
                  visibility: showCadence ? 'visible' : 'hidden',
                }}
                aria-hidden={!showCadence}
              >
                <TbRefresh size={11} />
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 700, fontSize: '0.65rem', lineHeight: 1.2 }}
                >
                  {showCadence ? TIME_FRAME_SHORT[timeFrame!] : TIME_FRAME_SHORT.daily}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mt: 0.25,
          minHeight: 14,
        }}
      >
        {loading ? (
          <>
            <Skeleton
              variant="rounded"
              height={5}
              sx={{ flex: 1, borderRadius: 999 }}
            />
            <Skeleton variant="rounded" width={28} height={12} sx={{ flexShrink: 0 }} />
          </>
        ) : (
          <>
            <LinearProgress
              variant="determinate"
              value={progress}
              aria-hidden
              sx={{
                flex: 1,
                height: 5,
                borderRadius: 999,
                bgcolor: alpha(listColor, 0.16),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 999,
                  bgcolor: listColor,
                },
              }}
            />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontWeight: 700,
                lineHeight: 1,
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
                flexShrink: 0,
              }}
            >
              {progress}%
            </Typography>
          </>
        )}
      </Box>
    </Box>
  )

  const card = (
    <Card
      sx={{
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 1,
        height: '100%',
        position: 'relative',
        zIndex: 1,
        bgcolor: 'background.paper',
        cursor: !loading && swipeRow ? 'pointer' : 'default',
        ...(swipeRow?.surfaceSx ?? {}),
      }}
      {...(swipeRow?.pointerHandlers ?? {})}
      onClick={swipeRow?.onContentClick}
    >
      {cardBody}
    </Card>
  )

  if (loading || !swipeRow || swipeActions.length === 0) {
    return card
  }

  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <SwipeActionButtons
        actions={swipeActions}
        width={actionButtonsWidth}
        inset={{ top: 0, bottom: 0 }}
      />
      {card}
    </Box>
  )
}
