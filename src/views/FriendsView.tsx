import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  CircularProgress,
  Container,
  Drawer,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { TbPlus } from 'react-icons/tb'
import AppHeader from '../components/AppHeader'
import ListCard from '../components/ListCard'
import ListCardWrapper, {
  ListCardWrapperItem,
} from '../components/ListCardWrapper'
import TodoItemsList from '../components/TodoItemsList'
import { normalizeListColor } from '../listColors'
import { normalizeListIcon } from '../listIcons'
import { supabase } from '../supabase'
import type { Database } from '../database.types'
import { resetPasswordUrl } from '../appUrl'

type ProfileRow = Database['public']['Tables']['profiles']['Row']
type FriendshipRow = Database['public']['Tables']['friendships']['Row']
type ListRow = Database['public']['Tables']['lists']['Row']
type TodoRow = Database['public']['Tables']['todos']['Row']
type ListStats = { total: number; completed: number }

type Friend = ProfileRow & { displayName: string; initial: string }
type ViewMode =
  | { kind: 'friend-list' }
  | { kind: 'friend-lists'; friend: Friend }
  | { kind: 'friend-todos'; friend: Friend; list: ListRow }

type Feedback = { type: 'success' | 'error'; text: string }
const INVITE_ALLOWED_EMAIL = 'jamesdanielkemp@gmail.com'

function profileToFriend(row: ProfileRow): Friend {
  const displayName =
    [row.first_name?.trim(), row.last_name?.trim()].filter(Boolean).join(' ') ||
    row.email
  const initial = (displayName[0] ?? row.email[0] ?? '?').toUpperCase()
  return { ...row, displayName, initial }
}

