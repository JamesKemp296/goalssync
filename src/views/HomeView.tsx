import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  LinearProgress,
  Paper,
  Container,
  Stack,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { TbPlus } from 'react-icons/tb'
import { getListIconComponent } from '../listIcons'
import ListCard from '../components/ListCard'
import ListCardWrapper, {
  ListCardWrapperItem,
} from '../components/ListCardWrapper'
import { normalizeListColor } from '../listColors'
import { supabase } from '../supabase'
import type { Database } from '../database.types'

type ListRow = Database['public']['Tables']['lists']['Row']
type TodoStatRow = Pick<
  Database['public']['Tables']['todos']['Row'],
  'list_id' | 'is_complete'
>
type ListStats = { total: number; completed: number }

type HeroCopy = {
  title: string
  subtitle: string
  iconKey: string
}

const HERO_STATES: HeroCopy[] = [
  {
    title: "Let's get started",
    subtitle: 'A quick first win gets momentum going.',
    iconKey: 'list',
  },
  {
    title: "Good work, let's keep going",
    subtitle: "You're building progress, keep the streak alive.",
    iconKey: 'fitness',
  },
  {
    title: 'You are over half way',
    subtitle: 'Great pace. The finish line is getting closer.',
    iconKey: 'work',
  },
  {
    title: 'You are so close',
    subtitle: 'Only a few tasks left. Finish strong.',
    iconKey: 'events',
  },
  {
    title: 'Hurrah!',
    subtitle: 'Everything in this list is done. Nice work.',
    iconKey: 'personal',
  },
]

const getHeroState = (progress: number): HeroCopy => {
  if (progress <= 20) return HERO_STATES[0]
  if (progress <= 50) return HERO_STATES[1]
  if (progress <= 80) return HERO_STATES[2]
  if (progress < 100) return HERO_STATES[3]
  return HERO_STATES[4]
}

