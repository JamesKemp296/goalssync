import { useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Box,
  ButtonBase,
  LinearProgress,
  Paper,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { getListIconComponent } from '../listIcons'
import { normalizeListColor } from '../listColors'
import {
  formatResetCountdown,
  normalizeTimeFrame,
  type ListTimeFrame,
} from '../timeFrames'
import type { Database } from '../database.types'

type ListRow = Database['public']['Tables']['lists']['Row']

export type PeriodOverviewItem = {
  list: ListRow
  total: number
  completed: number
}

type PeriodOverviewCardProps = {
  items: PeriodOverviewItem[]
  loading?: boolean
}

const TABS: { key: ListTimeFrame; label: string; emptyCopy: string }[] = [
  {
    key: 'daily',
    label: 'Today',
    emptyCopy: 'No daily lists yet. Add one to start a streak.',
  },
  {
    key: 'weekly',
    label: 'This week',
    emptyCopy: 'No weekly lists yet.',
  },
  {
    key: 'monthly',
    label: 'This month',
    emptyCopy: 'No monthly lists yet.',
  },
]

export default function PeriodOverviewCard({
  items,
  loading = false,
}: PeriodOverviewCardProps) {
  const [tabKey, setTabKey] = useState<ListTimeFrame>('daily')

  const filtered = useMemo(() => {
    return items
      .filter((it) => normalizeTimeFrame(it.list.time_frame) === tabKey)
      .sort((a, b) => {
        const pa = a.total === 0 ? 0 : a.completed / a.total
        const pb = b.total === 0 ? 0 : b.completed / b.total
        return pb - pa
      })
  }, [items, tabKey])

  const tabSummary = useMemo(() => {
    if (filtered.length === 0) return null
    const totalTodos = filtered.reduce((acc, it) => acc + it.total, 0)
    const totalDone = filtered.reduce((acc, it) => acc + it.completed, 0)
    const pct =
      totalTodos === 0 ? 0 : Math.round((totalDone / totalTodos) * 100)
    return { totalTodos, totalDone, pct }
  }, [filtered])

  const active = TABS.find((t) => t.key === tabKey) ?? TABS[0]

  return (
    <Paper sx={{ borderRadius: 3, p: 2 }}>
      <Stack spacing={1.25}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 1,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            Period overview
          </Typography>
          {loading ? (
            <Skeleton variant="rounded" width={64} height={22} />
          ) : tabSummary ? (
            <Typography variant="body2" color="text.secondary">
              {`${tabSummary.pct}% done`}
            </Typography>
          ) : null}
        </Box>

        <Tabs
          value={tabKey}
          onChange={(_e, v: ListTimeFrame) => setTabKey(v)}
          variant="fullWidth"
          sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0.5 } }}
        >
          {TABS.map((t) => (
            <Tab key={t.key} value={t.key} label={t.label} />
          ))}
        </Tabs>

        {loading ? (
          <Stack spacing={1}>
            {Array.from({ length: 2 }).map((_, idx) => (
              <Skeleton
                key={`overview-skel-${idx}`}
                variant="rounded"
                height={56}
              />
            ))}
          </Stack>
        ) : filtered.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="body2" color="text.secondary">
              {active.emptyCopy}
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1}>
            {filtered.map(({ list, total, completed }) => {
              const color = normalizeListColor(list.color)
              const pct = total === 0 ? 0 : Math.round((completed / total) * 100)
              const Icon = getListIconComponent(list.icon)
              return (
                <ButtonBase
                  key={list.id}
                  component={RouterLink}
                  to={`/lists/${list.id}`}
                  sx={{
                    width: '100%',
                    textAlign: 'left',
                    borderRadius: 2,
                    p: 1.25,
                    display: 'block',
                    bgcolor: (theme) =>
                      theme.palette.mode === 'dark'
                        ? alpha(color, 0.12)
                        : alpha(color, 0.1),
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={1.2}
                    sx={{ alignItems: 'center', mb: 0.6 }}
                  >
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        bgcolor: alpha(color, 0.5),
                        display: 'grid',
                        placeItems: 'center',
                        color: 'text.primary',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={14} />
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        variant="body2"
                        noWrap
                        sx={{ fontWeight: 800 }}
                      >
                        {list.title}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block' }}
                      >
                        {`${completed} / ${total} • ${formatResetCountdown(
                          list.next_reset_at,
                        )}`}
                      </Typography>
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 800, color }}
                    >
                      {`${pct}%`}
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={pct}
                    sx={{
                      height: 6,
                      borderRadius: 999,
                      bgcolor: alpha(color, 0.25),
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 999,
                        bgcolor: color,
                      },
                    }}
                  />
                </ButtonBase>
              )
            })}
          </Stack>
        )}
      </Stack>
    </Paper>
  )
}
