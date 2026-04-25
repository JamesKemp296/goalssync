import { Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Card,
  CardActionArea,
  IconButton,
  Stack,
  Typography,
} from '@mui/material'
import { TbDotsVertical, TbPin } from 'react-icons/tb'
import { getListIconComponent, normalizeListIcon } from '../listIcons'
import CompleteLeftChip from './CompleteLeftChip'

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
}: ListCardProps) {
  const ListIcon = getListIconComponent(normalizeListIcon(iconKey))
  const left = Math.max(0, total - completed)

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
        <CardActionArea
          component={RouterLink}
          to={`/lists/${listId}`}
          sx={{ p: 1.5, height: '100%' }}
        >
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
                {`${progress}%`}
              </Box>
              {showMenuButton && onOpenMenu ? (
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
              <ListIcon size={18} />
              <Typography
                variant="h6"
                noWrap
                sx={{ fontWeight: 800, lineHeight: 1.1 }}
              >
                {title}
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary">
              {`${total} ${total === 1 ? 'task' : 'tasks'}`}
            </Typography>

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
          </Stack>
        </CardActionArea>
      </Card>
    </Box>
  )
}
