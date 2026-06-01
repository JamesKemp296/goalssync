import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Drawer,
  Fab,
  Stack,
  Typography,
} from '@mui/material'
import { TbCheckupList, TbList, TbPlus, TbTrashX } from 'react-icons/tb'
import AppHeader, { type AppHeaderMenuItem } from '../components/AppHeader'
import TodoComposer from '../components/TodoComposer'
import TodoItemsList, {
  type TodoEditPayload,
} from '../components/TodoItemsList'
import { normalizeListColor } from '../listColors'
import { supabase } from '../supabase'
import type { Database } from '../database.types'
import {
  completionFromProgress,
  completionFromTargetEdit,
  nextProgressCount,
} from '../todoProgress'

type TodoRow = Database['public']['Tables']['todos']['Row']
type ListRow = Database['public']['Tables']['lists']['Row']
type TodosRouteState = { backTo?: string }
type TodoSortKey = 'recent' | 'oldest' | 'az' | 'notDone'

function sortTodos(todos: TodoRow[], sort: TodoSortKey): TodoRow[] {
  const copy = [...todos]
  const byTask = (a: TodoRow, b: TodoRow) =>
    a.task.localeCompare(b.task, undefined, { sensitivity: 'base' })

  switch (sort) {
    case 'recent':
      copy.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
      break
    case 'oldest':
      copy.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))
      break
    case 'az':
      copy.sort(byTask)
      break
    case 'notDone':
      copy.sort((a, b) => {
        const byComplete = Number(a.is_complete) - Number(b.is_complete)
        return byComplete !== 0 ? byComplete : byTask(a, b)
      })
      break
  }
  return copy
}