export default function HomeView() {
  const [displayLists, setDisplayLists] = useState<ListRow[]>([])
  const [hasPinnedLists, setHasPinnedLists] = useState(false)
  const [statsByListId, setStatsByListId] = useState<Record<number, ListStats>>(
    {},
  )
  const [loading, setLoading] = useState(true)
  const [firstName, setFirstName] = useState('there')
  const [email, setEmail] = useState('')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (!supabase) return
      setLoading(true)
      const { data: authData } = await supabase.auth.getUser()
      const metadata = authData.user?.user_metadata as
        | Record<string, unknown>
        | undefined
      const metaFirstName = metadata?.first_name
      const resolvedFirstName =
        typeof metaFirstName === 'string' && metaFirstName.trim().length > 0
          ? metaFirstName.trim()
          : ''
      if (!cancelled) setFirstName(resolvedFirstName)
      if (!cancelled) setEmail(authData.user?.email ?? '')

      const myUserId = authData.user?.id
      if (!myUserId) {
        if (!cancelled) setLoading(false)
        return
      }

      const { data: listsData } = await supabase
        .from('lists')
        .select('*')
        .eq('user_id', myUserId)
        .order('created_at', { ascending: false })
        .limit(100)
      if (cancelled) return
      const allLists = (listsData as ListRow[] | null) ?? []
      const pinnedLists = [...allLists]
        .filter((row) => Boolean(row.pinned_at))
        .sort(
          (a, b) =>
            +new Date(b.pinned_at ?? b.created_at) -
            +new Date(a.pinned_at ?? a.created_at),
        )
      const usingPinned = pinnedLists.length > 0
      const selectedLists = usingPinned
        ? pinnedLists.slice(0, 4)
        : allLists.slice(0, 4)
      setHasPinnedLists(usingPinned)
      setDisplayLists(selectedLists)

      if (selectedLists.length > 0) {
        const listIds = selectedLists.map((row) => row.id)
        const { data: todoData } = await supabase
          .from('todos')
          .select('list_id,is_complete')
          .in('list_id', listIds)
        if (cancelled) return

        const stats: Record<number, ListStats> = {}
        for (const todo of (todoData as TodoStatRow[] | null) ?? []) {
          const current = stats[todo.list_id] ?? { total: 0, completed: 0 }
          current.total += 1
          if (todo.is_complete) current.completed += 1
          stats[todo.list_id] = current
        }
        setStatsByListId(stats)
      } else {
        setStatsByListId({})
      }

      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const latestList = displayLists[0] ?? null
  const latestStats = latestList
    ? (statsByListId[latestList.id] ?? { total: 0, completed: 0 })
    : { total: 0, completed: 0 }
  const latestProgress =
    latestStats.total === 0
      ? 0
      : Math.round((latestStats.completed / latestStats.total) * 100)
  const latestUndone = Math.max(0, latestStats.total - latestStats.completed)
  const heroState = getHeroState(latestProgress)
  const HeroIcon = getListIconComponent(heroState.iconKey)

  const todayLabel = new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())
  const greeting = useMemo(() => {
    if (!firstName.trim()) return 'Hey, welcome!'
    return `Hey, ${firstName.charAt(0).toUpperCase()}${firstName.slice(1)}!`
  }, [firstName])
  const nameInitial = (
    firstName.trim()[0] ??
    email.trim()[0] ??
    '?'
  ).toUpperCase()
  const isNutmegUser = useMemo(() => {
    const normalizedFirstName = firstName.toLowerCase()
    const normalizedEmail = email.toLowerCase()
    return (
      normalizedFirstName.includes('lindsey') ||
      normalizedEmail.includes('lindsey')
    )
  }, [firstName, email])
  const catSvgSrc = isNutmegUser ? '/nutmeg.svg' : '/ace.svg'
  const showCatInHeroIcon = latestProgress === 100

  useEffect(() => {
    const faviconLink =
      document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!faviconLink) return
    faviconLink.href = catSvgSrc
  }, [catSvgSrc])

  return (
    <Container maxWidth="sm" sx={{ pt: 3, pb: 2 }}>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : !latestList ? (
        <Box sx={{ py: 3, textAlign: 'center' }}>
          <Typography variant="h4" sx={{ mb: 1, fontWeight: 800 }}>
            {greeting}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Let&apos;s make this day productive.
          </Typography>
          <Paper sx={{ p: 3 }}>
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
              startIcon={<TbPlus size={18} />}
            >
              New list
            </Button>
          </Paper>
        </Box>
      ) : (
        <Stack spacing={2.5}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5,
            }}
          >
            <Box>
              <Typography
                variant="h4"
                sx={{ fontWeight: 900, lineHeight: 1.15 }}
              >
                {greeting}
              </Typography>
              <Typography color="text.secondary">
                {`You have ${latestUndone} ${
                  latestUndone === 1 ? 'task' : 'tasks'
                } left in ${latestList.title}`}
              </Typography>
            </Box>
            <Avatar
              sx={{
                width: 50,
                height: 50,
                bgcolor: 'primary.main',
                fontWeight: 900,
                fontSize: 28,
              }}
            >
              {nameInitial}
            </Avatar>
          </Box>

          <Paper
            component={RouterLink}
            to={`/lists/${latestList.id}`}
            sx={(theme) => ({
              display: 'block',
              p: 2,
              borderRadius: 3,
              textDecoration: 'none',
              color: 'inherit',
              bgcolor:
                theme.palette.mode === 'dark'
                  ? alpha(normalizeListColor(latestList.color), 0.2)
                  : alpha(normalizeListColor(latestList.color), 0.18),
            })}
          >
            <Stack spacing={2}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 1.5,
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 900, lineHeight: 1.2 }}
                  >
                    {heroState.title}
                  </Typography>
                  <Typography color="text.secondary">
                    {heroState.subtitle}
                  </Typography>
                </Box>
                <Box
                  sx={(theme) => ({
                    width: 58,
                    height: 58,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    position: 'relative',
                    flexShrink: 0,
                    bgcolor:
                      theme.palette.mode === 'dark'
                        ? alpha(normalizeListColor(latestList.color), 0.45)
                        : alpha(normalizeListColor(latestList.color), 0.5),
                  })}
                >
                  {showCatInHeroIcon ? (
                    <Avatar
                      alt={isNutmegUser ? 'Nutmeg cat icon' : 'Ace cat icon'}
                      src={catSvgSrc}
                      sx={{
                        width: 78,
                        height: 78,
                        bgcolor: 'transparent',
                        position: 'absolute',
                        top: '42%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                      }}
                    />
                  ) : (
                    <HeroIcon size={36} />
                  )}
                </Box>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {`${latestStats.completed} out of ${latestStats.total} tasks are completed`}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={latestProgress}
                sx={{
                  height: 10,
                  borderRadius: 999,
                  bgcolor: alpha(normalizeListColor(latestList.color), 0.3),
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 999,
                    bgcolor: normalizeListColor(latestList.color),
                  },
                }}
              />
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'flex-start',
                  alignItems: 'center',
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {todayLabel}
                </Typography>
              </Box>
            </Stack>
          </Paper>

          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900, mb: 1.25 }}>
              {hasPinnedLists ? 'Pinned' : 'Lists Progress'}
            </Typography>
            <ListCardWrapper>
              {displayLists.map((entry) => {
                const stats = statsByListId[entry.id] ?? {
                  total: 0,
                  completed: 0,
                }
                const progress =
                  stats.total === 0
                    ? 0
                    : Math.round((stats.completed / stats.total) * 100)
                const listColor = normalizeListColor(entry.color)
                return (
                  <ListCardWrapperItem key={entry.id}>
                    <ListCard
                      listId={entry.id}
                      title={entry.title}
                      listColor={listColor}
                      progress={progress}
                      total={stats.total}
                      completed={stats.completed}
                      iconKey={entry.icon}
                    />
                  </ListCardWrapperItem>
                )
              })}
            </ListCardWrapper>
          </Box>
        </Stack>
      )}
    </Container>
  )
}
