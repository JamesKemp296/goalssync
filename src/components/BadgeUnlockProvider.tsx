import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Box, Paper, Snackbar, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import {
  evaluateBadges as runEvaluateBadges,
  seedKnownBadges,
  type BadgeAwardRow,
} from '../badgeEvaluation'
import {
  findBadgeDefinition,
  getBadgeDisplay,
  type BadgeAwardMetadata,
} from '../badges'
import { isLindseyUser } from '../lindseyUx'
import { supabase } from '../supabase'

type QueuedUnlock = BadgeAwardRow & {
  listTitleById: Record<number, string>
}

type BadgeUnlockContextType = {
  evaluateBadges: () => Promise<void>
}

const BadgeUnlockContext = createContext<BadgeUnlockContextType | null>(null)

export function useBadgeUnlock(): BadgeUnlockContextType {
  const ctx = useContext(BadgeUnlockContext)
  if (!ctx) {
    throw new Error('useBadgeUnlock must be used within BadgeUnlockProvider')
  }
  return ctx
}

type BadgeUnlockProviderProps = {
  children: ReactNode
}

export function BadgeUnlockProvider({ children }: BadgeUnlockProviderProps) {
  const theme = useTheme()
  const [userId, setUserId] = useState<string | null>(null)
  const [isLindsey, setIsLindsey] = useState(false)
  const [queue, setQueue] = useState<QueuedUnlock[]>([])
  const [open, setOpen] = useState(false)
  const seededRef = useRef(false)
  const seedPromiseRef = useRef<Promise<void> | null>(null)

  const ensureSeeded = useCallback(async (id: string) => {
    if (seededRef.current) {
      await seedPromiseRef.current
      return
    }
    seededRef.current = true
    const promise = seedKnownBadges(id)
    seedPromiseRef.current = promise
    await promise
  }, [])

  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    void (async () => {
      const { data } = await supabase.auth.getUser()
      if (cancelled) return
      const id = data.user?.id ?? null
      setUserId(id)
      const metadata = data.user?.user_metadata as
        | Record<string, unknown>
        | undefined
      const firstName =
        typeof metadata?.first_name === 'string' ? metadata.first_name : ''
      const email = data.user?.email ?? ''
      setIsLindsey(isLindseyUser(firstName, email))
      if (id) await ensureSeeded(id)
    })()
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user?.id ?? null
      setUserId(id)
      const metadata = session?.user?.user_metadata as
        | Record<string, unknown>
        | undefined
      const firstName =
        typeof metadata?.first_name === 'string' ? metadata.first_name : ''
      const email = session?.user?.email ?? ''
      setIsLindsey(isLindseyUser(firstName, email))
      if (id) {
        void ensureSeeded(id)
      } else {
        seededRef.current = false
        seedPromiseRef.current = null
      }
    })
    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [ensureSeeded])

  const enqueueUnlocks = useCallback(
    (rows: BadgeAwardRow[], listTitleById: Record<number, string>) => {
      if (rows.length === 0) return
      setQueue((prev) => [
        ...prev,
        ...rows.map((row) => ({ ...row, listTitleById })),
      ])
      setOpen(true)
    },
    [],
  )

  const evaluateBadges = useCallback(async () => {
    let id = userId
    if (!id && supabase) {
      const { data } = await supabase.auth.getUser()
      id = data.user?.id ?? null
      if (id) setUserId(id)
    }
    if (!id) return
    await ensureSeeded(id)
    const { newBadges, listTitleById } = await runEvaluateBadges(id)
    enqueueUnlocks(newBadges, listTitleById)
  }, [enqueueUnlocks, ensureSeeded, userId])

  const current = queue[0] ?? null

  const handleClose = (_event?: unknown, reason?: string) => {
    if (reason === 'clickaway') return
    setOpen(false)
  }

  const handleExited = () => {
    setQueue((prev) => {
      const next = prev.slice(1)
      if (next.length > 0) setOpen(true)
      return next
    })
  }

  const def = current ? findBadgeDefinition(current.badge_key) : undefined
  const display =
    def && current
      ? getBadgeDisplay(def, {
          earned: true,
          isLindseyUser: isLindsey,
          badgeKey: current.badge_key,
          metadata: (current.metadata ?? null) as BadgeAwardMetadata | null,
          listTitleById: current.listTitleById,
          awardedAt: current.awarded_at,
        })
      : null
  const Icon = def?.Icon

  return (
    <BadgeUnlockContext.Provider value={{ evaluateBadges }}>
      {children}
      <Snackbar
        open={open && Boolean(current && def && display)}
        autoHideDuration={4000}
        onClose={handleClose}
        slotProps={{
          transition: {
            onExited: handleExited,
          },
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{
          bottom: 'calc(64px + env(safe-area-inset-bottom) + 16px) !important',
          left: { xs: 16, sm: 'auto' },
          right: { xs: 16, sm: 'auto' },
        }}
      >
        <Paper
          elevation={3}
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1.5,
            px: 2,
            py: 1.5,
            width: { xs: '100%', sm: 360 },
            maxWidth: '100%',
            border: '1px solid',
            borderColor: alpha(theme.palette.primary.main, 0.35),
            bgcolor: alpha(theme.palette.primary.main, 0.08),
          }}
        >
          {Icon ? (
            <Box
              sx={{
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                pt: 0.25,
                flexShrink: 0,
              }}
            >
              <Icon size={28} strokeWidth={1.75} />
            </Box>
          ) : null}
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              Badge unlocked: {display?.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {display?.body}
            </Typography>
          </Box>
        </Paper>
      </Snackbar>
    </BadgeUnlockContext.Provider>
  )
}
