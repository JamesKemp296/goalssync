import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link as RouterLink } from 'react-router-dom'
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
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import AppHeader from '../components/AppHeader'
import { normalizeListColor } from '../listColors'
import { supabase } from '../supabase'
import type { Database } from '../database.types'

type ListRow = Database['public']['Tables']['lists']['Row']
type TodoRow = Database['public']['Tables']['todos']['Row']

export default function HomeView() {
  const [list, setList] = useState<ListRow | null>(null)
  const [todos, setTodos] = useState<TodoRow[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)

  const loadTodos = useCallback(async (listId: number) => {
    if (!supabase) return
    const { data } = await supabase
      .from('todos')
      .select('*')
      .eq('list_id', listId)
      .order('created_at', { ascending: false })
    setTodos((data as TodoRow[] | null) ?? [])
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (!supabase) return
      setLoading(true)
      const { data } = await supabase
        .from('lists')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
      if (cancelled) return
      const latest = (data as ListRow[] | null)?.[0] ?? null
      setList(latest)
      if (latest) await loadTodos(latest.id)
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [loadTodos])

  const add = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase || !list || !text.trim()) return
    await supabase.from('todos').insert({ list_id: list.id, task: text.trim() })
    setText('')
    void loadTodos(list.id)
  }

  const toggle = async (t: TodoRow) => {
    if (!supabase || !list) return
    await supabase
      .from('todos')
      .update({ is_complete: !t.is_complete })
      .eq('id', t.id)
    void loadTodos(list.id)
  }

  const remove = async (id: number) => {
    if (!supabase || !list) return
    await supabase.from('todos').delete().eq('id', id)
    void loadTodos(list.id)
  }

  return (
    <>
      <AppHeader title="Home" />
      <Container maxWidth="sm" sx={{ pt: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : !list ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              No lists yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Create your first list to get started.
            </Typography>
            <Button
              component={RouterLink}
              to="/lists"
              variant="contained"
              color="primary"
              startIcon={<AddRoundedIcon />}
            >
              New list
            </Button>
          </Paper>
        ) : (
          <Stack spacing={1.5}>
            <Paper
              sx={{
                p: 2,
                borderLeft: '6px solid',
                borderLeftColor: normalizeListColor(list.color),
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  mb: 1.5,
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
                  {list.title}
                </Typography>
                <Button
                  component={RouterLink}
                  to={`/lists/${list.id}`}
                  size="small"
                  endIcon={<OpenInNewRoundedIcon fontSize="small" />}
                >
                  Open
                </Button>
              </Box>
              <form onSubmit={add}>
                <Stack direction="row" spacing={1}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Add a task"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                  <Button type="submit" variant="contained" color="primary">
                    Add
                  </Button>
                </Stack>
              </form>
              <List>
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
                        <DeleteOutlineRoundedIcon />
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
                        color: t.is_complete
                          ? 'text.secondary'
                          : 'text.primary',
                      }}
                    />
                  </ListItem>
                ))}
              </List>
              {todos.length === 0 ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ py: 1 }}
                >
                  No tasks yet.
                </Typography>
              ) : null}
            </Paper>
          </Stack>
        )}
      </Container>
    </>
  )
}
