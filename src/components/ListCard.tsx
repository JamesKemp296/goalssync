import { Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Card,
  CardActionArea,
  IconButton,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { TbDotsVertical, TbPin, TbRefresh } from 'react-icons/tb'
import { getListIconComponent, normalizeListIcon } from '../listIcons'
import CompleteLeftChip from './CompleteLeftChip'
import { TIME_FRAME_SHORT, type ListTimeFrame } from '../timeFrames'

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
}

const LIST_CARD_CONTENT_HEIGHT = 174

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
}: ListCardProps) {
  const ListIcon = getListIconComponent(normalizeListIcon(iconKey))
  const left = Math.max(0, total - completed)
  const showCadence = !!timeFrame && timeFrame !== 'none' && !loading
  const cardBody = (
    <Stack spacing={1.2}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}
      >
        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: '50%',
            border: '2px solid',
            borderColor: listColor,
            display: 'grid',
            placeItems: 'center',
            color: listColor,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {loading ? (
            <Skeleton variant="circular" width={38} height={38} />
          ) : (
            `${progress}%`
          )}
        </Box>
        {showMenuButton && onOpenMenu ? (
          loading ? (
            <Skeleton variant="circular" width={24} height={24} sx={{ mt: -0.25, mr: -0.25 }} />
          ) : (
            <IconButton
              aria-label="List options"
              size="small"
              sx={{ mt: -0.25, mr: -0.25 }}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onOpenMenu(e.currentTarget)
              }}
            >
              <TbDotsVertical size={18} />
            </IconButton>
          )
        ) : loading ? (
          <Skeleton variant="circular" width={10} height={10} sx={{ mt: 0.5 }} />
        ) : (
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              bgcolor: listColor,
              mt: 0.5,
            }}
          />
        )}
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          minWidth: 0,
        }}
      >
        {loading ? <Skeleton variant="rounded" width={18} height={18} /> : <ListIcon size={18} />}
        {loading ? (
          <Skeleton variant="rounded" width="70%" height={24} />
        ) : (
          <Typography
            variant="h6"
            noWrap
            sx={{ fontWeight: 800, lineHeight: 1.1 }}
          >
            {title}
          </Typography>
        )}
      </Box>

      {loading ? (
        <Skeleton variant="rounded" width="40%" height={20} />
      ) : (
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {`${total} ${total === 1 ? 'task' : 'tasks'}`}
          </Typography>
          {showCadence ? (
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.4,
                px: 0.75,
                py: 0.15,
                borderRadius: 999,
                bgcolor: alpha(listColor, 0.22),
                color: listColor,
              }}
            >
              <TbRefresh size={11} />
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, fontSize: '0.6rem' }}
              >
                {TIME_FRAME_SHORT[timeFrame!]}
              </Typography>
            </Box>
          ) : null}
        </Stack>
      )}

      {loading ? (
        <Stack direction="row" spacing={0.8}>
          <Skeleton variant="rounded" width={96} height={22} sx={{ borderRadius: 999 }} />
          <Skeleton variant="rounded" width={70} height={22} sx={{ borderRadius: 999 }} />
        </Stack>
      ) : (
        <Stack direction="row" spacing={0.8}>
          <CompleteLeftChip
            kind="complete"
            count={completed}
            accentColor={listColor}
          />
          <CompleteLeftChip
            kind="left"
            count={left}
            accentColor={listColor}
          />
        </Stack>
      )}
    </Stack>
  )

  return (
    <Box sx={{ position: 'relative' }}>
      {isPinned ? (
        <Box
          sx={(theme) => ({
            position: 'absolute',
            top: -12,
            right: 10,
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: theme.palette.background.paper,
            display: 'grid',
            placeItems: 'center',
            color: listColor,
            zIndex: 2,
            boxShadow: 1,
          })}
        >
          <TbPin size={14} />
        </Box>
      ) : null}
      <Card sx={{ borderRadius: 3, height: '100%' }}>
        {loading ? (
          <Box
            sx={{
              p: 1.5,
              height: '100%',
              minHeight: LIST_CARD_CONTENT_HEIGHT,
              boxSizing: 'border-box',
            }}
          >
            {cardBody}
          </Box>
        ) : (
          <CardActionArea
            component={RouterLink}
            to={`/lists/${listId}`}
            sx={{
              p: 1.5,
              height: '100%',
              minHeight: LIST_CARD_CONTENT_HEIGHT,
              boxSizing: 'border-box',
            }}
          >
            {cardBody}
          </CardActionArea>
        )}
      </Card>
    </Box>
  )
}
