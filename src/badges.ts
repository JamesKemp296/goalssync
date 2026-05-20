import type { IconType } from 'react-icons'
import {
  TbAward,
  TbBolt,
  TbCalendarCheck,
  TbCalendarStats,
  TbChartArrowsVertical,
  TbFlame,
  TbMedal,
  TbRocket,
  TbStarFilled,
  TbSunrise,
  TbTargetArrow,
  TbTarget,
  TbTrophy,
} from 'react-icons/tb'

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
  period_end?: string
}

export const BADGE_CATALOG: BadgeDefinition[] = [
  {
    keyPrefix: 'first_perfect_day',
    kind: 'unique',
    title: 'First Perfect Day',
    howToEarn:
      'Check off every task in a daily list before that day resets at midnight.',
    Icon: TbStarFilled,
  },
  {
    keyPrefix: 'first_streak_7',
    kind: 'unique',
    title: 'On a Roll',
    howToEarn:
      'On one list, finish every task for 7 periods in a row (daily, weekly, or monthly).',
    Icon: TbFlame,
  },
  {
    keyPrefix: 'daily_three_peat',
    kind: 'unique',
    title: 'Daily Three-Peat',
    howToEarn:
      'Finish every task in a daily list on 3 different days (after each day resets).',
    Icon: TbBolt,
  },
  {
    keyPrefix: 'daily_ten',
    kind: 'unique',
    title: 'Daily Ten',
    howToEarn:
      'Finish every task in a daily list on 10 different days across your daily lists.',
    Icon: TbRocket,
  },
  {
    keyPrefix: 'daily_streak_3',
    kind: 'unique',
    title: '3-Day Streak',
    howToEarn:
      'On the same daily list, finish every task for 3 days in a row.',
    Icon: TbFlame,
  },
  {
    keyPrefix: 'weekly_three_peat',
    kind: 'unique',
    title: 'Weekly Three-Peat',
    howToEarn:
      'Finish every task in a weekly list for 3 separate weeks (after each week resets).',
    Icon: TbCalendarCheck,
  },
  {
    keyPrefix: 'weekly_eight',
    kind: 'unique',
    title: 'Weekly Eight',
    howToEarn:
      'Finish every task in a weekly list for 8 separate weeks across your weekly lists.',
    Icon: TbTarget,
  },
  {
    keyPrefix: 'weekly_streak_3',
    kind: 'unique',
    title: '3-Week Streak',
    howToEarn:
      'On the same weekly list, finish every task for 3 weeks in a row.',
    Icon: TbChartArrowsVertical,
  },
  {
    keyPrefix: 'weekly_streak_6',
    kind: 'unique',
    title: '6-Week Streak',
    howToEarn:
      'On the same weekly list, finish every task for 6 weeks in a row.',
    Icon: TbTrophy,
  },
  {
    keyPrefix: 'perfect_week_',
    kind: 'repeating',
    title: 'Perfect Week',
    howToEarn:
      'Before a weekly list resets, check off every task in that list for that week.',
    Icon: TbTrophy,
  },
  {
    keyPrefix: 'century_completer',
    kind: 'unique',
    title: 'Century Club',
    howToEarn:
      'Check off 100 tasks total, across any of your lists (daily, weekly, or monthly).',
    Icon: TbAward,
  },
  {
    keyPrefix: 'early_bird',
    kind: 'unique',
    title: 'Early Bird',
    howToEarn:
      'Finish every task in a daily list before noon in your timezone.',
    Icon: TbSunrise,
  },
  {
    keyPrefix: 'consistency_30',
    kind: 'unique',
    title: 'Consistency',
    howToEarn:
      'Keep going for 30 list periods: each time a daily, weekly, or monthly list hits its reset, that counts as one period.',
    Icon: TbCalendarStats,
  },
  {
    keyPrefix: 'goal_getter',
    kind: 'unique',
    title: 'Goal Getter',
    howToEarn:
      'Over the last 30 days, finish every task in at least 9 out of every 10 list periods you close (you need at least 10 closed periods).',
    Icon: TbTargetArrow,
  },
  {
    keyPrefix: 'flawless_month_',
    kind: 'repeating',
    title: 'Flawless Month',
    howToEarn:
      'Before a monthly list resets, check off every task in that list for that month.',
    Icon: TbMedal,
  },
]

