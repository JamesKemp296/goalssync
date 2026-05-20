import { useMemo, useState } from 'react'
import {
  Box,
  ButtonBase,
  Drawer,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import {
  BADGE_CATALOG,
  findBadgeDefinition,
  getBadgeDisplay,
  type BadgeAwardMetadata,
  type BadgeDefinition,
} from '../badges'
import type { Database } from '../database.types'
import {
  getLindseyFirstListBadgeIcon,
  isLindseyFirstListBadge,
} from '../lindseyUx'

type BadgeRow = Pick<
  Database['public']['Tables']['badges_awarded']['Row'],
  'badge_key' | 'awarded_at' | 'metadata'
>

type BadgesRailProps = {
  awarded: BadgeRow[]
  listTitleById?: Record<number, string>
  isLindseyUser?: boolean
  loading?: boolean
}

type RailEntry = {
  definition: BadgeDefinition
  earned: boolean
  earnedCount: number
  mostRecentAt: string | null
  latestBadgeKey: string | null
  latestMetadata: BadgeAwardMetadata | null
}

export default function BadgesRail({
  awarded,
  listTitleById = {},
  isLindseyUser = false,
  loading = false,
}: BadgesRailProps) {
  const [openBadge, setOpenBadge] = useState<RailEntry | null>(null)

  const entries = useMemo<RailEntry[]>(() => {
    const earnedByDef = new Map<
      string,
      {
        count: number
        latest: string | null
        latestKey: string | null
        latestMeta: BadgeAwardMetadata | null
      }
    >()
    for (const row of awarded) {
      const def = findBadgeDefinition(row.badge_key)
      if (!def) continue
      const meta = (row.metadata ?? {}) as BadgeAwardMetadata
      const existing = earnedByDef.get(def.keyPrefix) ?? {
        count: 0,
        latest: null,
        latestKey: null,
        latestMeta: null,
      }
      existing.count += 1
      if (!existing.latest || row.awarded_at > existing.latest) {
        existing.latest = row.awarded_at
        existing.latestKey = row.badge_key
        existing.latestMeta = meta
      }
      earnedByDef.set(def.keyPrefix, existing)
    }
    return BADGE_CATALOG.map((def) => {
      const e = earnedByDef.get(def.keyPrefix)
      return {
        definition: def,
        earned: !!e,
        earnedCount: e?.count ?? 0,
        mostRecentAt: e?.latest ?? null,
        latestBadgeKey: e?.latestKey ?? null,
        latestMetadata: e?.latestMeta ?? null,
      }
    })
  }, [awarded])

  const earnedCount = entries.filter((e) => e.earned).length

  const drawerDisplay = openBadge
    ? getBadgeDisplay(openBadge.definition, {
        earned: openBadge.earned,
        isLindseyUser,
        badgeKey: openBadge.latestBadgeKey ?? undefined,
        metadata: openBadge.latestMetadata,
        listTitleById,
        awardedAt: openBadge.mostRecentAt,
        earnedCount: openBadge.earnedCount,
      })
    : null

  const drawerLindseyBadge = openBadge
    ? isLindseyFirstListBadge(
        isLindseyUser,
        openBadge.definition.keyPrefix,
        openBadge.earned,
      )
    : false
  const DrawerIcon = openBadge
    ? getLindseyFirstListBadgeIcon(
        isLindseyUser,
        openBadge.definition.keyPrefix,
        openBadge.earned,
        openBadge.definition.Icon,
      )
    : null

  return (
    <Paper sx={{ borderRadius: 3, p: 2 }}>
      <Stack spacing={1.25}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            Badges
          </Typography>
          {loading ? (
            <Skeleton variant="text" width={48} />
          ) : (
            <Typography variant="caption" color="text.secondary">
              {`${earnedCount} / ${entries.length} earned`}
            </Typography>
          )}
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 1.25,
          }}
        >
          {loading
            ? Array.from({ length: 16 }).map((_, idx) => (
                <Skeleton
                  key={`badge-skel-${idx}`}
                  variant="rounded"
                  height={104}
                  sx={{ borderRadius: 2 }}
                />
              ))
            : entries.map((entry) => {
                const { definition, earned } = entry
                const display = getBadgeDisplay(definition, {
                  earned,
                  isLindseyUser,
                })
                const lindseyBadge = isLindseyFirstListBadge(
                  isLindseyUser,
                  definition.keyPrefix,
                  earned,
                )
                const Icon = getLindseyFirstListBadgeIcon(
                  isLindseyUser,
                  definition.keyPrefix,
                  earned,
                  definition.Icon,
                )
                return (
                  <ButtonBase
                    key={definition.keyPrefix}
                    onClick={() => setOpenBadge(entry)}
                    sx={{
                      width: '100%',
                      height: 104,
                      borderRadius: 2,
                      p: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      gap: 0.5,
                      bgcolor: (theme) =>
                        earned
                          ? alpha(theme.palette.primary.main, 0.16)
                          : theme.palette.action.hover,
                      color: earned ? 'primary.main' : 'text.secondary',
                      border: (theme) =>
                        earned
                          ? `1px solid ${alpha(theme.palette.primary.main, 0.4)}`
                          : `1px dashed ${theme.palette.divider}`,
                      opacity: earned ? 1 : 0.55,
                    }}
                  >
                    <Box
                      sx={{
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        bgcolor: (theme) =>
                          earned && lindseyBadge
                            ? alpha(theme.palette.error.light, 0.22)
                            : earned
                              ? alpha(theme.palette.primary.main, 0.22)
                              : 'transparent',
                        color: (theme) =>
                          earned && lindseyBadge
                            ? theme.palette.error.main
                            : 'inherit',
                        display: 'grid',
                        placeItems: 'center',
                        mt: 0.5,
                      }}
                    >
                      <Icon size={22} />
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 800,
                        fontSize: '0.62rem',
                        textAlign: 'center',
                        lineHeight: 1.15,
                        color: 'text.primary',
                      }}
                    >
                      {display.title}
                    </Typography>
                  </ButtonBase>
                )
              })}
        </Box>
      </Stack>

      <Drawer
        anchor="bottom"
        open={!!openBadge}
        onClose={() => setOpenBadge(null)}
        slotProps={{
          paper: {
            sx: {
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              p: 3,
              pb: 4,
            },
          },
        }}
      >
        {openBadge && drawerDisplay && DrawerIcon ? (
          <Stack
            spacing={1.5}
            sx={{ alignItems: 'center', textAlign: 'center' }}
          >
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                bgcolor: (theme) =>
                  openBadge.earned
                    ? alpha(theme.palette.primary.main, 0.22)
                    : theme.palette.action.hover,
                color: (theme) =>
                  openBadge.earned && drawerLindseyBadge
                    ? theme.palette.error.main
                    : openBadge.earned
                      ? theme.palette.primary.main
                      : theme.palette.text.secondary,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <DrawerIcon size={36} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>
              {drawerDisplay.title}
            </Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 360 }}>
              {drawerDisplay.body}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {!openBadge.earned
                ? 'Not yet unlocked'
                : [
                    openBadge.definition.kind === 'repeating'
                      ? `Earned ${openBadge.earnedCount} ${
                          openBadge.earnedCount === 1 ? 'time' : 'times'
                        }`
                      : null,
                    drawerDisplay.footnote,
                  ]
                    .filter(Boolean)
                    .join(' · ') || null}
            </Typography>
          </Stack>
        ) : null}
      </Drawer>
    </Paper>
  )
}
