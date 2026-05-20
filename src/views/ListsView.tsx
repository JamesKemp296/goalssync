import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { TbEdit, TbPin, TbPlus, TbSearch, TbTrash } from 'react-icons/tb'
import AppHeader from '../components/AppHeader'
import ListCard from '../components/ListCard'
import ListCardWrapper, {
  ListCardWrapperItem,
} from '../components/ListCardWrapper'
import { supabase } from '../supabase'
import type { Database } from '../database.types'
import {
  DEFAULT_LIST_ICON,
  LIST_ICON_OPTIONS,
  normalizeListIcon,
} from '../listIcons'
import {
  DEFAULT_LIST_COLOR,
  LIST_PALETTE,
  normalizeListColor,
} from '../listColors'
import {
  TIME_FRAMES,
  TIME_FRAME_LABELS,
  computeNextResetAt,
  normalizeTimeFrame,
} from '../timeFrames'
import type { ListTimeFrame } from '../database.types'

type ListRow = Database['public']['Tables']['lists']['Row']
type SortKey = 'recent' | 'oldest' | 'az'
type ListStats = { total: number; completed: number }

export default function ListsView() {
  const [lists, setLists] = useState<ListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey | null>('recent')
  const [pinnedOnly, setPinnedOnly] = useState(false)
  const [menuFor, setMenuFor] = useState<{
    id: number
    el: HTMLElement
  } | null>(null)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [iconKey, setIconKey] = useState<string>(DEFAULT_LIST_ICON)
  const [colorHex, setColorHex] = useState<string>(DEFAULT_LIST_COLOR)
  const [timeFrame, setTimeFrame] = useState<ListTimeFrame>('none')
  const [editingPrevTimeFrame, setEditingPrevTimeFrame] =
    useState<ListTimeFrame>('none')
  const [statsByListId, setStatsByListId] = useState<Record<number, ListStats>>(
    {},
  )

  const load = async () => {
    if (!supabase) return
    const db = supabase
    setLoading(true)
    const { data: authData } = await db.auth.getUser()
    const myUserId = authData.user?.id
    if (!myUserId) {
      setLoading(false)
      return
    }
    const { data: listRows } = await db
      .from('lists')
      .select('*')
      .eq('user_id', myUserId)
    const rawLists = (listRows as ListRow[] | null) ?? []
    const myListIds = rawLists.map((row) => row.id)
    const { data: todoRows } =
      myListIds.length > 0
        ? await db
            .from('todos')
            .select('list_id,is_complete')
            .in('list_id', myListIds)
        : { data: [] as { list_id: number; is_complete: boolean }[] }
    const rows = rawLists.map((row) => ({
      ...row,
      icon: normalizeListIcon(row.icon),
      color: normalizeListColor(row.color),
    }))
    setLists(rows)
    const updates = rows.filter(
      (row, idx) =>
        row.color !== rawLists[idx]?.color || row.icon !== rawLists[idx]?.icon,
    )
    if (updates.length > 0) {
      void Promise.all(
        updates.map((row) =>
          db
            .from('lists')
            .update({ icon: row.icon, color: row.color })
            .eq('id', row.id),
        ),
      )
    }

    const stats: Record<number, ListStats> = {}
    for (const row of (todoRows as
      | { list_id: number; is_complete: boolean }[]
      | null) ?? []) {
      const current = stats[row.list_id] ?? { total: 0, completed: 0 }
      current.total += 1
      if (row.is_complete) current.completed += 1
      stats[row.list_id] = current
    }
    setStatsByListId(stats)
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const visibleLists = useMemo(() => {
    let base = lists
    if (pinnedOnly) base = base.filter((l) => Boolean(l.pinned_at))
    const needle = search.trim().toLowerCase()
    const filtered = needle
      ? base.filter((l) => l.title.toLowerCase().includes(needle))
      : [...base]
    const sorted = [...filtered]
    if (sort === 'recent') {
      sorted.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    } else if (sort === 'oldest') {
      sorted.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))
    } else if (sort === 'az') {
      sorted.sort((a, b) => a.title.localeCompare(b.title))
    }
    return sorted
  }, [lists, search, sort, pinnedOnly])

  const toggleSort = (nextSort: SortKey) => {
    setSort((currentSort) => (currentSort === nextSort ? null : nextSort))
  }

  const openCreateEditor = () => {
    setEditorMode('create')
    setEditingId(null)
    setTitle('')
    setIconKey(DEFAULT_LIST_ICON)
    setColorHex(DEFAULT_LIST_COLOR)
    setTimeFrame('none')
    setEditingPrevTimeFrame('none')
    setEditorOpen(true)
  }

  const openEditEditor = (list: ListRow) => {
    setMenuFor(null)
    setEditorMode('edit')
    setEditingId(list.id)
    setTitle(list.title)
    setIconKey(normalizeListIcon(list.icon))
    setColorHex(normalizeListColor(list.color))
    const tf = normalizeTimeFrame(list.time_frame)
    setTimeFrame(tf)
    setEditingPrevTimeFrame(tf)
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
    const nextIcon = normalizeListIcon(iconKey)
    const hex = normalizeListColor(colorHex)
    const nextTimeFrame = normalizeTimeFrame(timeFrame)
    const now = new Date()
    const nextResetAt = computeNextResetAt(nextTimeFrame, now)
    const cadenceChanged = nextTimeFrame !== editingPrevTimeFrame
    if (editorMode === 'create') {
      await supabase.from('lists').insert({
        title: nextTitle,
        icon: nextIcon,
        color: hex,
        time_frame: nextTimeFrame,
        current_period_started_at:
          nextTimeFrame === 'none' ? null : now.toISOString(),
        next_reset_at: nextResetAt ? nextResetAt.toISOString() : null,
      })
    } else if (editingId != null) {
      const updates: Record<string, unknown> = {
        title: nextTitle,
        icon: nextIcon,
        color: hex,
        time_frame: nextTimeFrame,
      }
      if (cadenceChanged) {
        updates.current_period_started_at =
          nextTimeFrame === 'none' ? null : now.toISOString()
        updates.next_reset_at = nextResetAt ? nextResetAt.toISOString() : null
      }
      await supabase.from('lists').update(updates).eq('id', editingId)
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

  const togglePin = async (row: ListRow) => {
    if (!supabase) return
    const isPinned = Boolean(row.pinned_at)
    if (isPinned) {
      await supabase.from('lists').update({ pinned_at: null }).eq('id', row.id)
    } else {
      await supabase
        .from('lists')
        .update({ pinned_at: null })
        .eq('user_id', row.user_id)
        .neq('id', row.id)
      await supabase
        .from('lists')
        .update({ pinned_at: new Date().toISOString() })
        .eq('id', row.id)
    }
    setMenuFor(null)
    void load()
  }

  const menuForList = menuFor ? lists.find((l) => l.id === menuFor.id) : null

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
      <AppHeader title="Lists" />
      <Container
        maxWidth="sm"
        sx={{
          pt: 1,
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
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
                  <TbSearch size={16} />
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
            onClick={() => toggleSort('recent')}
          />
          <Chip
            label="Oldest"
            color={sort === 'oldest' ? 'primary' : 'default'}
            onClick={() => toggleSort('oldest')}
          />
          <Chip
            label="A–Z"
            color={sort === 'az' ? 'primary' : 'default'}
            onClick={() => toggleSort('az')}
          />
          <Chip
            icon={<TbPin size={16} />}
            label="Pinned"
            color={pinnedOnly ? 'primary' : 'default'}
            onClick={() => setPinnedOnly((v) => !v)}
          />
        </Stack>

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            pb: 12,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
            All Lists
          </Typography>
          {loading ? (
            <Box>
              <ListCardWrapper>
                {Array.from({ length: 1 }).map((_, idx) => (
                  <ListCardWrapperItem key={`lists-skeleton-${idx}`}>
                    <ListCard
                      loading
                      listId={0}
                      title=""
                      listColor="transparent"
                      progress={0}
                      total={0}
                      completed={0}
                      showMenuButton
                    />
                  </ListCardWrapperItem>
                ))}
              </ListCardWrapper>
            </Box>
          ) : (
            <Box>
              {visibleLists.length === 0 ? (
                <Box
                  sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}
                >
                  <Typography>
                    {lists.length === 0
                      ? 'No lists yet. Tap + to create one.'
                      : pinnedOnly
                        ? 'No pinned list matches your search.'
                        : 'No lists match your search.'}
                  </Typography>
                </Box>
              ) : (
                <ListCardWrapper>
                  {visibleLists.map((list) => {
                    const listColor = normalizeListColor(list.color)
                    const stats = statsByListId[list.id] ?? {
                      total: 0,
                      completed: 0,
                    }
                    const progress =
                      stats.total === 0
                        ? 0
                        : Math.round((stats.completed / stats.total) * 100)

                    return (
                      <ListCardWrapperItem key={list.id}>
                        <ListCard
                          listId={list.id}
                          title={list.title}
                          listColor={listColor}
                          progress={progress}
                          total={stats.total}
                          completed={stats.completed}
                          iconKey={list.icon}
                          isPinned={Boolean(list.pinned_at)}
                          showMenuButton
                          timeFrame={normalizeTimeFrame(list.time_frame)}
                          onOpenMenu={(el) => setMenuFor({ id: list.id, el })}
                        />
                      </ListCardWrapperItem>
                    )
                  })}
                </ListCardWrapper>
              )}
            </Box>
          )}
        </Box>
      </Container>

      <Menu
        anchorEl={menuFor?.el ?? null}
        open={Boolean(menuFor)}
        onClose={() => setMenuFor(null)}
      >
        <MenuItem onClick={() => menuForList && openEditEditor(menuForList)}>
          <ListItemIcon>
            <TbEdit size={18} />
          </ListItemIcon>
          <ListItemText>Edit list</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => menuForList && void togglePin(menuForList)}
        >
          <ListItemIcon>
            <TbPin size={18} />
          </ListItemIcon>
          <ListItemText>
            {menuForList?.pinned_at ? 'Unpin list' : 'Pin list'}
          </ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => menuFor && void remove(menuFor.id)}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon sx={{ color: 'error.main' }}>
            <TbTrash size={18} />
          </ListItemIcon>
          <ListItemText>Delete list</ListItemText>
        </MenuItem>
      </Menu>

      <Button
        variant="contained"
        color="primary"
        size="large"
        startIcon={<TbPlus size={18} />}
        onClick={openCreateEditor}
        aria-label="New list"
        sx={{
          position: 'fixed',
          left: 20,
          right: 20,
          bottom: 'calc(64px + env(safe-area-inset-bottom) + 16px)',
          zIndex: (theme) => theme.zIndex.appBar + 1,
          py: 1.25,
          borderRadius: 999,
          boxShadow: 6,
        }}
      >
        New list
      </Button>

      <Dialog open={editorOpen} onClose={closeEditor} fullWidth maxWidth="xs">
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
              Icon
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: 1,
                mt: 0.5,
                mb: 2,
              }}
            >
              {LIST_ICON_OPTIONS.map((item) => {
                const selected = iconKey === item.key
                const Icon = item.Icon
                return (
                  <Box
                    key={item.key}
                    component="button"
                    type="button"
                    title={item.label}
                    aria-label={item.label}
                    aria-pressed={selected}
                    onClick={() => setIconKey(item.key)}
                    sx={{
                      width: '100%',
                      aspectRatio: '1',
                      minHeight: 0,
                      border: 0,
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      borderRadius: 1,
                      display: 'grid',
                      placeItems: 'center',
                      cursor: 'pointer',
                      color: 'text.primary',
                      bgcolor: selected ? colorHex : 'action.hover',
                      boxSizing: 'border-box',
                      outline: selected ? '3px solid' : '2px solid transparent',
                      outlineColor: selected ? 'primary.main' : 'transparent',
                      outlineOffset: 1,
                      p: 0,
                      WebkitTapHighlightColor: 'transparent',
                      '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: 'primary.main',
                        outlineOffset: 2,
                      },
                    }}
                  >
                    <Icon size={18} />
                  </Box>
                )
              })}
            </Box>
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

            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ mt: 2, display: 'block' }}
            >
              Cadence
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              sx={{ mt: 0.5, flexWrap: 'wrap', rowGap: 1 }}
            >
              {TIME_FRAMES.map((tf) => (
                <Chip
                  key={tf}
                  label={TIME_FRAME_LABELS[tf]}
                  color={timeFrame === tf ? 'primary' : 'default'}
                  onClick={() => setTimeFrame(tf)}
                />
              ))}
            </Stack>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 0.75, display: 'block' }}
            >
              {timeFrame === 'none'
                ? "This list never resets. It won't contribute to streaks or badges."
                : timeFrame === 'daily'
                  ? 'Resets every day at local midnight.'
                  : timeFrame === 'weekly'
                    ? 'Resets every Monday at local midnight.'
                    : 'Resets on the 1st of each month.'}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeEditor}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              {editorMode === 'create' ? 'Create' : 'Save'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  )
}
