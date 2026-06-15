import { useMemo, useState } from 'react'
import {
  Box,
  ClickAwayListener,
  Paper,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { alpha, getContrastRatio, useTheme } from '@mui/material/styles'
import type { Theme } from '@mui/material/styles'

type HeatmapCardProps = {
  /** Map of YYYY-MM-DD (local date) → total completions on that day. */
  completionsByDay: Record<string, number>
  loading?: boolean
  /** Called when the user taps/clicks a day cell. Receives the YYYY-MM-DD key. */
  onDayClick?: (dateKey: string) => void
}

const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const ROLLING_DAY_COUNT = 30

type CalCell =
  | { type: 'empty' }
  | {
      type: 'day'
      date: Date
      key: string
      value: number
      isFuture: boolean
      isMonthStart: boolean
    }

type HeatmapWeek = {
  monthLabel?: string
  cells: CalCell[]
}

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

function formatRangeDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function completionTooltipTitle(date: Date, value: number): string {
  const noun = value === 1 ? 'task' : 'tasks'
  return `${formatHumanDate(date)} • ${value} ${noun} completed`
}

/** ISO day-of-week: Monday = 0 … Sunday = 6 */
function isoDow(date: Date): number {
  const d = date.getDay()
  return d === 0 ? 6 : d - 1
}

function startOfLocalDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function buildRollingWeeks(
  completionsByDay: Record<string, number>,
  dayCount = ROLLING_DAY_COUNT,
): { weeks: HeatmapWeek[]; rangeLabel: string } {
  const end = startOfLocalDay(new Date())
  const start = new Date(end)
  start.setDate(start.getDate() - (dayCount - 1))

  const gridStart = new Date(start)
  while (isoDow(gridStart) !== 0) {
    gridStart.setDate(gridStart.getDate() - 1)
  }

  const gridEnd = new Date(end)
  while (isoDow(gridEnd) !== 6) {
    gridEnd.setDate(gridEnd.getDate() + 1)
  }

  const now = Date.now()
  const weeks: HeatmapWeek[] = []
  const cursor = new Date(gridStart)

  while (cursor <= gridEnd) {
    const weekCells: CalCell[] = []
    let monthLabel: string | undefined

    for (let i = 0; i < 7; i++) {
      const date = new Date(cursor)
      const inRange = date >= start && date <= end
      const isMonthStart = date.getDate() === 1

      if (isMonthStart) {
        monthLabel = date.toLocaleString(undefined, {
          month: 'long',
          year: 'numeric',
        })
      }

      if (!inRange && date < start) {
        weekCells.push({ type: 'empty' })
      } else {
        const key = toLocalKey(date)
        weekCells.push({
          type: 'day',
          date,
          key,
          value: completionsByDay[key] ?? 0,
          isFuture: date.getTime() > now,
          isMonthStart,
        })
      }

      cursor.setDate(cursor.getDate() + 1)
    }

    weeks.push({ monthLabel, cells: weekCells })
  }

  const rangeLabel = `${formatRangeDate(start)} – ${formatRangeDate(end)}`
  return { weeks, rangeLabel }
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '')
  const value = Number.parseInt(normalized, 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

function blendOverBackground(
  foreground: string,
  background: string,
  opacity: number,
): string {
  const fg = hexToRgb(foreground)
  const bg = hexToRgb(background)
  const blended = fg.map((channel, index) =>
    Math.round(channel * opacity + bg[index]! * (1 - opacity)),
  ) as [number, number, number]
  return rgbToHex(blended)
}

function heatmapFillAlpha(intensity: number): number {
  return 0.25 + intensity * 0.65
}

function heatmapCellBackground(
  theme: Theme,
  intensity: number,
): string {
  return blendOverBackground(
    theme.palette.primary.main,
    theme.palette.background.paper,
    heatmapFillAlpha(intensity),
  )
}

function heatmapCellTextColor(theme: Theme, intensity: number): string {
  const background = heatmapCellBackground(theme, intensity)
  const darkText = theme.palette.mode === 'dark' ? '#1a1917' : '#1c1208'
  const lightText = '#f5f8f5'

  return getContrastRatio(darkText, background) >=
    getContrastRatio(lightText, background)
    ? darkText
    : lightText
}

function HeatmapCell({
  cell,
  max,
  selected,
  onSelect,
  useTapTooltip,
  onDayClick,
}: {
  cell: Extract<CalCell, { type: 'day' }>
  max: number
  selected: boolean
  onSelect: (key: string | null) => void
  useTapTooltip: boolean
  onDayClick?: (key: string) => void
}) {
  const theme = useTheme()
  const { date, key, value, isFuture, isMonthStart } = cell
  const intensity = max === 0 ? 0 : Math.min(1, value / max)
  const fillAlpha = heatmapFillAlpha(intensity)
  const tooltipTitle = completionTooltipTitle(date, value)

  // When onDayClick is provided: clicks open the drawer (tap tooltip disabled).
  // When not provided: fall back to original tap-tooltip behaviour on touch devices.
  const handleClick = () => {
    if (isFuture) return
    if (onDayClick) {
      onDayClick(key)
    } else if (useTapTooltip) {
      onSelect(selected ? null : key)
    }
  }

  return (
    <Tooltip
      title={tooltipTitle}
      placement="top"
      arrow
      open={useTapTooltip && !onDayClick ? selected : undefined}
      disableHoverListener={useTapTooltip && !onDayClick}
      disableFocusListener
      enterTouchDelay={0}
      leaveTouchDelay={useTapTooltip && !onDayClick ? 0 : 1500}
    >
      <Box
        component="button"
        type="button"
        aria-label={tooltipTitle}
        aria-pressed={useTapTooltip && !onDayClick ? selected : undefined}
        onClick={handleClick}
        sx={{
          aspectRatio: '1',
          minWidth: 0,
          width: '100%',
          borderRadius: 0.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 0,
          bgcolor: isFuture
            ? 'transparent'
            : value === 0
              ? theme.palette.action.hover
              : alpha(theme.palette.primary.main, fillAlpha),
          border: isFuture
            ? `1px dashed ${theme.palette.divider}`
            : isMonthStart
              ? `2px solid ${alpha(theme.palette.primary.main, 0.45)}`
              : 'none',
          cursor: 'pointer',
          outline: selected
            ? `2px solid ${theme.palette.primary.main}`
            : 'none',
          outlineOffset: 1,
          WebkitTapHighlightColor: 'transparent',
          '&:focus-visible': {
            outline: `2px solid ${theme.palette.primary.main}`,
            outlineOffset: 1,
          },
        }}
      >
        <Typography
          variant="caption"
          component="span"
          sx={{
            fontSize: '0.55rem',
            lineHeight: 1,
            fontWeight: isMonthStart ? 800 : 600,
            color: isFuture
              ? theme.palette.text.secondary
              : value > 0
                ? heatmapCellTextColor(theme, intensity)
                : theme.palette.text.primary,
            opacity: isFuture ? 0.55 : 1,
          }}
        >
          {date.getDate()}
        </Typography>
      </Box>
    </Tooltip>
  )
}

function RollingGridSkeleton({ weeks }: { weeks: HeatmapWeek[] }) {
  return (
    <Stack spacing={1}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 0.5,
        }}
      >
        {DOW_LABELS.map((d) => (
          <Typography
            key={d}
            variant="caption"
            color="text.secondary"
            sx={{
              fontSize: '0.6rem',
              textAlign: 'center',
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            {d}
          </Typography>
        ))}
      </Box>
      <Stack spacing={0.75}>
        {weeks.map((week, wIdx) => (
          <Stack key={`skel-week-${wIdx}`} spacing={0.35}>
            {week.monthLabel ? (
              <Skeleton
                variant="text"
                animation="wave"
                width={72}
                sx={{
                  ml: 0.25,
                  fontSize: '0.7rem',
                  lineHeight: 1.66,
                }}
              />
            ) : null}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 0.5,
              }}
            >
              {Array.from({ length: 7 }).map((_, cIdx) => (
                <Box
                  key={`skel-cell-${wIdx}-${cIdx}`}
                  sx={{ aspectRatio: '1', minWidth: 0 }}
                >
                  <Skeleton
                    variant="rounded"
                    animation="wave"
                    sx={{ width: '100%', height: '100%', borderRadius: 0.5 }}
                  />
                </Box>
              ))}
            </Box>
          </Stack>
        ))}
      </Stack>
    </Stack>
  )
}

