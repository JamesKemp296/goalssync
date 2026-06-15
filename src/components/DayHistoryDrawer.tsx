import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  ButtonBase,
  Card,
  Drawer,
  IconButton,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { TbArrowLeft } from 'react-icons/tb'
import { getListIconComponent, normalizeListIcon } from '../listIcons'
import { normalizeListColor } from '../listColors'
import TodoItemsList, { type TodoListItem } from './TodoItemsList'
import type { Database } from '../database.types'

type ListRow = Database['public']['Tables']['lists']['Row']
type ListPeriodHistoryRow =
  Database['public']['Tables']['list_period_history']['Row']
type TodoPeriodHistoryRow =
  Database['public']['Tables']['todo_period_history']['Row']
type LiveTodoRow = Pick<
  Database['public']['Tables']['todos']['Row'],
  'id' | 'list_id' | 'task' | 'is_complete'
>

export type DayHistoryDrawerProps = {
  open: boolean
  dateKey: string | null
  onClose: () => void
  history: ListPeriodHistoryRow[]
  itemHistory: TodoPeriodHistoryRow[]
  lists: ListRow[]
  liveTodos: LiveTodoRow[]
  onToggleHistoric: (todoHistId: number, listHistId: number) => void
  onToggleLive: (todoId: number) => void
}

type DrawerView =
  | { type: 'lists' }
  | { type: 'todos-historic'; listPeriodId: number }
  | { type: 'todos-live'; listId: number }

type HistoricGroup = {
  listPeriodId: number
  listId: number
  list: ListRow | undefined
  items: TodoPeriodHistoryRow[]
}

type LiveGroup = {
  list: ListRow
  todos: LiveTodoRow[]
}