export default function FriendsView() {
  const [me, setMe] = useState<string | null>(null)
  const [meEmail, setMeEmail] = useState<string>('')
  const [friends, setFriends] = useState<Friend[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>({ kind: 'friend-list' })

  const [addOpen, setAddOpen] = useState(false)
  const [addEmail, setAddEmail] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addFeedback, setAddFeedback] = useState<Feedback | null>(null)
  const [pageFeedback, setPageFeedback] = useState<Feedback | null>(null)

  const [friendLists, setFriendLists] = useState<ListRow[]>([])
  const [friendStats, setFriendStats] = useState<Record<number, ListStats>>({})
  const [friendListsLoading, setFriendListsLoading] = useState(false)

  const [friendTodos, setFriendTodos] = useState<TodoRow[]>([])
  const [friendTodosLoading, setFriendTodosLoading] = useState(false)

  const loadFriends = async () => {
    if (!supabase) return
    setLoading(true)
    const { data: authData } = await supabase.auth.getUser()
    const myId = authData.user?.id ?? null
    const myEmail = authData.user?.email?.toLowerCase() ?? ''
    setMe(myId)
    setMeEmail(myEmail)

    const { data: rows, error } = await supabase
      .from('friendships')
      .select('user_a_id,user_b_id')
    if (error) {
      setPageFeedback({ type: 'error', text: error.message })
      setFriends([])
      setLoading(false)
      return
    }

    const friendIds = ((rows as FriendshipRow[] | null) ?? [])
      .map((r) => (r.user_a_id === myId ? r.user_b_id : r.user_a_id))
      .filter((id): id is string => Boolean(id) && id !== myId)

    if (friendIds.length === 0) {
      setFriends([])
      setLoading(false)
      return
    }

    const { data: profileRows, error: profErr } = await supabase
      .from('profiles')
      .select('*')
      .in('id', friendIds)

    if (profErr) {
      setPageFeedback({ type: 'error', text: profErr.message })
      setFriends([])
      setLoading(false)
      return
    }

    const next = ((profileRows as ProfileRow[] | null) ?? [])
      .map(profileToFriend)
      .sort((a, b) =>
        a.displayName.localeCompare(b.displayName, undefined, {
          sensitivity: 'base',
        }),
      )
    setFriends(next)
    setLoading(false)
  }

  useEffect(() => {
    void loadFriends()
  }, [])

  useEffect(() => {
    if (view.kind !== 'friend-lists' || !supabase) return
    const friendId = view.friend.id
    let cancelled = false
    setFriendListsLoading(true)
    setFriendLists([])
    setFriendStats({})
    void (async () => {
      const [{ data: listRows }, { data: todoRows }] = await Promise.all([
        supabase!.from('lists').select('*').eq('user_id', friendId),
        supabase!
          .from('todos')
          .select('list_id,is_complete,id,task,created_at'),
      ])
      if (cancelled) return
      const lists = ((listRows as ListRow[] | null) ?? []).map((row) => ({
        ...row,
        icon: normalizeListIcon(row.icon),
        color: normalizeListColor(row.color),
      }))
      const listIds = new Set(lists.map((l) => l.id))
      const stats: Record<number, ListStats> = {}
      for (const t of (todoRows as TodoRow[] | null) ?? []) {
        if (!listIds.has(t.list_id)) continue
        const cur = stats[t.list_id] ?? { total: 0, completed: 0 }
        cur.total += 1
        if (t.is_complete) cur.completed += 1
        stats[t.list_id] = cur
      }
      lists.sort(
        (a, b) =>
          +new Date(b.pinned_at ?? b.created_at) -
          +new Date(a.pinned_at ?? a.created_at),
      )
      setFriendLists(lists)
      setFriendStats(stats)
      setFriendListsLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [view])

  useEffect(() => {
    if (view.kind !== 'friend-todos' || !supabase) return
    const listId = view.list.id
    let cancelled = false
    setFriendTodosLoading(true)
    setFriendTodos([])
    void (async () => {
      const { data } = await supabase!
        .from('todos')
        .select('*')
        .eq('list_id', listId)
        .order('created_at', { ascending: false })
      if (cancelled) return
      setFriendTodos((data as TodoRow[] | null) ?? [])
      setFriendTodosLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [view])

  const submitInvite = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    if (meEmail !== INVITE_ALLOWED_EMAIL) return
    const email = addEmail.trim().toLowerCase()
    if (!email) return
    setAddLoading(true)
    setAddFeedback(null)
    const { data, error } = await supabase.functions.invoke('invite-friend', {
      body: {
        email,
        redirectTo: resetPasswordUrl,
      },
    })
    setAddLoading(false)
    if (error) {
      setAddFeedback({
        type: 'error',
        text: error.message || 'Failed to send invite.',
      })
      return
    }
    const status = (data as { status?: string } | null)?.status
    if (status === 'friended') {
      setAddFeedback({
        type: 'success',
        text: 'They already had an account. You are now friends.',
      })
      setAddEmail('')
      void loadFriends()
    } else if (status === 'invited') {
      setAddFeedback({
        type: 'success',
        text: 'Invite sent. They will be your friend after they sign up.',
      })
      setAddEmail('')
    } else {
      setAddFeedback({
        type: 'success',
        text: 'Done.',
      })
    }
  }

  const closeAddDrawer = () => {
    setAddOpen(false)
    setAddFeedback(null)
    setAddEmail('')
  }

  const headerTitle = useMemo(() => {
    if (view.kind === 'friend-list') return 'Friends'
    if (view.kind === 'friend-lists') return view.friend.displayName
    return view.list.title
  }, [view])

  const canInvite = meEmail === INVITE_ALLOWED_EMAIL

  const handleBack = () => {
    if (view.kind === 'friend-todos') {
      setView({ kind: 'friend-lists', friend: view.friend })
    } else if (view.kind === 'friend-lists') {
      setView({ kind: 'friend-list' })
    }
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
      <AppHeader
        title={headerTitle}
        onBack={view.kind === 'friend-list' ? undefined : handleBack}
      />

      {view.kind === 'friend-todos' && (
        <Box sx={{ height: 4, bgcolor: normalizeListColor(view.list.color) }} />
      )}

      <Container
        maxWidth="sm"
        sx={{
          pt: 2,
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          pb: 12,
        }}
      >
        {view.kind === 'friend-list' && (
          <FriendListPanel
            loading={loading}
            friends={friends}
            pageFeedback={pageFeedback}
            canInvite={canInvite}
            onOpenFriend={(f) => {
              setPageFeedback(null)
              setView({ kind: 'friend-lists', friend: f })
            }}
            onAdd={() => setAddOpen(true)}
          />
        )}

        {view.kind === 'friend-lists' && (
          <FriendListsPanel
            friend={view.friend}
            loading={friendListsLoading}
            lists={friendLists}
            stats={friendStats}
            isMe={me === view.friend.id}
            onOpenList={(list) =>
              setView({ kind: 'friend-todos', friend: view.friend, list })
            }
          />
        )}

        {view.kind === 'friend-todos' && (
          <FriendTodosPanel
            list={view.list}
            todos={friendTodos}
            loading={friendTodosLoading}
          />
        )}
      </Container>

      <Drawer
        anchor="bottom"
        open={addOpen}
        onClose={closeAddDrawer}
        slotProps={{
          paper: {
            sx: {
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              maxHeight: '92dvh',
            },
          },
        }}
      >
        <Box
          component="form"
          onSubmit={submitInvite}
          sx={{ display: 'flex', flexDirection: 'column' }}
        >
          <Box
            sx={{
              px: 2,
              pt: 2,
              pb: 1.5,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Add a friend
            </Typography>
          </Box>
          <Box sx={{ px: 2, py: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              We&apos;ll send them an invite by email. If they already have an
              account, you&apos;ll just become friends.
            </Typography>
            <TextField
              autoFocus
              fullWidth
              type="email"
              label="Email"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              required
              autoComplete="off"
            />
            {addFeedback && (
              <Alert severity={addFeedback.type} sx={{ mt: 2 }}>
                {addFeedback.text}
              </Alert>
            )}
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
            }}
          >
            <Button onClick={closeAddDrawer} disabled={addLoading}>
              Close
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={addLoading}
            >
              {addLoading ? 'Sending…' : 'Send invite'}
            </Button>
          </Stack>
        </Box>
      </Drawer>
    </Box>
  )
}

type FriendListPanelProps = {
  loading: boolean
  friends: Friend[]
  pageFeedback: Feedback | null
  canInvite: boolean
  onOpenFriend: (friend: Friend) => void
  onAdd: () => void
}

function FriendListPanel({
  loading,
  friends,
  pageFeedback,
  canInvite,
  onOpenFriend,
  onAdd,
}: FriendListPanelProps) {
  return (
    <Stack spacing={2}>
      {canInvite && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={<TbPlus size={16} />}
            onClick={onAdd}
          >
            Add friend
          </Button>
        </Box>
      )}
      {pageFeedback && (
        <Alert severity={pageFeedback.type}>{pageFeedback.text}</Alert>
      )}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : friends.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
          <Typography>No friends yet.</Typography>
          {canInvite && (
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              Tap &quot;Add friend&quot; to invite someone by email.
            </Typography>
          )}
        </Box>
      ) : (
        <Stack spacing={1}>
          {friends.map((friend) => (
            <Card key={friend.id} sx={{ borderRadius: 3 }}>
              <CardActionArea
                onClick={() => onOpenFriend(friend)}
                sx={{ p: 1.5 }}
              >
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{ alignItems: 'center' }}
                >
                  <Avatar
                    sx={{
                      bgcolor: 'primary.main',
                      color: 'white',
                      fontWeight: 800,
                    }}
                  >
                    {friend.initial}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 800 }} noWrap>
                      {friend.displayName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {friend.email}
                    </Typography>
                  </Box>
                </Stack>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  )
}

type FriendListsPanelProps = {
  friend: Friend
  loading: boolean
  lists: ListRow[]
  stats: Record<number, ListStats>
  isMe: boolean
  onOpenList: (list: ListRow) => void
}

function FriendListsPanel({
  friend,
  loading,
  lists,
  stats,
  isMe,
  onOpenList,
}: FriendListsPanelProps) {
  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar
          sx={{ bgcolor: 'primary.main', color: 'white', fontWeight: 800 }}
        >
          {friend.initial}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 900 }} noWrap>
            {friend.displayName}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {friend.email}
          </Typography>
        </Box>
      </Box>

      <Typography variant="overline" color="text.secondary">
        {isMe ? 'Your lists' : 'Their lists'}
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : lists.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
          <Typography>No lists to show.</Typography>
        </Box>
      ) : (
        <ListCardWrapper>
          {lists.map((list) => {
            const listColor = normalizeListColor(list.color)
            const s = stats[list.id] ?? { total: 0, completed: 0 }
            const progress =
              s.total === 0 ? 0 : Math.round((s.completed / s.total) * 100)
            return (
              <ListCardWrapperItem key={list.id}>
                <Box
                  onClick={() => onOpenList(list)}
                  sx={{ cursor: 'pointer' }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') onOpenList(list)
                  }}
                >
                  <Box sx={{ pointerEvents: 'none' }}>
                    <ListCard
                      listId={list.id}
                      title={list.title}
                      listColor={listColor}
                      progress={progress}
                      total={s.total}
                      completed={s.completed}
                      iconKey={list.icon}
                    />
                  </Box>
                </Box>
              </ListCardWrapperItem>
            )
          })}
        </ListCardWrapper>
      )}
    </Stack>
  )
}

type FriendTodosPanelProps = {
  list: ListRow
  todos: TodoRow[]
  loading: boolean
}

function FriendTodosPanel({ list, todos, loading }: FriendTodosPanelProps) {
  const total = todos.length
  const completed = todos.filter((t) => t.is_complete).length
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100)
  const listColor = normalizeListColor(list.color)
  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 900 }}>
          {list.title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {`${completed} of ${total} ${total === 1 ? 'task' : 'tasks'} done`}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            mt: 1,
            height: 8,
            borderRadius: 999,
            '& .MuiLinearProgress-bar': {
              borderRadius: 999,
              bgcolor: listColor,
            },
          }}
        />
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : todos.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No tasks yet.
        </Typography>
      ) : (
        <TodoItemsList todos={todos} readOnly showDelete={false} />
      )}
    </Stack>
  )
}