function RollingGrid({
  weeks,
  max,
  onDayClick,
}: {
  weeks: HeatmapWeek[]
  max: number
  onDayClick?: (dateKey: string) => void
}) {
  const useTapTooltip = useMediaQuery('(hover: none), (pointer: coarse)')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const grid = (
    <Stack spacing={1}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 0.5,
        }}
      >
        {DOW_LABELS.map((d) => (
          <Typography
            key={d}
            variant="caption"
            color="text.secondary"
            sx={{
              fontSize: '0.6rem',
              textAlign: 'center',
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            {d}
          </Typography>
        ))}
      </Box>

      <Stack spacing={0.75}>
        {weeks.map((week, wIdx) => (
          <Stack key={`week-${wIdx}`} spacing={0.35}>
            {week.monthLabel ? (
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  fontSize: '0.7rem',
                  color: 'text.secondary',
                  pl: 0.25,
                }}
              >
                {week.monthLabel}
              </Typography>
            ) : null}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 0.5,
              }}
            >
              {week.cells.map((cell, cIdx) => {
                if (cell.type === 'empty') {
                  return (
                    <Box
                      key={`empty-${wIdx}-${cIdx}`}
                      sx={{ aspectRatio: '1', minWidth: 0 }}
                    />
                  )
                }
                return (
                  <HeatmapCell
                    key={cell.key}
                    cell={cell}
                    max={max}
                    selected={selectedKey === cell.key}
                    onSelect={setSelectedKey}
                    useTapTooltip={useTapTooltip}
                    onDayClick={onDayClick}
                  />
                )
              })}
            </Box>
          </Stack>
        ))}
      </Stack>
    </Stack>
  )

  // When onDayClick is provided the drawer handles focus; no tap-tooltip to dismiss.
  if (!useTapTooltip || onDayClick) return grid

  return (
    <ClickAwayListener onClickAway={() => setSelectedKey(null)}>
      <Box sx={{ width: '100%' }}>{grid}</Box>
    </ClickAwayListener>
  )
}

