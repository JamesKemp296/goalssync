import type { PaletteMode, Shadows } from '@mui/material'

function makeShadow(
  y: number,
  blur: number,
  spread: number,
  alpha: number,
): string {
  return `0px ${y}px ${blur}px ${spread}px rgba(15, 23, 42, ${alpha})`
}

/**
 * Softer, modern shadow scale for MUI elevations 0..24.
 * Keeps low elevations subtle and avoids harsh triple-layer Material defaults.
 */
export function createSoftShadows(mode: PaletteMode): Shadows {
  const baseAlpha = mode === 'dark' ? 0.34 : 0.12

  const values = Array.from({ length: 25 }, (_, i) => {
    if (i === 0) return 'none'

    const y = Math.max(1, Math.round(i * 0.55))
    const blur = Math.max(2, Math.round(i * 1.8 + 2))
    const spread = Math.round(i * -0.06)

    const keyAlpha = Number((baseAlpha * (0.65 + i / 38)).toFixed(3))
    const ambientAlpha = Number((baseAlpha * 0.45).toFixed(3))

    return `${makeShadow(y, blur, spread, keyAlpha)}, ${makeShadow(
      Math.max(1, Math.round(y / 2)),
      Math.max(2, Math.round(blur / 2)),
      0,
      ambientAlpha,
    )}`
  })

  return values as Shadows
}
