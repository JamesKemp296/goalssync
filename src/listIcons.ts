import type { IconType } from 'react-icons'
import {
  TbBarbell,
  TbBook,
  TbBriefcase,
  TbCalendarEvent,
  TbChefHat,
  TbHeart,
  TbHome,
  TbListCheck,
  TbPaw,
  TbSchool,
  TbShoppingCart,
  TbWallet,
} from 'react-icons/tb'

export type ListIconOption = {
  key: string
  label: string
  Icon: IconType
}

export const LIST_ICON_OPTIONS: ListIconOption[] = [
  { key: 'list', label: 'List', Icon: TbListCheck },
  { key: 'work', label: 'Work', Icon: TbBriefcase },
  { key: 'study', label: 'Study', Icon: TbSchool },
  { key: 'fitness', label: 'Fitness', Icon: TbBarbell },
  { key: 'shopping', label: 'Shopping', Icon: TbShoppingCart },
  { key: 'food', label: 'Food', Icon: TbChefHat },
  { key: 'home', label: 'Home', Icon: TbHome },
  { key: 'health', label: 'Health', Icon: TbHeart },
  { key: 'money', label: 'Money', Icon: TbWallet },
  { key: 'events', label: 'Events', Icon: TbCalendarEvent },
  { key: 'pets', label: 'Pets', Icon: TbPaw },
  { key: 'reading', label: 'Reading', Icon: TbBook },
  { key: 'personal', label: 'Personal', Icon: TbListCheck },
  { key: 'family', label: 'Family', Icon: TbHome },
  { key: 'errands', label: 'Errands', Icon: TbShoppingCart },
]

export const DEFAULT_LIST_ICON = LIST_ICON_OPTIONS[0].key

const iconSet = new Set<string>(LIST_ICON_OPTIONS.map((item) => item.key))
const iconMap = new Map(LIST_ICON_OPTIONS.map((item) => [item.key, item.Icon]))
const LEGACY_ICON_MAP: Record<string, string> = {
  movies: 'personal',
  games: 'personal',
  car: 'errands',
  travel: 'errands',
  cleaning: 'home',
  party: 'events',
  tech: 'work',
  garden: 'home',
}

export function normalizeListIcon(value: string | null | undefined): string {
  if (value && iconSet.has(value)) return value
  if (value && LEGACY_ICON_MAP[value] && iconSet.has(LEGACY_ICON_MAP[value])) {
    return LEGACY_ICON_MAP[value]
  }
  return DEFAULT_LIST_ICON
}

export function getListIconComponent(value: string | null | undefined): IconType {
  return iconMap.get(normalizeListIcon(value)) ?? TbListCheck
}
