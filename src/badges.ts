import type { IconType } from 'react-icons'
import {
  TbAward,
  TbBallAmericanFootball,
  TbBallBaseball,
  TbBallBasketball,
  TbCalendarCheck,
  TbCalendarStats,
  TbChartArrowsVertical,
  TbClipboardList,
  TbCreditCard,
  TbHexagonNumber9,
  TbTrain,
  TbBus,
  TbMedal,
  TbStarFilled,
  TbSunrise,
  TbTrophy,
} from 'react-icons/tb'
import { getLindseyFirstListBadgeOverride } from './lindseyUx'

export type BadgeKind = 'unique' | 'repeating'

export type BadgeDefinition = {
  keyPrefix: string
  kind: BadgeKind
  title: string
  /** Shown when the badge is locked (how to earn it). */
  howToEarn: string
  Icon: IconType
}

export type BadgeAwardMetadata = {
  list_id?: number
  source?: string
  lifetime?: number
  periods?: number
  rate?: number
  streak?: number
  count?: number
  total_count?: number
  period_end?: string
}

export const BADGE_CATALOG: BadgeDefinition[] = [
  {
    keyPrefix: 'first_list',
    kind: 'unique',
    title: 'First List',
    howToEarn: 'Create your first list.',
    Icon: TbClipboardList,
  },
  {
    keyPrefix: 'first_perfect_day',
    kind: 'unique',
    title: 'First Perfect Day',
    howToEarn: 'Check off every task in a daily list before that day resets.',
    Icon: TbStarFilled,
  },
  {
    keyPrefix: 'first_streak_7',
    kind: 'unique',
    title: 'On a Roll',
    howToEarn:
      'Seven in a row on one list. Daily, weekly, or monthly. Just keep the streak alive.',
    Icon: TbTrain,
  },
  {
    keyPrefix: 'daily_three_peat',
    kind: 'unique',
    title: 'Hat Trick',
    howToEarn:
      'Finish every task in a daily list on 3 different days (after each day resets).',
    Icon: TbBallBasketball,
  },
  {
    keyPrefix: 'daily_ten',
    kind: 'unique',
    title: 'Daily Rider',
    howToEarn: 'Finish a daily list on 10 different days.',
    Icon: TbBus,
  },
  {
    keyPrefix: 'daily_streak_3',
    kind: 'unique',
    title: 'Three-Peat',
    howToEarn: 'Finish the same daily list 3 days in a row.',
    Icon: TbBallAmericanFootball,
  },
  {
    keyPrefix: 'weekly_three_peat',
    kind: 'unique',
    title: 'Grand Slam',
    howToEarn: 'Finish a weekly list in 3 different weeks.',
    Icon: TbBallBaseball,
  },
  {
    keyPrefix: 'weekly_eight',
    kind: 'unique',
    title: 'Nine Perfect Innings',
    howToEarn: 'Finish a weekly list in 9 different weeks.',
    Icon: TbHexagonNumber9,
  },
  {
    keyPrefix: 'weekly_big_five',
    kind: 'unique',
    title: 'Weekly Big Five',
    howToEarn:
      'Finish a weekly list that has at least 5 tasks. Loaded bases energy.',
    Icon: TbCalendarCheck,
  },
  {
    keyPrefix: 'monthly_big_eight',
    kind: 'unique',
    title: 'Monthly Big Eight',
    howToEarn: 'Finish a monthly list that has at least 8 tasks.',
    Icon: TbMedal,
  },
  {
    keyPrefix: 'weekly_streak_3',
    kind: 'unique',
    title: '3-Week Streak',
    howToEarn: 'Finish the same weekly list 3 weeks in a row.',
    Icon: TbChartArrowsVertical,
  },
  {
    keyPrefix: 'weekly_streak_6',
    kind: 'unique',
    title: '6-Week Streak',
    howToEarn: 'Finish the same weekly list 6 weeks in a row.',
    Icon: TbTrophy,
  },
  {
    keyPrefix: 'perfect_week_',
    kind: 'repeating',
    title: 'Series Sweep',
    howToEarn: 'Clear a weekly list before the week rolls over.',
    Icon: TbTrophy,
  },
  {
    keyPrefix: 'century_completer',
    kind: 'unique',
    title: 'Century Club',
    howToEarn: 'Complete 100 tasks.',
    Icon: TbAward,
  },
  {
    keyPrefix: 'early_bird',
    kind: 'unique',
    title: 'Early Bird',
    howToEarn: 'Finish a daily list before noon.',
    Icon: TbSunrise,
  },
  {
    keyPrefix: 'consistency_30',
    kind: 'unique',
    title: 'Consistency',
    howToEarn: 'Have a success rate of 90% for the past 30 days.',
    Icon: TbCalendarStats,
  },
  {
    keyPrefix: 'goal_getter',
    kind: 'unique',
    title: 'SEPTA Key Holder',
    howToEarn: 'Finish a daily list on 30 different days.',
    Icon: TbCreditCard,
  },
  {
    keyPrefix: 'flawless_month_',
    kind: 'repeating',
    title: 'Flawless Month',
    howToEarn: 'Clear a monthly list before the month ends.',
    Icon: TbMedal,
  },
]