function todayKey(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function toLocalDateKey(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseDateKey(key: string): Date {
  const parts = key.split('-').map(Number)
  return new Date(parts[0]!, parts[1]! - 1, parts[2]!)
}

function formatDrawerDate(dateKey: string): string {
  const d = parseDateKey(dateKey)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  d.setHours(0, 0, 0, 0)

  if (d.getTime() === today.getTime()) return 'Today'
  if (d.getTime() === yesterday.getTime()) return 'Yesterday'
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function HistoryListCard({
  list,
  completed,
  total,
  onClick,
}: {
  list: ListRow | undefined
  completed: number
  total: number
  onClick: () => void
}) {
  const color = normalizeListColor(list?.color ?? null)
  const ListIcon = getListIconComponent(normalizeListIcon(list?.icon))
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0
  const metaLine = `${completed} / ${total}`

  return (
    <ButtonBase
      onClick={onClick}
      sx={{ width: '100%', borderRadius: 2, display: 'block', textAlign: 'left' }}
    >
      <Card
        sx={{
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: 1,
          bgcolor: 'background.paper',
          cursor: 'pointer',
        }}
      >
        <Box sx={{ px: 1.5, py: 1.25 }}>
          {/* Top row: icon + title + badge */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
            <Box
              sx={{
                flexShrink: 0,
                aspectRatio: '1',
                width: (theme) => theme.spacing(3.5),
                borderRadius: 1.5,
                bgcolor: alpha(color, 0.16),
                color,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <ListIcon size={18} />
            </Box>

            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 0.25,
              }}
            >
              <Typography
                noWrap
                sx={{ fontWeight: 600, lineHeight: 1, minHeight: 22 }}
              >
                {list?.title?.trim() || 'Deleted list'}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                noWrap
                sx={{ minWidth: 0 }}
              >
                {metaLine}
              </Typography>
            </Box>
          </Box>

          {/* Progress bar */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              aria-hidden
              sx={{
                flex: 1,
                height: 5,
                borderRadius: 999,
                bgcolor: alpha(color, 0.16),
                '& .MuiLinearProgress-bar': { borderRadius: 999, bgcolor: color },
              }}
            />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontWeight: 700,
                lineHeight: 1,
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
                flexShrink: 0,
              }}
            >
              {progress}%
            </Typography>
          </Box>
        </Box>
      </Card>
    </ButtonBase>
  )
}

export default function DayHistoryDrawer({
  open,
  dateKey,
  onClose,
  history,
  itemHistory,
  lists,
  liveTodos,
  onToggleHistoric,
  onToggleLive,
}: DayHistoryDrawerProps) {
  const [view, setView] = useState<DrawerView>({ type: 'lists' })

  // Reset to list screen when drawer closes or a new day is selected
  useEffect(() => {
    if (!open) setView({ type: 'lists' })
  }, [open])
  useEffect(() => {
    setView({ type: 'lists' })
  }, [dateKey])

  const isToday = dateKey !== null && dateKey === todayKey()

  const listsById = useMemo(
    () => new Map(lists.map((l) => [l.id, l])),
    [lists],
  )

  const historicGroups = useMemo<HistoricGroup[]>(() => {
    if (!dateKey || isToday) return []
    const matchingPeriods = history.filter(
      (h) =>
        h.time_frame === 'daily' &&
        toLocalDateKey(h.period_start) === dateKey,
    )
    return matchingPeriods
      .map((h) => ({
        listPeriodId: h.id,
        listId: h.list_id,
        list: listsById.get(h.list_id),
        items: itemHistory.filter(
          (item) => item.list_period_history_id === h.id,
        ),
      }))
      .filter((g) => g.items.length > 0)
  }, [dateKey, isToday, history, itemHistory, listsById])

  const liveGroups = useMemo<LiveGroup[]>(() => {
    if (!dateKey || !isToday) return []
    return lists
      .filter((l) => l.time_frame === 'daily')
      .map((list) => ({
        list,
        todos: liveTodos.filter((t) => t.list_id === list.id),
      }))
      .filter((g) => g.todos.length > 0)
  }, [dateKey, isToday, lists, liveTodos])

  const isEmpty = isToday ? liveGroups.length === 0 : historicGroups.length === 0

  // ── derive what the current "todo" screen is pointing at ─────────────────

  const activeHistoricGroup =
    view.type === 'todos-historic'
      ? historicGroups.find((g) => g.listPeriodId === view.listPeriodId)
      : undefined

  const activeLiveGroup =
    view.type === 'todos-live'
      ? liveGroups.find((g) => g.list.id === view.listId)
      : undefined

  const activeTodoItems = useMemo<TodoListItem[]>(() => {
    if (activeHistoricGroup) {
      return activeHistoricGroup.items.map((item) => ({
        id: item.id,
        task: item.task,
        is_complete: item.was_completed,
        target_count: 1,
        progress_count: item.was_completed ? 1 : 0,
      }))
    }
    if (activeLiveGroup) {
      return activeLiveGroup.todos.map((t) => ({
        id: t.id,
        task: t.task,
        is_complete: t.is_complete,
        target_count: 1,
        progress_count: t.is_complete ? 1 : 0,
      }))
    }
    return []
  }, [activeHistoricGroup, activeLiveGroup])

  const activeList = activeHistoricGroup?.list ?? activeLiveGroup?.list
  const activeColor = normalizeListColor(activeList?.color ?? null)
  const ActiveListIcon = getListIconComponent(
    normalizeListIcon(activeList?.icon),
  )

  const handleTodoToggle = (id: number) => {
    if (activeHistoricGroup) {
      const item = activeHistoricGroup.items.find((i) => i.id === id)
      if (item) onToggleHistoric(item.id, activeHistoricGroup.listPeriodId)
    } else if (activeLiveGroup) {
      onToggleLive(id)
    }
  }

  // ── header content ───────────────────────────────────────────────────────

  const isListView = view.type === 'lists'

  const headerTitle = isListView ? (
    <Typography variant="h6" sx={{ fontWeight: 800 }}>
      {dateKey ? formatDrawerDate(dateKey) : ''}
    </Typography>
  ) : (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
      <IconButton
        onClick={() => setView({ type: 'lists' })}
        size="small"
        edge="start"
        aria-label="Back to lists"
        sx={{ ml: -0.5 }}
      >
        <TbArrowLeft size={20} />
      </IconButton>
      <Box
        sx={{
          flexShrink: 0,
          width: 28,
          height: 28,
          borderRadius: 1.5,
          bgcolor: alpha(activeColor, 0.16),
          color: activeColor,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <ActiveListIcon size={16} />
      </Box>
      <Typography noWrap variant="h6" sx={{ fontWeight: 800, flex: 1, minWidth: 0 }}>
        {activeList?.title?.trim() || 'Deleted list'}
      </Typography>
    </Stack>
  )

  // ── body content ─────────────────────────────────────────────────────────

  const bodyContent = (() => {
    if (isEmpty) {
      return (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: 'center', py: 4 }}
        >
          No daily list activity recorded for this day.
        </Typography>
      )
    }

    // Todo view for a specific list
    if (!isListView) {
      if (activeTodoItems.length === 0) {
        return (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            No tasks recorded for this list.
          </Typography>
        )
      }
      return (
        <TodoItemsList
          todos={activeTodoItems}
          onToggle={handleTodoToggle}
          showDelete={false}
          readOnly={false}
        />
      )
    }

    // List cards view
    if (isToday) {
      return (
        <Stack spacing={1.25}>
          {liveGroups.map((group) => {
            const completed = group.todos.filter((t) => t.is_complete).length
            return (
              <HistoryListCard
                key={group.list.id}
                list={group.list}
                completed={completed}
                total={group.todos.length}
                onClick={() =>
                  setView({ type: 'todos-live', listId: group.list.id })
                }
              />
            )
          })}
        </Stack>
      )
    }

    return (
      <Stack spacing={1.25}>
        {historicGroups.map((group) => {
          const completed = group.items.filter((i) => i.was_completed).length
          return (
            <HistoryListCard
              key={group.listPeriodId}
              list={group.list}
              completed={completed}
              total={group.items.length}
              onClick={() =>
                setView({
                  type: 'todos-historic',
                  listPeriodId: group.listPeriodId,
                })
              }
            />
          )
        })}
      </Stack>
    )
  })()

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '92dvh',
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          flex: 1,
        }}
      >
        <Box
          sx={{
            px: 2,
            pt: 2,
            pb: 1.5,
            borderBottom: 1,
            borderColor: 'divider',
            flexShrink: 0,
          }}
        >
          {headerTitle}
        </Box>

        <Box sx={{ px: 2, py: 2, overflowY: 'auto', flex: 1 }}>
          {bodyContent}
        </Box>

        <Stack
          direction="row"
          spacing={1}
          sx={{
            justifyContent: 'flex-end',
            px: 2,
            py: 2,
            pb: 'calc(16px + env(safe-area-inset-bottom))',
            borderTop: 1,
            borderColor: 'divider',
            flexShrink: 0,
          }}
        >
          <Button onClick={onClose}>Cancel</Button>
        </Stack>
      </Box>
    </Drawer>
  )
}
