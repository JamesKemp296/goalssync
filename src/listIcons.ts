import type { IconType } from 'react-icons'
import {
  TbBarbell,
  TbBook,
  TbBriefcase,
  TbCalendarEvent,
  TbCar,
  TbChefHat,
  TbConfetti,
  TbDeviceGamepad2,
  TbDeviceLaptop,
  TbHeart,
  TbHome,
  TbListCheck,
  TbMovie,
  TbPaw,
  TbPlane,
  TbPlant2,
  TbSchool,
  TbShoppingCart,
  TbSpray,
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
  { key: 'reading', label: 'Reading', Icon: TbBook },
  { key: 'movies', label: 'Movies', Icon: TbMovie },
  { key: 'games', label: 'Games', Icon: TbDeviceGamepad2 },
  { key: 'pets', label: 'Pets', Icon: TbPaw },
  { key: 'travel', label: 'Travel', Icon: TbPlane },
  { key: 'car', label: 'Car', Icon: TbCar },
  { key: 'events', label: 'Events', Icon: TbCalendarEvent },
  { key: 'home', label: 'Home', Icon: TbHome },
  { key: 'health', label: 'Health', Icon: TbHeart },
  { key: 'money', label: 'Money', Icon: TbWallet },
  { key: 'cleaning', label: 'Cleaning', Icon: TbSpray },
  { key: 'party', label: 'Party', Icon: TbConfetti },
  { key: 'tech', label: 'Tech', Icon: TbDeviceLaptop },
  { key: 'garden', label: 'Garden', Icon: TbPlant2 },
]

export const DEFAULT_LIST_ICON = LIST_ICON_OPTIONS[0].key

const iconSet = new Set<string>(LIST_ICON_OPTIONS.map((item) => item.key))
const iconMap = new Map(LIST_ICON_OPTIONS.map((item) => [item.key, item.Icon]))

export function normalizeListIcon(value: string | null | undefined): string {
  if (value && iconSet.has(value)) return value
  return DEFAULT_LIST_ICON
}

export function getListIconComponent(value: string | null | undefined): IconType {
  return iconMap.get(normalizeListIcon(value)) ?? TbListCheck
}