export function findBadgeDefinition(
  badgeKey: string,
): BadgeDefinition | undefined {
  return BADGE_CATALOG.find((b) =>
    b.kind === 'unique'
      ? b.keyPrefix === badgeKey
      : badgeKey.startsWith(b.keyPrefix),
  )
}

function listLabel(
  listId: number | undefined,
  listTitleById: Record<number, string>,
): string | null {
  if (listId == null) return null
  const title = listTitleById[listId]?.trim()
  return title || `List #${listId}`
}

function formatPeriodFromBadgeKey(
  badgeKey: string,
  prefix: string,
): string | null {
  const suffix = badgeKey.slice(prefix.length)
  if (!suffix) return null
  if (prefix === 'perfect_week_') {
    const m = suffix.match(/^(\d{4})-W(\d{2})$/)
    if (m) return `Week ${Number(m[2])}, ${m[1]}`
  }
  if (prefix === 'flawless_month_') {
    const m = suffix.match(/^(\d{4})-(\d{2})$/)
    if (m) {
      const month = new Date(Number(m[1]), Number(m[2]) - 1, 1).toLocaleString(
        undefined,
        { month: 'long', year: 'numeric' },
      )
      return month
    }
  }
  return null
}

export function getBadgeDisplay(
  def: BadgeDefinition,
  opts: {
    earned: boolean
    isLindseyUser?: boolean
    badgeKey?: string
    metadata?: BadgeAwardMetadata | null
    listTitleById?: Record<number, string>
    awardedAt?: string | null
    earnedCount?: number
  },
): { title: string; body: string; footnote?: string } {
  const lindsey = getLindseyFirstListBadgeOverride(
    !!opts.isLindseyUser,
    def.keyPrefix,
    opts.earned,
  )
  if (lindsey) {
    return {
      title: lindsey.title,
      body: lindsey.body,
      footnote: lindsey.footnote,
    }
  }
  const detail = getBadgeDetailText(def, opts)
  return {
    title: def.title,
    body: detail.body,
    footnote: detail.footnote,
  }
}

