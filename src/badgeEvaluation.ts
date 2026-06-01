import { supabase } from './supabase'
import type { BadgeAwardMetadata } from './badges'

const STORAGE_PREFIX = 'todoapp.toastedBadgeKeys'

export type BadgeAwardRow = {
  badge_key: string
  awarded_at: string
  metadata: BadgeAwardMetadata | null
}

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}.${userId}`
}

function readKnownKeys(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((k): k is string => typeof k === 'string'))
  } catch {
    return new Set()
  }
}

function writeKnownKeys(userId: string, keys: Set<string>): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify([...keys]))
  } catch {
    // ignore quota / private mode errors
  }
}

async function fetchBadgeRows(userId: string): Promise<BadgeAwardRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('badges_awarded')
    .select('badge_key, awarded_at, metadata')
    .eq('user_id', userId)
  if (error) {
    console.error('fetch badges_awarded failed', error)
    return []
  }
  return ((data as BadgeAwardRow[] | null) ?? []).map((row) => ({
    badge_key: row.badge_key,
    awarded_at: row.awarded_at,
    metadata: (row.metadata ?? null) as BadgeAwardMetadata | null,
  }))
}

async function fetchListTitleById(
  listIds: number[],
): Promise<Record<number, string>> {
  if (!supabase || listIds.length === 0) return {}
  const { data, error } = await supabase
    .from('lists')
    .select('id, title')
    .in('id', listIds)
  if (error) {
    console.error('fetch list titles for badges failed', error)
    return {}
  }
  const map: Record<number, string> = {}
  for (const row of (data as { id: number; title: string }[] | null) ?? []) {
    map[row.id] = row.title
  }
  return map
}

/** Record current badges without treating them as new unlocks (first visit). */
export async function seedKnownBadges(userId: string): Promise<void> {
  const known = readKnownKeys(userId)
  if (known.size > 0) return
  const rows = await fetchBadgeRows(userId)
  writeKnownKeys(userId, new Set(rows.map((r) => r.badge_key)))
}

export type EvaluateBadgesResult = {
  newBadges: BadgeAwardRow[]
  listTitleById: Record<number, string>
}

/** Run badge evaluation RPC and return rows not yet toasted for this user. */
export async function evaluateBadges(
  userId: string,
): Promise<EvaluateBadgesResult> {
  if (!supabase) return { newBadges: [], listTitleById: {} }

  const { error } = await supabase.rpc('evaluate_user_badges')
  if (error) {
    console.error('evaluate_user_badges failed', error)
    return { newBadges: [], listTitleById: {} }
  }

  const rows = await fetchBadgeRows(userId)
  const known = readKnownKeys(userId)
  const newBadges = rows.filter((row) => !known.has(row.badge_key))

  if (newBadges.length > 0) {
    for (const row of newBadges) known.add(row.badge_key)
    writeKnownKeys(userId, known)
  }

  const listIds = [
    ...new Set(
      newBadges
        .map((row) => row.metadata?.list_id)
        .filter((id): id is number => typeof id === 'number'),
    ),
  ]
  const listTitleById = await fetchListTitleById(listIds)

  return { newBadges, listTitleById }
}
