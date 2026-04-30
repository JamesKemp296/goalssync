import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Avatar,
  Box,
  Button,
  Paper,
  Container,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material'
import { TbHeartFilled, TbPlus } from 'react-icons/tb'
import { getListIconComponent } from '../listIcons'
import ListCard from '../components/ListCard'
import ListCardWrapper, {
  ListCardWrapperItem,
} from '../components/ListCardWrapper'
import { HeroCard } from '../components/HeroCard'
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
    title: 'Start strong',
    subtitle: 'Pick one task and get momentum.',
    iconKey: 'list',
  },
  {
    title: 'Nice progress',
    subtitle: 'You are moving through this list.',
    iconKey: 'fitness',
  },
  {
    title: 'More than halfway',
    subtitle: 'You are on pace. Keep going.',
    iconKey: 'work',
  },
  {
    title: 'Almost there',
    subtitle: 'Only a few tasks left.',
    iconKey: 'events',
  },
  {
    title: 'All done!',
    subtitle: 'Everything in this list is complete.',
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
  const isLindsey = firstName.trim().toLowerCase() === 'lindsey'
  const showLindseyHero = useMemo(
    () => isLindsey && Math.random() < 0.3,
    [isLindsey, latestList?.id],
  )
  const catSvgSrc = isNutmegUser ? '/nutmeg.svg' : '/ace.svg'
  const showCatInHeroIcon = latestProgress === 100
  const heroTitle = showLindseyHero ? 'Hey gorgeous' : heroState.title
  const heroSubtitle = showLindseyHero
    ? 'I love you so much'
    : heroState.subtitle
  const heroIcon = showLindseyHero ? (
    <TbHeartFilled size={48} color="#d32f2f" />
  ) : showCatInHeroIcon ? (
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
  )

  useEffect(() => {
    const faviconLink =
      document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!faviconLink) return
    faviconLink.href = catSvgSrc
  }, [catSvgSrc])

  return (
    <Container maxWidth="sm" sx={{ pt: 3, pb: 2 }}>
      {loading ? (
        <Stack spacing={2.5}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5,
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="52%" height={36} />
              <Skeleton variant="text" width="78%" height={22} />
            </Box>
            <Skeleton variant="circular" width={50} height={50} />
          </Box>
          <HeroCard
            loading
            to=""
            title=""
            subtitle=""
            icon={null}
            listColor="transparent"
            progress={0}
            completed={0}
            total={0}
            dateLabel=""
          />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900, mb: 1.25 }}>
              Lists Progress
            </Typography>
            <ListCardWrapper>
              {Array.from({ length: 1 }).map((_, idx) => (
                <ListCardWrapperItem key={`home-list-skeleton-${idx}`}>
                  <ListCard
                    loading
                    listId={0}
                    title=""
                    listColor="transparent"
                    progress={0}
                    total={0}
                    completed={0}
                  />
                </ListCardWrapperItem>
              ))}
            </ListCardWrapper>
          </Box>
        </Stack>
      ) : !latestList ? (
        <Box sx={{ py: 3, textAlign: 'center' }}>
          <Typography variant="h4" sx={{ mb: 1, fontWeight: 800 }}>
            {greeting}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Welcome to Goals Sync!
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

          <HeroCard
            to={`/lists/${latestList.id}`}
            title={heroTitle}
            subtitle={heroSubtitle}
            icon={heroIcon}
            listColor={normalizeListColor(latestList.color)}
            progress={latestProgress}
            completed={latestStats.completed}
            total={latestStats.total}
            dateLabel={todayLabel}
          />

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