export default function TodosView() {
  const { listId: listIdParam } = useParams<{ listId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const listId = listIdParam ? Number(listIdParam) : NaN
  const routeState = location.state as TodosRouteState | null
  const backTo =
    typeof routeState?.backTo === 'string' ? routeState.backTo : '/lists'

  const [list, setList] = useState<ListRow | null>(null)
  const [todos, setTodos] = useState<TodoRow[]>([])
  const [text, setText] = useState('')
  const [targetCount, setTargetCount] = useState(1)
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<TodoSortKey>('recent')
  const [composerOpen, setComposerOpen] = useState(false)

  const loadTodos = useCallback(async () => {
    if (!supabase || !Number.isFinite(listId)) return
    const { data } = await supabase
      .from('todos')
      .select('*')
      .eq('list_id', listId)
      .order('created_at', { ascending: false })
    setTodos((data as TodoRow[] | null) ?? [])
  }, [listId])

  useEffect(() => {
    if (!Number.isFinite(listId)) {
      navigate(backTo, { replace: true })
      return
    }
    let cancelled = false
    setLoading(true)
    setList(null)
    void (async () => {
      if (!supabase) return
      const { data: authData } = await supabase.auth.getUser()
      const myUserId = authData.user?.id
      if (!myUserId) {
        if (cancelled) return
        setLoading(false)
        navigate(backTo, { replace: true })
        return
      }
      const { data: listRow, error } = await supabase
        .from('lists')
        .select('*')
        .eq('id', listId)
        .eq('user_id', myUserId)
        .maybeSingle()
      if (cancelled) return
      if (error || !listRow) {
        setLoading(false)
        navigate(backTo, { replace: true })
        return
      }
      setList(listRow as ListRow)
      const { data: todoRows } = await supabase
        .from('todos')
        .select('*')
        .eq('list_id', listId)
        .order('created_at', { ascending: false })
      if (cancelled) return
      setTodos((todoRows as TodoRow[] | null) ?? [])
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [backTo, listId, navigate])

  const add = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase || !text.trim() || !Number.isFinite(listId)) return
    const target = Math.min(99, Math.max(1, targetCount))
    await supabase.from('todos').insert({
      list_id: listId,
      task: text.trim(),
      target_count: target,
    })
    setText('')
    setTargetCount(1)
    setComposerOpen(false)
    void loadTodos()
  }

  const closeComposer = () => {
    setComposerOpen(false)
  }

  const evaluateBadges = useCallback(async () => {
    if (!supabase) return
    const { error } = await supabase.rpc('evaluate_user_badges')
    if (error) console.error('evaluate_user_badges failed', error)
  }, [])

  const advanceTodo = async (t: TodoRow) => {
    if (!supabase) return
    const nextProgress = nextProgressCount(t)
    const wasComplete = t.is_complete
    const { is_complete, completed_at } = completionFromProgress(
      nextProgress,
      t.target_count,
      t.completed_at,
    )
    await supabase
      .from('todos')
      .update({ progress_count: nextProgress, is_complete, completed_at })
      .eq('id', t.id)
    if (is_complete && !wasComplete) void evaluateBadges()
  }

  const advance = async (t: TodoRow) => {
    await advanceTodo(t)
    void loadTodos()
  }

  const advanceSubtask = async (sub: TodoRow) => {
    if (!supabase || sub.parent_id == null) return

    const nextProgress = nextProgressCount(sub)
    const wasComplete = sub.is_complete
    const { is_complete, completed_at } = completionFromProgress(
      nextProgress,
      sub.target_count,
      sub.completed_at,
    )
    await supabase
      .from('todos')
      .update({ progress_count: nextProgress, is_complete, completed_at })
      .eq('id', sub.id)
    if (is_complete && !wasComplete) void evaluateBadges()

    // Check if all siblings are now complete so we can advance the parent
    if (is_complete) {
      const { data: siblings } = await supabase
        .from('todos')
        .select('id, is_complete')
        .eq('parent_id', sub.parent_id)

      // Use the just-written value for this sub-task
      const allSiblingsDone = (siblings ?? []).every((s) =>
        s.id === sub.id ? is_complete : s.is_complete,
      )

      if (allSiblingsDone) {
        const parent = todos.find((t) => t.id === sub.parent_id)
        if (parent) {
          const parentNextProgress = nextProgressCount(parent)
          const parentCompletion = completionFromProgress(
            parentNextProgress,
            parent.target_count,
            parent.completed_at,
          )
          await supabase
            .from('todos')
            .update({
              progress_count: parentNextProgress,
              is_complete: parentCompletion.is_complete,
              completed_at: parentCompletion.completed_at,
            })
            .eq('id', parent.id)
          if (parentCompletion.is_complete && !parent.is_complete)
            void evaluateBadges()

          // If the parent still has more increments to go, reset sub-tasks
          if (!parentCompletion.is_complete) {
            await supabase
              .from('todos')
              .update({
                progress_count: 0,
                is_complete: false,
                completed_at: null,
              })
              .eq('parent_id', parent.id)
          }
        }
      }
    }

    void loadTodos()
  }

  const addSubtask = async (parentId: number, payload: TodoEditPayload) => {
    if (!supabase || !Number.isFinite(listId)) return
    const target = Math.min(99, Math.max(1, payload.target_count))
    await supabase.from('todos').insert({
      list_id: listId,
      parent_id: parentId,
      task: payload.task.trim(),
      target_count: target,
    })
    void loadTodos()
  }

  const remove = async (id: number) => {
    if (!supabase) return
    await supabase.from('todos').delete().eq('id', id)
    void loadTodos()
  }

  const edit = async (id: number, payload: TodoEditPayload) => {
    if (!supabase) return
    const task = payload.task.trim()
    if (!task) return
    const todo = todos.find((item) => item.id === id)
    if (!todo) return
    const target = Math.min(99, Math.max(1, payload.target_count))
    const synced = completionFromTargetEdit(
      todo.progress_count,
      target,
      todo.completed_at,
    )
    await supabase
      .from('todos')
      .update({
        task,
        target_count: target,
        progress_count: synced.progress_count,
        is_complete: synced.is_complete,
        completed_at: synced.completed_at,
      })
      .eq('id', id)
    void loadTodos()
  }

  const markAll = async (complete: boolean) => {
    if (!supabase || !Number.isFinite(listId)) return
    const db = supabase
    const now = new Date().toISOString()
    if (complete) {
      await Promise.all(
        todos.map((t) =>
          db
            .from('todos')
            .update({
              progress_count: Math.max(1, t.target_count),
              is_complete: true,
              completed_at: now,
            })
            .eq('id', t.id),
        ),
      )
      void evaluateBadges()
    } else {
      await db
        .from('todos')
        .update({
          progress_count: 0,
          is_complete: false,
          completed_at: null,
        })
        .eq('list_id', listId)
    }
    void loadTodos()
  }

  const deleteList = async () => {
    if (!supabase || !Number.isFinite(listId)) return
    await supabase.from('lists').delete().eq('id', listId)
    navigate(backTo, { replace: true })
  }

  const subTasksMap = useMemo(() => {
    const map: Record<number, TodoRow[]> = {}
    for (const t of todos) {
      if (t.parent_id != null) {
        ;(map[t.parent_id] ??= []).push(t)
      }
    }
    return map
  }, [todos])

  const sortedTodos = useMemo(
    () => sortTodos(todos.filter((t) => t.parent_id == null), sort),
    [todos, sort],
  )

  const menuItems = useMemo<AppHeaderMenuItem[]>(
    () => [
      {
        label: 'Mark all complete',
        icon: <TbCheckupList size={18} />,
        onClick: () => void markAll(true),
        disabled: todos.length === 0,
      },
      {
        label: 'Mark all incomplete',
        icon: <TbList size={18} />,
        onClick: () => void markAll(false),
        disabled: todos.length === 0,
      },
      {
        label: 'Delete list',
        icon: <TbTrashX size={18} />,
        danger: true,
        onClick: () => void deleteList(),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todos.length, listId],
  )

  if (!Number.isFinite(listId)) return null

  if (loading || !list) {
    return (
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <AppHeader title="Loading…" backTo={backTo} />
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8, flex: 1 }}>
          <CircularProgress />
        </Box>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <AppHeader title={list.title} backTo={backTo} menuItems={menuItems} />
      <Box
        sx={{
          height: 4,
          bgcolor: normalizeListColor(list.color),
        }}
      />
      <Container
        maxWidth="sm"
        disableGutters
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
          }}
        >
          <Box sx={{ pt: 2, px: 2, pb: 2 }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ mb: 1.5, overflowX: 'auto' }}
          >
            <Chip
              label="Recent"
              color={sort === 'recent' ? 'primary' : 'default'}
              onClick={() => setSort('recent')}
            />
            <Chip
              label="Oldest"
              color={sort === 'oldest' ? 'primary' : 'default'}
              onClick={() => setSort('oldest')}
            />
            <Chip
              label="A–Z"
              color={sort === 'az' ? 'primary' : 'default'}
              onClick={() => setSort('az')}
            />
            <Chip
              label="Not done"
              color={sort === 'notDone' ? 'primary' : 'default'}
              onClick={() => setSort('notDone')}
            />
          </Stack>
          <TodoItemsList
            todos={sortedTodos}
            subTasksMap={subTasksMap}
            onToggle={(id) => {
              const todo = todos.find((item) => item.id === id)
              if (todo) void advance(todo)
            }}
            onRemove={(id) => void remove(id)}
            onEdit={(id, payload) => edit(id, payload)}
            onAddSubtask={(parentId, payload) =>
              void addSubtask(parentId, payload)
            }
            onToggleSubtask={(id) => {
              const sub = todos.find((item) => item.id === id)
              if (sub) void advanceSubtask(sub)
            }}
            onRemoveSubtask={(id) => void remove(id)}
            onEditSubtask={(id, payload) => edit(id, payload)}
          />
          </Box>
        </Box>
      </Container>

      <Fab
        color="primary"
        aria-label="Add task"
        onClick={() => setComposerOpen(true)}
        sx={{
          position: 'fixed',
          right: 20,
          bottom: 'calc(64px + env(safe-area-inset-bottom) + 16px)',
          zIndex: (theme) => theme.zIndex.appBar + 1,
        }}
      >
        <TbPlus size={24} />
      </Fab>

      <Drawer
        anchor="bottom"
        open={composerOpen}
        onClose={closeComposer}
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
          component="form"
          onSubmit={add}
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
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              New task
            </Typography>
          </Box>
          <Box sx={{ px: 2, py: 2, overflowY: 'auto', flex: 1 }}>
            <TodoComposer
              value={text}
              onChange={setText}
              targetCount={targetCount}
              onTargetCountChange={setTargetCount}
              placeholder="What needs doing?"
            />
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
            <Button onClick={closeComposer}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={!text.trim()}
            >
              Create
            </Button>
          </Stack>
        </Box>
      </Drawer>
    </Box>
  )
}
