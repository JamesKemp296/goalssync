import type { ListTimeFrame } from './database.types'

export type { ListTimeFrame } from './database.types'

export const TIME_FRAMES: ListTimeFrame[] = ['none', 'daily', 'weekly', 'monthly']

export const TIME_FRAME_LABELS: Record<ListTimeFrame, string> = {
  none: 'No reset',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
}

export const TIME_FRAME_SHORT: Record<ListTimeFrame, string> = {
  none: 'No reset',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
}

export function normalizeTimeFrame(value: string | null | undefined): ListTimeFrame {
  if (value === 'daily' || value === 'weekly' || value === 'monthly') return value
  return 'none'
}

/**
 * Compute the next reset moment for a list, anchored at midnight in the user's
 * local timezone. Mirrors `public.compute_next_reset_at(list_id)` in SQL so the
 * client can write a coherent `next_reset_at` immediately on save without an
 * RPC round-trip. The cron job re-anchors on each actual reset.
 */
export function computeNextResetAt(
  timeFrame: ListTimeFrame,
  now: Date = new Date(),
): Date | null {
  if (timeFrame === 'none') return null
  const local = new Date(now.getTime())
  if (timeFrame === 'daily') {
    local.setHours(0, 0, 0, 0)
    local.setDate(local.getDate() + 1)
    return local
  }
  if (timeFrame === 'weekly') {
    local.setHours(0, 0, 0, 0)
    // ISO week: Monday = 1 ... Sunday = 7. getDay(): Sunday = 0 ... Saturday = 6.
    const jsDow = local.getDay()
    const isoDow = jsDow === 0 ? 7 : jsDow
    const daysUntilMonday = isoDow === 1 ? 7 : 8 - isoDow
    local.setDate(local.getDate() + daysUntilMonday)
    return local
  }
  if (timeFrame === 'monthly') {
    local.setHours(0, 0, 0, 0)
    local.setDate(1)
    local.setMonth(local.getMonth() + 1)
    return local
  }
  return null
}

export function formatResetCountdown(
  nextResetAt: string | null,
  now: Date = new Date(),
): string {
  if (!nextResetAt) return ''
  const target = new Date(nextResetAt)
  const ms = target.getTime() - now.getTime()
  if (ms <= 0) return 'Resetting…'
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 60) return `Resets in ${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `Resets in ${hours}h`
  const days = Math.floor(hours / 24)
  return `Resets in ${days}d`
}
