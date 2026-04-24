import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardActionArea,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import AppHeader from '../components/AppHeader'
import { supabase } from '../supabase'
import type { Database } from '../database.types'

type ListRow = Database['public']['Tables']['lists']['Row']
type SortKey = 'recent' | 'oldest' | 'az'

export default function ListsView() {
  const [lists, setLists] = useState<ListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('recent')
  const [menuFor, setMenuFor] = useState<{
    id: number
    el: HTMLElement
  } | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [title, setTitle] = useState('')

  const load = async () => {
    if (!supabase) return
    setLoading(true)
    const { data } = await supabase.from('lists').select('*')
    setLists((data as ListRow[] | null) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const visibleLists = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const filtered = needle
      ? lists.filter((l) => l.title.toLowerCase().includes(needle))
      : lists
    const sorted = [...filtered]
    if (sort === 'recent') {
      sorted.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    } else if (sort === 'oldest') {
      sorted.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))
    } else {
      sorted.sort((a, b) => a.title.localeCompare(b.title))
    }
    return sorted
  }, [lists, search, sort])

  const create = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    const next = title.trim() || 'Untitled list'
    await supabase.from('lists').insert({ title: next })
    setTitle('')
    setNewOpen(false)
    void load()
  }

  const remove = async (id: number) => {
    if (!supabase) return
    await supabase.from('lists').delete().eq('id', id)
    setMenuFor(null)
    void load()
  }

  return (
    <>
      <AppHeader title="Lists" />
      <Container maxWidth="sm" sx={{ pt: 1, pb: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search lists"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        <Stack direction="row" spacing={1} sx={{ mb: 2, overflowX: 'auto' }}>
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
        </Stack>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : visibleLists.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
            <Typography>
              {lists.length === 0
                ? 'No lists yet. Tap + to create one.'
                : 'No lists match your search.'}
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {visibleLists.map((list) => (
              <Card key={list.id} sx={{ position: 'relative' }}>
                <CardActionArea
                  component={RouterLink}
                  to={`/lists/${list.id}`}
                  sx={{ p: 2, pr: 7 }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 700 }}
                    noWrap
                  >
                    {list.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(list.created_at).toLocaleDateString()}
                  </Typography>
                </CardActionArea>
                <IconButton
                  aria-label="List options"
                  size="small"
                  sx={{ position: 'absolute', top: 8, right: 8 }}
                  onClick={(e) =>
                    setMenuFor({ id: list.id, el: e.currentTarget })
                  }
                >
                  <MoreVertRoundedIcon />
                </IconButton>
              </Card>
            ))}
          </Stack>
        )}
      </Container>

      <Menu
        anchorEl={menuFor?.el ?? null}
        open={Boolean(menuFor)}
        onClose={() => setMenuFor(null)}
      >
        <MenuItem
          onClick={() => menuFor && void remove(menuFor.id)}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon sx={{ color: 'error.main' }}>
            <DeleteOutlineRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete list</ListItemText>
        </MenuItem>
      </Menu>

      <Button
        variant="contained"
        color="primary"
        size="large"
        startIcon={<AddRoundedIcon />}
        onClick={() => setNewOpen(true)}
        aria-label="New list"
        sx={{
          position: 'fixed',
          left: 20,
          right: 20,
          bottom: 84,
          zIndex: (theme) => theme.zIndex.appBar + 1,
          py: 1.25,
          borderRadius: 999,
          boxShadow: 6,
        }}
      >
        New list
      </Button>

      <Dialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <form onSubmit={create}>
          <DialogTitle>New list</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              margin="dense"
              placeholder="List name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              Create
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  )
}
