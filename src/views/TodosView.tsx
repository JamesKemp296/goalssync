import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Box, CircularProgress, Container } from '@mui/material'
import { TbCheckupList, TbList, TbTrashX } from 'react-icons/tb'
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

export default function TodosView() {
  const { listId: listIdParam } = useParams<{ listId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const listId = listIdParam ? Number(listIdParam) : NaN
  const routeState = location.state as TodosRouteState | null
  const backTo = typeof routeState?.backTo === 'string' ? routeState.backTo : '/lists'

  const [list, setList] = useState<ListRow | null>(null)
  const [todos, setTodos] = useState<TodoRow[]>([])
  const [text, setText] = useState('')
  const [targetCount, setTargetCount] = useState(1)
  const [loading, setLoading] = useState(true)

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
    void loadTodos()
  }

  const evaluateBadges = useCallback(async () => {
    if (!supabase) return
    const { error } = await supabase.rpc('evaluate_user_badges')
    if (error) console.error('evaluate_user_badges failed', error)
  }, [])

  const advance = async (t: TodoRow) => {
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
      .update({
        progress_count: nextProgress,
        is_complete,
        completed_at,
      })
      .eq('id', t.id)
    if (is_complete && !wasComplete) void evaluateBadges()
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
      const rows = todos
      await Promise.all(
        rows.map((t) =>
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
      <>
        <AppHeader title="Loading…" backTo={backTo} />
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
          <CircularProgress />
        </Box>
      </>
    )
  }

  return (
    <>
      <AppHeader title={list.title} backTo={backTo} menuItems={menuItems} />
      <Box
        sx={{
          height: 4,
          bgcolor: normalizeListColor(list.color),
        }}
      />
      <Container
        maxWidth="sm"
        sx={{ pt: 3, pb: 'calc(24px + env(safe-area-inset-bottom))' }}
      >
        <TodoComposer
          value={text}
          onChange={setText}
          targetCount={targetCount}
          onTargetCountChange={setTargetCount}
          onSubmit={add}
          placeholder="What needs doing?"
        />
        <TodoItemsList
          todos={todos}
          onToggle={(id) => {
            const todo = todos.find((item) => item.id === id)
            if (todo) void advance(todo)
          }}
          onRemove={(id) => void remove(id)}
          onEdit={(id, payload) => edit(id, payload)}
        />
      </Container>
    </>
  )
}
