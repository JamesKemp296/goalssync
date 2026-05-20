import { useMemo } from 'react'
import { Box, Paper, Skeleton, Stack, Tooltip, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'

type HeatmapCardProps = {
  /** Map of YYYY-MM-DD (local date) → total completions on that day. */
  completionsByDay: Record<string, number>
  loading?: boolean
}

const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function toLocalKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatHumanDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

/** ISO day-of-week: Monday = 0 … Sunday = 6 */
function isoDow(date: Date): number {
  const d = date.getDay()
  return d === 0 ? 6 : d - 1
}

type CalCell =
  | { type: 'empty' }
  | { type: 'day'; date: Date; key: string; value: number; isFuture: boolean }

function buildMonth(
  year: number,
  month: number, // 0-indexed
  completionsByDay: Record<string, number>,
): { label: string; weeks: CalCell[][] } {
  const label = new Date(year, month, 1).toLocaleString(undefined, {
    month: 'long',
    year: 'numeric',
  })
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startPad = isoDow(firstDay) // 0 = Mon, …, 6 = Sun
  const now = Date.now()

  const allCells: CalCell[] = []
  for (let i = 0; i < startPad; i++) allCells.push({ type: 'empty' })
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d)
    const key = toLocalKey(date)
    allCells.push({
      type: 'day',
      date,
      key,
      value: completionsByDay[key] ?? 0,
      isFuture: date.getTime() > now,
    })
  }

  const weeks: CalCell[][] = []
  for (let i = 0; i < allCells.length; i += 7) {
    const week = allCells.slice(i, i + 7)
    while (week.length < 7) week.push({ type: 'empty' })
    weeks.push(week)
  }
  return { label, weeks }
}

function MonthGrid({
  label,
  weeks,
  max,
}: {
  label: string
  weeks: CalCell[][]
  max: number
}) {
  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography
        variant="caption"
        sx={{
          fontWeight: 800,
          display: 'block',
          mb: 0.75,
          textAlign: 'center',
          fontSize: '0.7rem',
        }}
      >
        {label}
      </Typography>
      {/* Day-of-week header */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 0.5,
          mb: 0.5,
        }}
      >
        {DOW_LABELS.map((d) => (
          <Typography
            key={d}
            variant="caption"
            color="text.secondary"
            sx={{
              fontSize: '0.55rem',
              textAlign: 'center',
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            {d}
          </Typography>
        ))}
      </Box>
      {/* Week rows */}
      <Stack spacing={0.5}>
        {weeks.map((week, wIdx) => (
          <Box
            key={`week-${wIdx}`}
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 0.5,
            }}
          >
            {week.map((cell, cIdx) => {
              if (cell.type === 'empty') {
                return <Box key={`empty-${wIdx}-${cIdx}`} sx={{ aspectRatio: '1' }} />
              }
              const { date, key, value, isFuture } = cell
              const intensity = max === 0 ? 0 : Math.min(1, value / max)
              return (
                <Tooltip
                  key={key}
                  title={`${formatHumanDate(date)} • ${value} completed`}
                  placement="top"
                  arrow
                >
                  <Box
                    sx={(theme) => ({
                      aspectRatio: '1',
                      borderRadius: 0.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: isFuture
                        ? 'transparent'
                        : value === 0
                          ? theme.palette.action.hover
                          : alpha(
                              theme.palette.primary.main,
                              0.25 + intensity * 0.65,
                            ),
                      border: isFuture
                        ? `1px dashed ${theme.palette.divider}`
                        : 'none',
                      cursor: isFuture ? 'default' : 'pointer',
                    })}
                  >
                    <Typography
                      variant="caption"
                      sx={(theme) => ({
                        fontSize: '0.5rem',
                        lineHeight: 1,
                        fontWeight: 600,
                        color: isFuture
                          ? theme.palette.text.disabled
                          : value > 0
                            ? theme.palette.primary.dark
                            : theme.palette.text.secondary,
                        opacity: isFuture ? 0.4 : 1,
                      })}
                    >
                      {date.getDate()}
                    </Typography>
                  </Box>
                </Tooltip>
              )
            })}
          </Box>
        ))}
      </Stack>
    </Box>
  )
}

export default function HeatmapCard({
  completionsByDay,
  loading = false,
}: HeatmapCardProps) {
  const { lastMonth, currentMonth, max, totalCompletions } = useMemo(() => {
    const now = new Date()
    const curYear = now.getFullYear()
    const curMonthIdx = now.getMonth()
    const prevMonthIdx = curMonthIdx === 0 ? 11 : curMonthIdx - 1
    const prevYear = curMonthIdx === 0 ? curYear - 1 : curYear

    const last = buildMonth(prevYear, prevMonthIdx, completionsByDay)
    const current = buildMonth(curYear, curMonthIdx, completionsByDay)

    const allValues = Object.values(completionsByDay)
    const max = allValues.length > 0 ? Math.max(...allValues) : 0
    const totalCompletions = allValues.reduce((a, v) => a + v, 0)

    return { lastMonth: last, currentMonth: current, max, totalCompletions }
  }, [completionsByDay])

  return (
    <Paper sx={{ borderRadius: 3, p: 2 }}>
      <Stack spacing={1.5}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            Completion heatmap
          </Typography>
          {loading ? (
            <Skeleton variant="text" width={80} />
          ) : (
            <Typography variant="caption" color="text.secondary">
              {`${totalCompletions} completed`}
            </Typography>
          )}
        </Box>

        {loading ? (
          <Skeleton variant="rounded" height={160} />
        ) : (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <MonthGrid
              label={lastMonth.label}
              weeks={lastMonth.weeks}
              max={max}
            />
            <MonthGrid
              label={currentMonth.label}
              weeks={currentMonth.weeks}
              max={max}
            />
          </Box>
        )}

        {!loading ? (
          <Stack
            direction="row"
            spacing={0.75}
            sx={{ alignItems: 'center', justifyContent: 'flex-end' }}
          >
            <Typography variant="caption" color="text.secondary">
              Less
            </Typography>
            {[0, 0.25, 0.5, 0.75, 1].map((v) => (
              <Box
                key={`legend-${v}`}
                sx={(theme) => ({
                  width: 12,
                  height: 12,
                  borderRadius: 0.5,
                  bgcolor:
                    v === 0
                      ? theme.palette.action.hover
                      : alpha(theme.palette.primary.main, 0.25 + v * 0.65),
                })}
              />
            ))}
            <Typography variant="caption" color="text.secondary">
              More
            </Typography>
          </Stack>
        ) : null}
      </Stack>
    </Paper>
  )
}
