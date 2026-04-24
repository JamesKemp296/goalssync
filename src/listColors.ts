/**
 * Twenty list accent colors — clearly saturated (Material ~400–700),
 * not pale pastels. Shown in the list editor and used for card / header accents.
 */
export const LIST_PALETTE = [
  '#26a69a',
  '#26c6da',
  '#29b6f6',
  '#1565c0',
  '#5c6bc0',
  '#7e57c2',
  '#ab47bc',
  '#ec407a',
  '#ef5350',
  '#ff7043',
  '#ffa726',
  '#ffca28',
  '#ffee58',
  '#d4e157',
  '#9ccc65',
  '#66bb6a',
  '#388e3c',
  '#d32f2f',
  '#8d6e63',
  '#546e7a',
] as const

export type ListPaletteHex = (typeof LIST_PALETTE)[number]

export const DEFAULT_LIST_COLOR: ListPaletteHex = LIST_PALETTE[0]

const paletteSet = new Set<string>(LIST_PALETTE)

/** Old palette swatch → closest replacement still in `LIST_PALETTE`. */
const LEGACY_COLOR_MAP: Record<string, ListPaletteHex> = {
  '#42a5f5': '#1565c0',
}

export function normalizeListColor(value: string | null | undefined): ListPaletteHex {
  if (!value) return DEFAULT_LIST_COLOR
  const mapped = LEGACY_COLOR_MAP[value]
  if (mapped) return mapped
  if (paletteSet.has(value)) return value as ListPaletteHex
  return DEFAULT_LIST_COLOR
}
