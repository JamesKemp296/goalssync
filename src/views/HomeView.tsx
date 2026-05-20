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
import { TbPlus } from 'react-icons/tb'
import { supabase } from '../supabase'
import type { Database } from '../database.types'
import { normalizeTimeFrame } from '../timeFrames'
import PeriodOverviewCard, {
  type PeriodOverviewItem,
} from '../components/PeriodOverviewCard'
import BadgesRail from '../components/BadgesRail'
import HeatmapCard from '../components/HeatmapCard'
import BestWorstInsights from '../components/BestWorstInsights'
import RollupStats from '../components/RollupStats'
import { isLindseyUser, rollShowLindseyUX } from '../lindseyUx'

type ListRow = Database['public']['Tables']['lists']['Row']
type TodoRow = Pick<
  Database['public']['Tables']['todos']['Row'],
  'list_id' | 'is_complete' | 'task' | 'id'
>
type ListPeriodHistoryRow =
  Database['public']['Tables']['list_period_history']['Row']
type TodoPeriodHistoryRow =
  Database['public']['Tables']['todo_period_history']['Row']
type BadgeRow = Pick<
  Database['public']['Tables']['badges_awarded']['Row'],
  'badge_key' | 'awarded_at' | 'metadata'
>

function toLocalDateKey(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function HomeView() {
  const [loading, setLoading] = useState(true)
  const [firstName, setFirstName] = useState('there')
  const [email, setEmail] = useState('')

  const [lists, setLists] = useState<ListRow[]>([])
  const [todos, setTodos] = useState<TodoRow[]>([])
  const [history, setHistory] = useState<ListPeriodHistoryRow[]>([])
  const [itemHistory, setItemHistory] = useState<TodoPeriodHistoryRow[]>([])
  const [badges, setBadges] = useState<BadgeRow[]>([])
  const [showLindseyUX, setShowLindseyUX] = useState(false)

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

      // Catch-up badge evaluation in case a previous client-side RPC failed
      // (e.g. user toggled before the migration deployed). Errors logged only.
      const { error: badgeError } = await supabase.rpc('evaluate_user_badges')
      if (badgeError) console.error('evaluate_user_badges failed', badgeError)
      if (cancelled) return

      const [listsRes, historyRes, badgesRes] = await Promise.all([
        supabase
          .from('lists')
          .select('*')
          .eq('user_id', myUserId)
          .order('created_at', { ascending: false }),
        supabase
          .from('list_period_history')
          .select('*')
          .eq('user_id', myUserId)
          .order('period_end', { ascending: false })
          .limit(500),
        supabase
          .from('badges_awarded')
          .select('badge_key, awarded_at, metadata')
          .eq('user_id', myUserId),
      ])
      if (cancelled) return

      const allLists = (listsRes.data as ListRow[] | null) ?? []
      const historyRows =
        (historyRes.data as ListPeriodHistoryRow[] | null) ?? []
      const badgeRows = (badgesRes.data as BadgeRow[] | null) ?? []

      const listIds = allLists.map((l) => l.id)
      const [todosRes, itemHistRes] = await Promise.all([
        listIds.length > 0
          ? supabase
              .from('todos')
              .select('list_id, is_complete, task, id')
              .in('list_id', listIds)
          : Promise.resolve({ data: [] as TodoRow[] }),
        historyRows.length > 0
          ? supabase
              .from('todo_period_history')
              .select('*')
              .in(
                'list_period_history_id',
                historyRows.slice(0, 200).map((h) => h.id),
              )
          : Promise.resolve({ data: [] as TodoPeriodHistoryRow[] }),
      ])
      if (cancelled) return

      setLists(allLists)
      setTodos((todosRes.data as TodoRow[] | null) ?? [])
      setHistory(historyRows)
      setItemHistory(
        (itemHistRes.data as TodoPeriodHistoryRow[] | null) ?? [],
      )
      setBadges(badgeRows)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const periodOverviewItems = useMemo<PeriodOverviewItem[]>(() => {
    const todosByList = new Map<number, TodoRow[]>()
    for (const t of todos) {
      const arr = todosByList.get(t.list_id) ?? []
      arr.push(t)
      todosByList.set(t.list_id, arr)
    }
    return lists
      .filter((l) => normalizeTimeFrame(l.time_frame) !== 'none')
      .map((list) => {
        const ts = todosByList.get(list.id) ?? []
        const completed = ts.filter((t) => t.is_complete).length
        return { list, total: ts.length, completed }
      })
  }, [lists, todos])

  const completionsByDay = useMemo<Record<string, number>>(() => {
    const acc: Record<string, number> = {}
    // Closed periods from history
    for (const h of history) {
      if (h.time_frame !== 'daily') continue
      const key = toLocalDateKey(h.period_start)
      acc[key] = (acc[key] ?? 0) + h.completed_count
    }
    // Live (current open period) completions from daily lists — these won't
    // appear in history until the nightly reset runs.
    const dailyListIds = new Set(
      lists
        .filter((l) => normalizeTimeFrame(l.time_frame) === 'daily')
        .map((l) => l.id),
    )
    const todayKey = toLocalDateKey(new Date().toISOString())
    for (const t of todos) {
      if (t.is_complete && dailyListIds.has(t.list_id)) {
        acc[todayKey] = (acc[todayKey] ?? 0) + 1
      }
    }
    return acc
  }, [history, lists, todos])

  const liveCompletedCount = useMemo(
    () => todos.filter((t) => t.is_complete).length,
    [todos],
  )

  const listTitleById = useMemo(
    () =>
      Object.fromEntries(
        lists.map((l) => [l.id, l.title?.trim() || `List #${l.id}`]),
      ),
    [lists],
  )

  const heroSubtitle = useMemo(() => {
    if (periodOverviewItems.length === 0) {
      return 'Set a list cadence to start earning badges.'
    }
    const totalTodos = periodOverviewItems.reduce(
      (acc, it) => acc + it.total,
      0,
    )
    const totalDone = periodOverviewItems.reduce(
      (acc, it) => acc + it.completed,
      0,
    )
    if (totalTodos === 0) {
      return 'No tasks queued in your timed lists yet.'
    }
    const pct = Math.round((totalDone / totalTodos) * 100)
    return `You're ${pct}% through your timed lists.`
  }, [periodOverviewItems])

  const lindseyUser = useMemo(
    () => isLindseyUser(firstName, email),
    [firstName, email],
  )

  useEffect(() => {
    setShowLindseyUX(rollShowLindseyUX(firstName, email))
  }, [lindseyUser, firstName, email])

  const greeting = useMemo(() => {
    if (showLindseyUX) return 'Hey, gorgeous'
    if (!firstName.trim()) return 'Hey, welcome!'
    return `Hey, ${firstName.charAt(0).toUpperCase()}${firstName.slice(1)}!`
  }, [firstName, showLindseyUX])
  const nameInitial = (
    firstName.trim()[0] ??
    email.trim()[0] ??
    '?'
  ).toUpperCase()
  const catSvgSrc = showLindseyUX ? '/nutmeg.svg' : '/ace.svg'

  useEffect(() => {
    const faviconLink =
      document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!faviconLink) return
    faviconLink.href = catSvgSrc
  }, [catSvgSrc])

  const hasAnyList = lists.length > 0
  const hasTimedList = periodOverviewItems.length > 0

  return (
    <Container maxWidth="sm" sx={{ pt: 3, pb: 10 }}>
      <Stack spacing={2.5}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            {loading ? (
              <>
                <Skeleton variant="text" width="60%" height={36} />
                <Skeleton variant="text" width="80%" height={22} />
              </>
            ) : (
              <>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 900, lineHeight: 1.15 }}
                >
                  {greeting}
                </Typography>
                <Typography color="text.secondary">{heroSubtitle}</Typography>
              </>
            )}
          </Box>
          {loading ? (
            <Skeleton variant="circular" width={50} height={50} />
          ) : (
            <Avatar
              src={showLindseyUX ? '/nutmeg.svg' : undefined}
              alt={showLindseyUX ? 'Nutmeg' : undefined}
              sx={{
                width: 50,
                height: 50,
                bgcolor: showLindseyUX ? 'transparent' : 'primary.main',
                fontWeight: 900,
                fontSize: 28,
                '& img': { objectFit: 'contain', p: 0.25 },
              }}
            >
              {showLindseyUX ? null : nameInitial}
            </Avatar>
          )}
        </Box>

        {!loading && !hasAnyList ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              No lists yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Create your first list and pick a cadence to start tracking
              streaks, badges, and progress.
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
        ) : (
          <>
            <PeriodOverviewCard
              items={periodOverviewItems}
              loading={loading}
            />

            <HeatmapCard
              completionsByDay={completionsByDay}
              loading={loading}
            />

            <BadgesRail
              awarded={badges}
              listTitleById={listTitleById}
              isLindseyUser={lindseyUser}
              loading={loading}
            />

            <BestWorstInsights
              lists={lists}
              history={history}
              itemHistory={itemHistory}
              loading={loading}
            />

            <RollupStats
              history={history}
              liveCompletedCount={liveCompletedCount}
              loading={loading}
            />

            {!loading && hasAnyList && !hasTimedList ? (
              <Paper sx={{ p: 2.5, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  None of your lists have a cadence yet. Add daily, weekly, or
                  monthly cadence to a list to start earning badges and
                  streaks.
                </Typography>
                <Button
                  component={RouterLink}
                  to="/lists"
                  variant="outlined"
                  size="small"
                >
                  Manage lists
                </Button>
              </Paper>
            ) : null}
          </>
        )}
      </Stack>
    </Container>
  )
}
