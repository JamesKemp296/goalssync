/**
 * Fifteen list colors used in the editor swatch.
 * These are the exact saved hexes, so UI + DB stay in sync.
 */
export const LIST_PALETTE = [
  '#92d0c8',
  '#8fdfee',
  '#86ceff',
  '#7ca2e1',
  '#ab91dd',
  '#cb8cdb',
  '#f484a4',
  '#f58f86',
  '#ffa380',
  '#ffc97f',
  '#ffdf84',
  '#ecf690',
  '#a8da9f',
  '#e8847c',
  '#9faeb4',
] as const

export type ListPaletteHex = (typeof LIST_PALETTE)[number]

export const DEFAULT_LIST_COLOR: ListPaletteHex = LIST_PALETTE[0]

const paletteSet = new Set<string>(LIST_PALETTE)

/** Old palette swatch → closest replacement still in `LIST_PALETTE`. */
const LEGACY_COLOR_MAP: Record<string, ListPaletteHex> = {
  '#26a69a': '#92d0c8',
  '#26c6da': '#8fdfee',
  '#29b6f6': '#86ceff',
  '#1565c0': '#7ca2e1',
  '#7e57c2': '#ab91dd',
  '#ab47bc': '#cb8cdb',
  '#ec407a': '#f484a4',
  '#ef5350': '#f58f86',
  '#ff7043': '#ffa380',
  '#ffa726': '#ffc97f',
  '#ffca28': '#ffdf84',
  '#ffee58': '#ffdf84',
  '#d4e157': '#ecf690',
  '#66bb6a': '#a8da9f',
  '#388e3c': '#a8da9f',
  '#d32f2f': '#e8847c',
  '#8d6e63': '#9faeb4',
  '#546e7a': '#9faeb4',
  '#42a5f5': '#7ca2e1',
  '#aed3ce': '#92d0c8',
  '#b5e1e9': '#8fdfee',
  '#b2daf5': '#86ceff',
  '#9fb6dc': '#7ca2e1',
  '#b4b9dc': '#ab91dd',
  '#959edb': '#ab91dd',
  '#c0b1dd': '#ab91dd',
  '#d1acda': '#cb8cdb',
  '#ecadbf': '#f484a4',
  '#edb4af': '#f58f86',
  '#f4c0ac': '#ffa380',
  '#f7d6a8': '#ffc97f',
  '#f9e5ac': '#ffdf84',
  '#fbf5bc': '#ffdf84',
  '#fff595': '#ffdf84',
  '#eaefb9': '#ecf690',
  '#d4e5bc': '#a8da9f',
  '#c6e59a': '#a8da9f',
  '#c1ddbc': '#a8da9f',
  '#aec9a8': '#a8da9f',
  '#99c58f': '#a8da9f',
  '#e1a6a1': '#e8847c',
  '#c7bcb6': '#9faeb4',
  '#bdaba1': '#9faeb4',
  '#b2bbbf': '#9faeb4',
}

export function normalizeListColor(value: string | null | undefined): ListPaletteHex {
  if (!value) return DEFAULT_LIST_COLOR
  const mapped = LEGACY_COLOR_MAP[value]
  if (mapped) return mapped
  if (paletteSet.has(value)) return value as ListPaletteHex
  return DEFAULT_LIST_COLOR
}
