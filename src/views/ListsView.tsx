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
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import AppHeader from '../components/AppHeader'
import { supabase } from '../supabase'
import type { Database } from '../database.types'
import {
  DEFAULT_LIST_COLOR,
  LIST_PALETTE,
  normalizeListColor,
} from '../listColors'

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

  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [colorHex, setColorHex] = useState<string>(DEFAULT_LIST_COLOR)

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

  const openCreateEditor = () => {
    setEditorMode('create')
    setEditingId(null)
    setTitle('')
    setColorHex(DEFAULT_LIST_COLOR)
    setEditorOpen(true)
  }

  const openEditEditor = (list: ListRow) => {
    setMenuFor(null)
    setEditorMode('edit')
    setEditingId(list.id)
    setTitle(list.title)
    setColorHex(normalizeListColor(list.color))
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setEditingId(null)
  }

  const saveList = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    const nextTitle = title.trim() || 'Untitled list'
    const hex = normalizeListColor(colorHex)
    if (editorMode === 'create') {
      await supabase.from('lists').insert({ title: nextTitle, color: hex })
    } else if (editingId != null) {
      await supabase
        .from('lists')
        .update({ title: nextTitle, color: hex })
        .eq('id', editingId)
    }
    closeEditor()
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
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            },
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
              <Card
                key={list.id}
                sx={{
                  position: 'relative',
                  borderLeft: '6px solid',
                  borderLeftColor: normalizeListColor(list.color),
                }}
              >
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
          onClick={() => {
            const row = lists.find((l) => l.id === menuFor?.id)
            if (row) openEditEditor(row)
          }}
        >
          <ListItemIcon>
            <EditRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit list</ListItemText>
        </MenuItem>
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
        onClick={openCreateEditor}
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
        open={editorOpen}
        onClose={closeEditor}
        fullWidth
        maxWidth="xs"
      >
        <form onSubmit={saveList}>
          <DialogTitle>
            {editorMode === 'create' ? 'New list' : 'Edit list'}
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              margin="dense"
              label="List name"
              placeholder="List name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Typography variant="overline" color="text.secondary">
              Color
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: 1,
                mt: 0.5,
              }}
            >
              {LIST_PALETTE.map((hex) => {
                const selected = colorHex === hex
                return (
                  <Box
                    key={hex}
                    component="button"
                    type="button"
                    title={hex}
                    aria-label={`Color ${hex}`}
                    aria-pressed={selected}
                    onClick={() => setColorHex(hex)}
                    sx={{
                      width: '100%',
                      aspectRatio: '1',
                      minHeight: 0,
                      border: 0,
                      borderRadius: 1,
                      bgcolor: hex,
                      cursor: 'pointer',
                      boxSizing: 'border-box',
                      outline: selected ? '3px solid' : '2px solid transparent',
                      outlineColor: selected ? 'primary.main' : 'transparent',
                      outlineOffset: 1,
                      boxShadow: selected ? 2 : 0,
                      p: 0,
                      '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: 'primary.main',
                        outlineOffset: 2,
                      },
                    }}
                  />
                )
              })}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeEditor}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              {editorMode === 'create' ? 'Create' : 'Save'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  )
}
