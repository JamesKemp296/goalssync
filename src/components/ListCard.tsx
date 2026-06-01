import { useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Card,
  CardActionArea,
  IconButton,
  LinearProgress,
  Skeleton,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { TbDotsVertical, TbPin, TbRefresh } from 'react-icons/tb'
import { getListIconComponent, normalizeListIcon } from '../listIcons'
import {
  TIME_FRAME_SHORT,
  computeNextResetAt,
  formatResetCountdown,
  type ListTimeFrame,
} from '../timeFrames'

type ListCardProps = {
  listId: number
  title: string
  listColor: string
  progress: number
  total: number
  completed: number
  iconKey?: string | null
  isPinned?: boolean
  showMenuButton?: boolean
  onOpenMenu?: (el: HTMLElement) => void
  loading?: boolean
  timeFrame?: ListTimeFrame
  nextResetAt?: string | null
}

export default function ListCard({
  listId,
  title,
  listColor,
  progress,
  total,
  completed,
  iconKey,
  isPinned = false,
  showMenuButton = false,
  onOpenMenu,
  loading = false,
  timeFrame,
  nextResetAt = null,
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

  const cardBody = (
    <Box
      sx={{
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <Box
          sx={{
            flexShrink: 0,
            aspectRatio: '1',
            width: (theme) => theme.spacing(4),
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
            <ListIcon size={20} />
          )}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              minWidth: 0,
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
                  lineHeight: 1.35,
                }}
              >
                {title}
              </Typography>
            )}
            {loading && showMenuButton ? (
              <Skeleton
                variant="circular"
                width={34}
                height={34}
                sx={{ flexShrink: 0 }}
              />
            ) : !loading && (isPinned || (showMenuButton && onOpenMenu)) ? (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  flexShrink: 0,
                }}
              >
                {isPinned ? (
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: listColor,
                      alignSelf: 'stretch',
                      px: 0.5,
                    }}
                    aria-hidden
                  >
                    <TbPin size={14} />
                  </Box>
                ) : null}
                {showMenuButton && onOpenMenu ? (
                  <IconButton
                    aria-label="List options"
                    size="small"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onOpenMenu(e.currentTarget)
                    }}
                  >
                    <TbDotsVertical size={18} />
                  </IconButton>
                ) : null}
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

      {loading ? (
        <Skeleton variant="rounded" height={6} sx={{ borderRadius: 999 }} />
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            aria-hidden
            sx={{
              flex: 1,
              height: 6,
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
              textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {progress}%
          </Typography>
        </Box>
      )}
    </Box>
  )

  return (
    <Card
      sx={{
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 1,
        height: '100%',
      }}
    >
      {loading ? (
        cardBody
      ) : (
        <CardActionArea
          component={RouterLink}
          to={`/lists/${listId}`}
          sx={{ height: '100%' }}
        >
          {cardBody}
        </CardActionArea>
      )}
    </Card>
  )
}