export function findBadgeDefinition(
  badgeKey: string,
): BadgeDefinition | undefined {
  return BADGE_CATALOG.find((b) =>
    b.kind === 'unique' ? b.keyPrefix === badgeKey : badgeKey.startsWith(b.keyPrefix),
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

function formatPeriodFromBadgeKey(badgeKey: string, prefix: string): string | null {
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

  switch (def.keyPrefix) {
    case 'first_perfect_day':
      return {
        body: listName
          ? `You finished every task in your daily list “${listName}.”`
          : 'You finished every task in a daily list.',
        footnote: dateStr ? `Earned ${dateStr}` : undefined,
      }
    case 'early_bird':
      return {
        body: listName
          ? `You finished “${listName}” before noon.`
          : 'You finished a daily list before noon.',
        footnote: dateStr ? `Earned ${dateStr}` : undefined,
      }
    case 'first_streak_7':
      return {
        body: listName
          ? `Seven perfect periods in a row on “${listName}.”`
          : 'Seven perfect periods in a row on one list.',
        footnote: dateStr ? `Earned ${dateStr}` : undefined,
      }
    case 'daily_streak_3':
      return {
        body: listName
          ? `Three perfect daily days in a row on “${listName}.”`
          : 'Three perfect daily days in a row on one daily list.',
        footnote:
          meta.streak != null
            ? `${meta.streak}-day streak${dateStr ? ` · ${dateStr}` : ''}`
            : dateStr
              ? `Earned ${dateStr}`
              : undefined,
      }
    case 'weekly_streak_3':
      return {
        body: listName
          ? `Three perfect weeks in a row on “${listName}.”`
          : 'Three perfect weeks in a row on one weekly list.',
        footnote:
          meta.streak != null
            ? `${meta.streak}-week streak${dateStr ? ` · ${dateStr}` : ''}`
            : dateStr
              ? `Earned ${dateStr}`
              : undefined,
      }
    case 'weekly_streak_6':
      return {
        body: listName
          ? `Six perfect weeks in a row on “${listName}.”`
          : 'Six perfect weeks in a row on one weekly list.',
        footnote:
          meta.streak != null
            ? `${meta.streak}-week streak${dateStr ? ` · ${dateStr}` : ''}`
            : dateStr
              ? `Earned ${dateStr}`
              : undefined,
      }
    case 'perfect_week_': {
      const period =
        (opts.badgeKey && formatPeriodFromBadgeKey(opts.badgeKey, def.keyPrefix)) ||
        null
      return {
        body: listName
          ? `Perfect week on “${listName}” — every task done before the week reset.`
          : 'Perfect week on a weekly list — every task done before the week reset.',
        footnote: period
          ? `Week of ${period}${dateStr ? ` · ${dateStr}` : ''}`
          : dateStr
            ? `Earned ${dateStr}`
            : undefined,
      }
    }
    case 'flawless_month_': {
      const period =
        (opts.badgeKey && formatPeriodFromBadgeKey(opts.badgeKey, def.keyPrefix)) ||
        null
      return {
        body: listName
          ? `Perfect month on “${listName}” — every task done before the month reset.`
          : 'Perfect month on a monthly list — every task done before the month reset.',
        footnote: period ?? (dateStr ? `Earned ${dateStr}` : undefined),
      }
    }
    case 'century_completer':
      return {
        body: `You have checked off ${meta.lifetime ?? 100}+ tasks across all your lists.`,
        footnote: dateStr ? `Earned ${dateStr}` : undefined,
      }
    case 'consistency_30':
      return {
        body: `You have closed ${meta.periods ?? 30}+ list periods (daily, weekly, or monthly resets).`,
        footnote: dateStr ? `Earned ${dateStr}` : undefined,
      }
    case 'goal_getter':
      return {
        body: `In the last 30 days, you finished every task in ${meta.rate ?? 90}% of your closed list periods (${meta.periods ?? '10+'} periods tracked).`,
        footnote: dateStr ? `Earned ${dateStr}` : undefined,
      }
    case 'daily_three_peat':
      return {
        body: `You have had ${meta.count ?? 3} perfect days on your daily lists.`,
        footnote: dateStr ? `Earned ${dateStr}` : undefined,
      }
    case 'daily_ten':
      return {
        body: `You have had ${meta.count ?? 10} perfect days on your daily lists.`,
        footnote: dateStr ? `Earned ${dateStr}` : undefined,
      }
    case 'weekly_three_peat':
      return {
        body: `You have had ${meta.count ?? 3} perfect weeks on your weekly lists.`,
        footnote: dateStr ? `Earned ${dateStr}` : undefined,
      }
    case 'weekly_eight':
      return {
        body: `You have had ${meta.count ?? 8} perfect weeks on your weekly lists.`,
        footnote: dateStr ? `Earned ${dateStr}` : undefined,
      }
    default:
      return {
        body: def.howToEarn,
        footnote: dateStr ? `Earned ${dateStr}` : undefined,
      }
  }
}
