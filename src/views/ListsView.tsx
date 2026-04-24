import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import {
  AppBar, Toolbar, Typography, Button, Container, Stack, TextField,
  List, ListItem, ListItemButton, ListItemText, IconButton, Paper
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import { supabase } from '../supabase'
import type { Database } from '../database.types'

type ListRow = Database['public']['Tables']['lists']['Row']

type ListsViewProps = {
  session: Session
}

export default function ListsView({ session }: ListsViewProps) {
  const [lists, setLists] = useState<ListRow[]>([])
  const [title, setTitle] = useState('')

  const load = async () => {
    if (!supabase) return
    const { data } = await supabase
      .from('lists')
      .select('*')
      .order('created_at', { ascending: false })
    setLists((data as ListRow[] | null) ?? [])
  }

  useEffect(() => {
    void load()
  }, [])

  const create = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    const t = title.trim() || 'Untitled list'
    await supabase.from('lists').insert({ title: t })
    setTitle('')
    void load()
  }

  const remove = async (id: number) => {
    if (!supabase) return
    await supabase.from('lists').delete().eq('id', id)
    void load()
  }

  return (
    <>
      <AppBar position="static" color="default" elevation={0}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Lists</Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>{session.user.email}</Typography>
          <Button onClick={() => void supabase?.auth.signOut()}>Sign out</Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="sm" sx={{ mt: 4, flex: 1 }}>
        <Paper sx={{ p: 2 }}>
          <form onSubmit={create}>
            <Stack direction="row" spacing={1}>
              <TextField
                fullWidth
                size="small"
                placeholder="New list name"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Button type="submit" variant="contained">Add list</Button>
            </Stack>
          </form>
          <List>
            {lists.map((list) => (
              <ListItem
                key={list.id}
                disablePadding
                secondaryAction={
                  <IconButton edge="end" aria-label="Delete list" onClick={() => void remove(list.id)}>
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemButton component={RouterLink} to={`/lists/${list.id}`} sx={{ pr: 6 }}>
                  <ListItemText primary={list.title} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Paper>
      </Container>
    </>
  )
}
