import { useMemo } from 'react'
import { Box, Paper, Skeleton, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { TbCheck, TbX } from 'react-icons/tb'
import { getListIconComponent } from '../listIcons'
import { normalizeListColor } from '../listColors'
import type { Database } from '../database.types'

type ListRow = Database['public']['Tables']['lists']['Row']
type TodoHistoryRow = Database['public']['Tables']['todo_period_history']['Row']
type ListPeriodHistoryRow =
  Database['public']['Tables']['list_period_history']['Row']

export type BestWorstInsightsProps = {
  lists: ListRow[]
  /** All list_period_history rows for the user (any time frame, any age). */
  history: ListPeriodHistoryRow[]
  /** All todo_period_history rows we want considered. */
  itemHistory: TodoHistoryRow[]
  loading?: boolean
}

type ItemAggregate = {
  task: string
  completed: number
  total: number
}

type ListInsight = {
  list: ListRow
  best: ItemAggregate[]
  worst: ItemAggregate[]
  periodsCounted: number
}

const MIN_PERIODS_TO_SHOW = 2
const TOP_N = 2
const LISTS_TO_SHOW = 3

export default function BestWorstInsights({
  lists,
  history,
  itemHistory,
  loading = false,
}: BestWorstInsightsProps) {
  const insights = useMemo<ListInsight[]>(() => {
    const historyById = new Map<number, ListPeriodHistoryRow>()
    for (const h of history) historyById.set(h.id, h)

    const itemsByListKey = new Map<number, Map<string, ItemAggregate>>()
    const periodsByList = new Map<number, Set<number>>()

    for (const ih of itemHistory) {
      const parent = historyById.get(ih.list_period_history_id)
      if (!parent) continue
      const map =
        itemsByListKey.get(parent.list_id) ??
        new Map<string, ItemAggregate>()
      itemsByListKey.set(parent.list_id, map)
      const periods =
        periodsByList.get(parent.list_id) ?? new Set<number>()
      periods.add(parent.id)
      periodsByList.set(parent.list_id, periods)

      const taskKey = ih.task.trim().toLowerCase()
      const existing = map.get(taskKey) ?? {
        task: ih.task,
        completed: 0,
        total: 0,
      }
      existing.total += 1
      if (ih.was_completed) existing.completed += 1
      map.set(taskKey, existing)
    }

    const candidates: ListInsight[] = []
    for (const list of lists) {
      const map = itemsByListKey.get(list.id)
      const periods = periodsByList.get(list.id)
      if (!map || !periods || periods.size < MIN_PERIODS_TO_SHOW) continue
      const rows = Array.from(map.values()).filter((r) => r.total > 0)
      if (rows.length === 0) continue
      const sortedByRate = [...rows].sort((a, b) => {
        const ra = a.completed / a.total
        const rb = b.completed / b.total
        if (rb !== ra) return rb - ra
        return b.total - a.total
      })
      const best = sortedByRate
        .filter((r) => r.completed / r.total >= 0.5)
        .slice(0, TOP_N)
      const worst = sortedByRate
        .filter((r) => r.completed / r.total < 0.5)
        .reverse()
        .slice(0, TOP_N)
      candidates.push({
        list,
        best,
        worst,
        periodsCounted: periods.size,
      })
    }
    return candidates.slice(0, LISTS_TO_SHOW)
  }, [lists, history, itemHistory])

  if (!loading && insights.length === 0) {
    return null
  }

  return (
    <Paper sx={{ borderRadius: 3, p: 2 }}>
      <Stack spacing={1.5}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          Patterns we&apos;ve noticed
        </Typography>

        {loading ? (
          <Stack spacing={1.5}>
            {Array.from({ length: 2 }).map((_, idx) => (
              <Skeleton
                key={`insight-skel-${idx}`}
                variant="rounded"
                height={86}
              />
            ))}
          </Stack>
        ) : (
          <Stack spacing={1.5}>
            {insights.map(({ list, best, worst, periodsCounted }) => {
              const color = normalizeListColor(list.color)
              const Icon = getListIconComponent(list.icon)
              return (
                <Box
                  key={list.id}
                  sx={{
                    p: 1.25,
                    borderRadius: 2,
                    bgcolor: alpha(color, 0.1),
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'center', mb: 0.75 }}
                  >
                    <Box
                      sx={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        bgcolor: alpha(color, 0.5),
                        display: 'grid',
                        placeItems: 'center',
                        color: 'text.primary',
                      }}
                    >
                      <Icon size={14} />
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 800, flex: 1 }}
                      noWrap
                    >
                      {list.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {`${periodsCounted} ${
                        periodsCounted === 1 ? 'period' : 'periods'
                      }`}
                    </Typography>
                  </Stack>
                  {best.length > 0 ? (
                    <Stack
                      direction="row"
                      spacing={0.5}
                      sx={{ alignItems: 'flex-start', mb: 0.4 }}
                    >
                      <TbCheck size={14} color={color} />
                      <Typography variant="caption" sx={{ flex: 1 }}>
                        <Box component="span" sx={{ fontWeight: 700 }}>
                          {'You usually finish: '}
                        </Box>
                        {best
                          .map(
                            (r) =>
                              `${r.task} (${Math.round((r.completed / r.total) * 100)}%)`,
                          )
                          .join(', ')}
                      </Typography>
                    </Stack>
                  ) : null}
                  {worst.length > 0 ? (
                    <Stack
                      direction="row"
                      spacing={0.5}
                      sx={{ alignItems: 'flex-start' }}
                    >
                      <TbX size={14} color="#d32f2f" />
                      <Typography variant="caption" sx={{ flex: 1 }}>
                        <Box component="span" sx={{ fontWeight: 700 }}>
                          {'Often skipped: '}
                        </Box>
                        {worst
                          .map(
                            (r) =>
                              `${r.task} (${Math.round((r.completed / r.total) * 100)}%)`,
                          )
                          .join(', ')}
                      </Typography>
                    </Stack>
                  ) : null}
                </Box>
              )
            })}
          </Stack>
        )}
      </Stack>
    </Paper>
  )
}
