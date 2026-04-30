import type { ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Box,
  LinearProgress,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'

type HeroCardProps = {
  to: string
  title: string
  subtitle: string
  icon: ReactNode
  listColor: string
  progress: number
  completed: number
  total: number
  dateLabel: string
  loading?: boolean
}

export function HeroCard({
  to,
  title,
  subtitle,
  icon,
  listColor,
  progress,
  completed,
  total,
  dateLabel,
  loading = false,
}: HeroCardProps) {
  const isTransparentColor = listColor.trim().toLowerCase() === 'transparent'

  const cardBody = (
    <Stack spacing={2}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 1.5,
        }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          {loading ? (
            <>
              <Skeleton variant="text" width="68%" height={36} />
              <Skeleton variant="text" width="92%" height={22} />
            </>
          ) : (
            <>
              <Typography
                variant="h4"
                sx={{ fontWeight: 900, lineHeight: 1.2 }}
              >
                {title}
              </Typography>
              <Typography color="text.secondary">{subtitle}</Typography>
            </>
          )}
        </Box>
        <Box
          sx={(theme) => ({
            width: 58,
            height: 58,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            position: 'relative',
            flexShrink: 0,
            bgcolor: isTransparentColor
              ? 'rgba(0, 0, 0, 0)'
              : theme.palette.mode === 'dark'
                ? alpha(listColor, 0.45)
                : alpha(listColor, 0.5),
          })}
        >
          {loading ? (
            <Skeleton variant="circular" width={58} height={58} />
          ) : (
            icon
          )}
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gap: 1 }}>
        {loading ? (
          <>
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="rounded" height={8} />
          </>
        ) : (
          <>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {`${completed} out of ${total} tasks are completed`}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 10,
                borderRadius: 999,
                bgcolor: alpha(listColor, 0.3),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 999,
                  bgcolor: listColor,
                },
              }}
            />
          </>
        )}
      </Box>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'center',
        }}
      >
        {loading ? (
          <Skeleton variant="text" width={90} height={19} />
        ) : (
          <Typography variant="caption" color="text.secondary">
            {dateLabel}
          </Typography>
        )}
      </Box>
    </Stack>
  )

  return (
    <Paper
      component={loading ? 'div' : RouterLink}
      to={loading ? undefined : to}
      sx={(theme) => ({
        display: 'block',
        p: 2,
        borderRadius: 3,
        textDecoration: 'none',
        color: 'inherit',
        bgcolor: loading
          ? 'background.paper'
          : theme.palette.mode === 'dark'
            ? alpha(listColor, 0.2)
            : alpha(listColor, 0.18),
      })}
    >
      {cardBody}
    </Paper>
  )
}