export default function HeatmapCard({
  completionsByDay,
  loading = false,
  onDayClick,
}: HeatmapCardProps) {
  const skeletonWeeks = useMemo(() => buildRollingWeeks({}).weeks, [])

  const { weeks, rangeLabel, max, totalCompletions } = useMemo(() => {
    const { weeks, rangeLabel } = buildRollingWeeks(completionsByDay)
    const allValues = Object.values(completionsByDay)
    const max = allValues.length > 0 ? Math.max(...allValues) : 0
    const totalCompletions = allValues.reduce((a, v) => a + v, 0)
    return { weeks, rangeLabel, max, totalCompletions }
  }, [completionsByDay])

  return (
    <Paper sx={{ borderRadius: 3, p: 2 }}>
      <Stack spacing={1.5}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              Completion heatmap
            </Typography>
            {loading ? (
              <Skeleton variant="text" width={120} sx={{ mt: 0.25 }} />
            ) : (
              <Typography variant="caption" color="text.secondary">
                {`Last ${ROLLING_DAY_COUNT} days · ${rangeLabel}`}
              </Typography>
            )}
          </Box>
          {loading ? (
            <Skeleton variant="text" width={80} />
          ) : (
            <Typography variant="caption" color="text.secondary">
              {`${totalCompletions} completed`}
            </Typography>
          )}
        </Box>

        {loading ? (
          <RollingGridSkeleton weeks={skeletonWeeks} />
        ) : (
          <RollingGrid weeks={weeks} max={max} onDayClick={onDayClick} />
        )}

        {loading ? (
          <Stack
            direction="row"
            spacing={0.75}
            sx={{ alignItems: 'center', justifyContent: 'flex-end' }}
          >
            <Skeleton variant="text" width={24} height={14} />
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton
                key={`legend-skel-${i}`}
                variant="rounded"
                width={12}
                height={12}
                sx={{ borderRadius: 0.5 }}
              />
            ))}
            <Skeleton variant="text" width={28} height={14} />
          </Stack>
        ) : (
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
        )}
      </Stack>
    </Paper>
  )
}
