import { useMemo, type ComponentType } from 'react'
import { Box, Paper, Skeleton, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import {
  TbArrowDownRight,
  TbArrowUpRight,
  TbChartBar,
  TbMinus,
  TbTarget,
  TbTrendingUp,
} from 'react-icons/tb'
import type { Database } from '../database.types'

type ListPeriodHistoryRow =
  Database['public']['Tables']['list_period_history']['Row']

type RollupStatsProps = {
  /** All list_period_history for the user (server already filters to user). */
  history: ListPeriodHistoryRow[]
  /** Current-period uncompleted-period completions (live `todos.is_complete`). */
  liveCompletedCount: number
  loading?: boolean
}

function daysAgo(n: number, ref: Date = new Date()): Date {
  const out = new Date(ref)
  out.setHours(0, 0, 0, 0)
  out.setDate(out.getDate() - n)
  return out
}

export default function RollupStats({
  history,
  liveCompletedCount,
  loading = false,
}: RollupStatsProps) {
  const stats = useMemo(() => {
    const now = new Date()
    const start30 = daysAgo(30, now)
    const start7 = daysAgo(7, now)
    const start14 = daysAgo(14, now)

    let totalLifetime = 0
    let total30Periods = 0
    let perfect30 = 0
    let completed7 = 0
    let completed7to14 = 0

    for (const h of history) {
      totalLifetime += h.completed_count
      const endMs = new Date(h.period_end).getTime()
      if (endMs >= start30.getTime()) {
        total30Periods += 1
        if (h.completed_all) perfect30 += 1
      }
      if (endMs >= start7.getTime()) {
        completed7 += h.completed_count
      } else if (endMs >= start14.getTime()) {
        completed7to14 += h.completed_count
      }
    }
    totalLifetime += liveCompletedCount

    const successRate =
      total30Periods === 0
        ? null
        : Math.round((perfect30 / total30Periods) * 100)

    let trendPct: number | null = null
    if (completed7to14 > 0) {
      trendPct = Math.round(
        ((completed7 - completed7to14) / completed7to14) * 100,
      )
    } else if (completed7 > 0) {
      trendPct = 100
    }
    return { totalLifetime, successRate, trendPct }
  }, [history, liveCompletedCount])

  const trendUp = stats.trendPct != null && stats.trendPct > 0
  const trendDown = stats.trendPct != null && stats.trendPct < 0
  const TrendIcon =
    stats.trendPct == null
      ? TbMinus
      : trendUp
        ? TbArrowUpRight
        : trendDown
          ? TbArrowDownRight
          : TbMinus

  return (
    <Paper sx={{ borderRadius: 3, p: 2.5 }}>
      <Stack spacing={2}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          Your numbers
        </Typography>

        <Stack spacing={1.25}>
          <StatTile
            loading={loading}
            icon={TbChartBar}
            label="Lifetime completed"
            value={loading ? null : String(stats.totalLifetime)}
            sub="All-time todos finished"
          />
          <StatTile
            loading={loading}
            icon={TbTarget}
            label="Success rate"
            value={
              loading
                ? null
                : stats.successRate == null
                  ? '—'
                  : `${stats.successRate}%`
            }
            sub="Last 30 days"
          />
          <StatTile
            loading={loading}
            icon={TbTrendingUp}
            label="Week trend"
            value={
              loading
                ? null
                : stats.trendPct == null
                  ? '—'
                  : `${stats.trendPct > 0 ? '+' : ''}${stats.trendPct}%`
            }
            sub="Vs prior week"
            valueColor={
              stats.trendPct == null
                ? 'text.primary'
                : trendUp
                  ? 'success.main'
                  : trendDown
                    ? 'error.main'
                    : 'text.primary'
            }
            trailingIcon={loading ? undefined : TrendIcon}
          />
        </Stack>
      </Stack>
    </Paper>
  )
}

type StatTileProps = {
  loading?: boolean
  icon: ComponentType<{ size?: number }>
  label: string
  value: string | null
  sub: string
  valueColor?: string
  trailingIcon?: ComponentType<{ size?: number }>
}

function StatTile({
  loading,
  icon: Icon,
  label,
  value,
  sub,
  valueColor = 'text.primary',
  trailingIcon: TrailingIcon,
}: StatTileProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 1.75,
        borderRadius: 2.5,
        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
        border: (theme) =>
          `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          flexShrink: 0,
          display: 'grid',
          placeItems: 'center',
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
          color: 'primary.main',
        }}
      >
        <Icon size={20} />
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontWeight: 600, lineHeight: 1.3 }}
        >
          {label}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {sub}
        </Typography>
      </Box>

      <Box
        sx={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
        }}
      >
        {loading || value === null ? (
          <Skeleton variant="text" width={56} height={36} />
        ) : (
          <>
            {TrailingIcon ? (
              <Box
                component="span"
                sx={{
                  display: 'inline-flex',
                  color: valueColor,
                  lineHeight: 0,
                }}
              >
                <TrailingIcon size={18} />
              </Box>
            ) : null}
            <Typography
              variant="h5"
              sx={{
                fontWeight: 900,
                color: valueColor,
                lineHeight: 1.1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {value}
            </Typography>
          </>
        )}
      </Box>
    </Box>
  )
}
