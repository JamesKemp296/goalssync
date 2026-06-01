import type { IconType } from 'react-icons'
import { TbHeartFilled } from 'react-icons/tb'

/** Lindsey easter-egg: 20% session roll for header avatar / greeting. */
export function isLindseyUser(firstName: string, email: string): boolean {
  const normalizedFirstName = firstName.toLowerCase()
  const normalizedEmail = email.toLowerCase()
  return (
    normalizedFirstName.includes('lindsey') ||
    normalizedEmail.includes('lindsey')
  )
}

export function rollShowLindseyUX(firstName: string, email: string): boolean {
  return isLindseyUser(firstName, email) && Math.random() < 0.2
}

/** Lindsey easter-egg: 1% roll when a todo is completed. */
export const LINDSEY_COMPLETION_TOAST = {
  title: 'Great work gorgeous',
  Icon: TbHeartFilled,
} as const

export function rollLindseyCompletionToast(isLindsey: boolean): boolean {
  return isLindsey && Math.random() < 0.01
}

/** Local display override for the earned `first_list` badge (not stored in DB). */
export const LINDSEY_FIRST_LIST_BADGE = {
  title: 'Be gorgeous',
  body: 'You are so gorgeous and talented babe',
  footnote: 'Forever and always',
  Icon: TbHeartFilled,
} as const

export function isLindseyFirstListBadge(
  isLindsey: boolean,
  badgeKeyPrefix: string,
  earned: boolean,
): boolean {
  return isLindsey && earned && badgeKeyPrefix === 'first_list'
}

export function getLindseyFirstListBadgeOverride(
  isLindsey: boolean,
  badgeKeyPrefix: string,
  earned: boolean,
): typeof LINDSEY_FIRST_LIST_BADGE | null {
  if (isLindseyFirstListBadge(isLindsey, badgeKeyPrefix, earned)) {
    return LINDSEY_FIRST_LIST_BADGE
  }
  return null
}

export function getLindseyFirstListBadgeIcon(
  isLindsey: boolean,
  badgeKeyPrefix: string,
  earned: boolean,
  defaultIcon: IconType,
): IconType {
  return isLindseyFirstListBadge(isLindsey, badgeKeyPrefix, earned)
    ? LINDSEY_FIRST_LIST_BADGE.Icon
    : defaultIcon
}
