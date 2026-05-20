import { useMemo } from 'react'
import { Box, Paper, Skeleton, Stack, Typography } from '@mui/material'
import { TbArrowDownRight, TbArrowUpRight, TbMinus } from 'react-icons/tb'
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

  const TrendIcon =
    stats.trendPct == null
      ? TbMinus
      : stats.trendPct > 0
        ? TbArrowUpRight
        : stats.trendPct < 0
          ? TbArrowDownRight
          : TbMinus

  return (
    <Paper sx={{ borderRadius: 3, p: 2 }}>
      <Stack spacing={1.25}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          Your numbers
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 1.5,
          }}
        >
          <StatBlock
            label="Lifetime completed"
            value={loading ? null : String(stats.totalLifetime)}
            sub="total todos finished"
          />
          <StatBlock
            label="Success rate"
            value={
              loading
                ? null
                : stats.successRate == null
                  ? '—'
                  : `${stats.successRate}%`
            }
            sub="last 30 days"
          />
          <StatBlock
            label="Week trend"
            value={
              loading
                ? null
                : stats.trendPct == null
                  ? '—'
                  : `${stats.trendPct > 0 ? '+' : ''}${stats.trendPct}%`
            }
            sub="vs prior week"
            valueColor={
              stats.trendPct == null
                ? 'text.primary'
                : stats.trendPct > 0
                  ? 'success.main'
                  : stats.trendPct < 0
                    ? 'error.main'
                    : 'text.primary'
            }
            ValueIcon={loading ? undefined : TrendIcon}
          />
        </Box>
      </Stack>
    </Paper>
  )
}

type StatBlockProps = {
  label: string
  value: string | null
  sub: string
  valueColor?: string
  ValueIcon?: React.ComponentType<{ size?: number }>
}

function StatBlock({ label, value, sub, valueColor, ValueIcon }: StatBlockProps) {
  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 700, textTransform: 'uppercase', display: 'block' }}
      >
        {label}
      </Typography>
      <Stack
        direction="row"
        spacing={0.5}
        sx={{ alignItems: 'center', mt: 0.4 }}
      >
        {value === null ? (
          <Skeleton variant="text" width="60%" height={32} />
        ) : (
          <>
            {ValueIcon ? <ValueIcon size={18} /> : null}
            <Typography
              variant="h6"
              sx={{ fontWeight: 900, color: valueColor ?? 'text.primary' }}
            >
              {value}
            </Typography>
          </>
        )}
      </Stack>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block' }}
      >
        {sub}
      </Typography>
    </Box>
  )
}
