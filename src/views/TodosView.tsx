import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import {
  AppBar, Toolbar, Typography, Button, Container, Stack, TextField,
  List, ListItem, ListItemText, Checkbox, IconButton, Paper, Box, CircularProgress
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { supabase } from '../supabase'
import type { Database } from '../database.types'

type TodoRow = Database['public']['Tables']['todos']['Row']
type ListRow = Database['public']['Tables']['lists']['Row']

type TodosViewProps = {
  session: Session
}

export default function TodosView({ session }: TodosViewProps) {
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
      navigate('/', { replace: true })
      return
    }
    let cancelled = false
    setLoading(true)
    setList(null)
    void (async () => {
      if (!supabase) return
      const { data: listRow, error } = await supabase.from('lists').select('*').eq('id', listId).maybeSingle()
      if (cancelled) return
      if (error || !listRow) {
        setLoading(false)
        navigate('/', { replace: true })
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
    await supabase.from('todos').update({ is_complete: !t.is_complete }).eq('id', t.id)
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
    navigate('/', { replace: true })
  }

  if (!Number.isFinite(listId)) {
    return null
  }

  if (loading || !list) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', pt: 10 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <>
      <AppBar position="static" color="default" elevation={0}>
        <Toolbar>
          <IconButton component={RouterLink} to="/" edge="start" sx={{ mr: 1 }} aria-label="Back to lists">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }} noWrap>{list.title}</Typography>
          <Typography variant="body2" sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}>
            {session.user.email}
          </Typography>
          <Button color="error" onClick={() => void deleteList()} sx={{ mr: 1 }}>Delete list</Button>
          <Button onClick={() => void supabase?.auth.signOut()}>Sign out</Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="sm" sx={{ mt: 4, flex: 1 }}>
        <Paper sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Button size="small" variant="outlined" onClick={() => void markAll(true)}>Mark all complete</Button>
            <Button size="small" variant="outlined" onClick={() => void markAll(false)}>Mark all incomplete</Button>
          </Stack>
          <form onSubmit={add}>
            <Stack direction="row" spacing={1}>
              <TextField
                fullWidth
                size="small"
                placeholder="New task"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <Button type="submit" variant="contained">Add</Button>
            </Stack>
          </form>
          <List>
            {todos.map((t) => (
              <ListItem
                key={t.id}
                secondaryAction={
                  <IconButton edge="end" aria-label="Delete task" onClick={() => void remove(t.id)}>
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <Checkbox
                  checked={t.is_complete}
                  onChange={() => void toggle(t)}
                />
                <ListItemText
                  primary={t.task}
                  sx={{ textDecoration: t.is_complete ? 'line-through' : 'none' }}
                />
              </ListItem>
            ))}
          </List>
          {todos.length === 0 && (
            <Box sx={{ py: 2, color: 'text.secondary', typography: 'body2' }}>No tasks yet.</Box>
          )}
        </Paper>
      </Container>
    </>
  )
}
