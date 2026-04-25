import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { TbCheckupList, TbList, TbTrash, TbTrashX } from 'react-icons/tb'
import AppHeader, { type AppHeaderMenuItem } from '../components/AppHeader'
import { normalizeListColor } from '../listColors'
import { supabase } from '../supabase'
import type { Database } from '../database.types'

type TodoRow = Database['public']['Tables']['todos']['Row']
type ListRow = Database['public']['Tables']['lists']['Row']

export default function TodosView() {
  const { listId: listIdParam } = useParams<{ listId: string }>()
  const navigate = useNavigate()
  const listId = listIdParam ? Number(listIdParam) : NaN

  const [list, setList] = useState<ListRow | null>(null)
  const [todos, setTodos] = useState<TodoRow[]>([])
  const [text, setText] = useState('')
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
      navigate('/lists', { replace: true })
      return
    }
    let cancelled = false
    setLoading(true)
    setList(null)
    void (async () => {
      if (!supabase) return
      const { data: listRow, error } = await supabase
        .from('lists')
        .select('*')
        .eq('id', listId)
        .maybeSingle()
      if (cancelled) return
      if (error || !listRow) {
        setLoading(false)
        navigate('/lists', { replace: true })
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
  }, [listId, navigate])

  const add = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase || !text.trim() || !Number.isFinite(listId)) return
    await supabase.from('todos').insert({ list_id: listId, task: text.trim() })
    setText('')
    void loadTodos()
  }

  const toggle = async (t: TodoRow) => {
    if (!supabase) return
    await supabase
      .from('todos')
      .update({ is_complete: !t.is_complete })
      .eq('id', t.id)
    void loadTodos()
  }

  const remove = async (id: number) => {
    if (!supabase) return
    await supabase.from('todos').delete().eq('id', id)
    void loadTodos()
  }

  const markAll = async (is_complete: boolean) => {
    if (!supabase || !Number.isFinite(listId)) return
    await supabase.from('todos').update({ is_complete }).eq('list_id', listId)
    void loadTodos()
  }

  const deleteList = async () => {
    if (!supabase || !Number.isFinite(listId)) return
    await supabase.from('lists').delete().eq('id', listId)
    navigate('/lists', { replace: true })
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
        <AppHeader title="Loading…" backTo="/lists" />
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
          <CircularProgress />
        </Box>
      </>
    )
  }

  return (
    <>
      <AppHeader title={list.title} backTo="/lists" menuItems={menuItems} />
      <Box
        sx={{
          height: 4,
          bgcolor: normalizeListColor(list.color),
        }}
      />
      <Container maxWidth="sm" sx={{ pt: 2 }}>
        <Stack spacing={2}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
              Add task
            </Typography>
            <form onSubmit={add}>
              <Stack direction="row" spacing={1}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="What needs doing?"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <Button type="submit" variant="contained" color="primary">
                  Add
                </Button>
              </Stack>
            </form>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Tasks
            </Typography>
            <List disablePadding>
              {todos.map((t) => (
                <ListItem
                  key={t.id}
                  disableGutters
                  secondaryAction={
                    <IconButton
                      edge="end"
                      aria-label="Delete task"
                      onClick={() => void remove(t.id)}
                    >
                      <TbTrash size={18} />
                    </IconButton>
                  }
                >
                  <Checkbox
                    edge="start"
                    checked={t.is_complete}
                    onChange={() => void toggle(t)}
                  />
                  <ListItemText
                    primary={t.task}
                    sx={{
                      textDecoration: t.is_complete ? 'line-through' : 'none',
                      color: t.is_complete ? 'text.secondary' : 'text.primary',
                    }}
                  />
                </ListItem>
              ))}
            </List>
            {todos.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                No tasks yet.
              </Typography>
            ) : null}
          </Paper>
        </Stack>
      </Container>
    </>
  )
}