/** Text shown in the badge detail drawer. */
export function getBadgeDetailText(
  def: BadgeDefinition,
  opts: {
    earned: boolean
    badgeKey?: string
    metadata?: BadgeAwardMetadata | null
    listTitleById?: Record<number, string>
    awardedAt?: string | null
    earnedCount?: number
  },
): { body: string; footnote?: string } {
  const listTitleById = opts.listTitleById ?? {}
  const meta = opts.metadata ?? {}
  const listName = listLabel(meta.list_id, listTitleById)

  if (!opts.earned) {
    return { body: def.howToEarn }
  }

  const dateStr = opts.awardedAt
    ? new Date(opts.awardedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  // Keep cases in BADGE_CATALOG order.
  switch (def.keyPrefix) {
    case 'first_list':
      return {
        body: 'Your first list is live.',
        footnote: dateStr ?? undefined,
      }
    case 'first_perfect_day':
      return {
        body: listName
          ? `First perfect day on “${listName}.”`
          : 'Your first perfect day on a daily list.',
        footnote: dateStr ?? undefined,
      }
    case 'first_streak_7':
      return {
        body: listName
          ? `Seven in a row on “${listName}.” On a roll.`
          : 'Seven in a row on one list. On a roll.',
        footnote: dateStr ?? undefined,
      }
    case 'daily_three_peat':
      return {
        body: `Hat trick: ${meta.count ?? 3} perfect days on your daily lists.`,
        footnote: dateStr ?? undefined,
      }
    case 'daily_ten':
      return {
        body: `${meta.count ?? 10} perfect days. Daily Rider status.`,
        footnote: dateStr ?? undefined,
      }
    case 'daily_streak_3':
      return {
        body: listName
          ? `Three-peat on “${listName}”, 3 days in a row.`
          : 'Three-peat: 3 perfect days in a row on one daily list.',
        footnote:
          meta.streak != null
            ? `${meta.streak}-day streak${dateStr ? ` · ${dateStr}` : ''}`
            : (dateStr ?? undefined),
      }
    case 'weekly_three_peat':
      return {
        body: `Grand slam: ${meta.count ?? 3} perfect weeks on your weekly lists.`,
        footnote: dateStr ?? undefined,
      }
    case 'weekly_eight':
      return {
        body: `${meta.count ?? 9} perfect weeks. Nine perfect innings.`,
        footnote: dateStr ?? undefined,
      }
    case 'weekly_big_five':
      return {
        body: listName
          ? `Weekly Big Five on “${listName}”, ${meta.total_count ?? 5}+ tasks in one week.`
          : `Weekly Big Five: ${meta.total_count ?? 5}+ tasks cleared in one week.`,
        footnote: dateStr ?? undefined,
      }
    case 'monthly_big_eight':
      return {
        body: listName
          ? `Monthly Big Eight on “${listName}”, ${meta.total_count ?? 8}+ tasks in one month.`
          : `Monthly Big Eight: ${meta.total_count ?? 8}+ tasks cleared in one month.`,
        footnote: dateStr ?? undefined,
      }
    case 'weekly_streak_3':
      return {
        body: listName
          ? `3-week streak on “${listName}.”`
          : '3-week streak on one weekly list.',
        footnote:
          meta.streak != null
            ? `${meta.streak}-week streak${dateStr ? ` · ${dateStr}` : ''}`
            : (dateStr ?? undefined),
      }
    case 'weekly_streak_6':
      return {
        body: listName
          ? `6-week streak on “${listName}.”`
          : '6-week streak on one weekly list.',
        footnote:
          meta.streak != null
            ? `${meta.streak}-week streak${dateStr ? ` · ${dateStr}` : ''}`
            : (dateStr ?? undefined),
      }
    case 'perfect_week_': {
      const period =
        (opts.badgeKey &&
          formatPeriodFromBadgeKey(opts.badgeKey, def.keyPrefix)) ||
        null
      return {
        body: listName
          ? `Series sweep on “${listName}.”`
          : 'Weekly list cleared.',
        footnote: period
          ? `${period}${dateStr ? ` · ${dateStr}` : ''}`
          : (dateStr ?? undefined),
      }
    }
    case 'century_completer':
      return {
        body: `${meta.lifetime ?? 100}+ tasks. Century Club.`,
        footnote: dateStr ?? undefined,
      }
    case 'early_bird':
      return {
        body: listName
          ? `Early bird on “${listName}”, done before noon.`
          : 'Daily list done before noon.',
        footnote: dateStr ?? undefined,
      }
    case 'consistency_30':
      return {
        body: `Last 30 days: ${meta.rate ?? 90}% success rate across your list cycles.`,
        footnote: dateStr ?? undefined,
      }
    case 'goal_getter':
      return {
        body: `${meta.count ?? 30} perfect days on your daily lists. SEPTA Key Holder.`,
        footnote: dateStr ?? undefined,
      }
    case 'flawless_month_': {
      const period =
        (opts.badgeKey &&
          formatPeriodFromBadgeKey(opts.badgeKey, def.keyPrefix)) ||
        null
      return {
        body: listName
          ? `Flawless month on “${listName}.”`
          : 'Monthly list cleared.',
        footnote: period ?? dateStr ?? undefined,
      }
    }
    default:
      return {
        body: def.howToEarn,
        footnote: dateStr ?? undefined,
      }
  }
}
