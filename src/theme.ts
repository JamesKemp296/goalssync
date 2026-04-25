import { createTheme, type PaletteMode } from '@mui/material'
import { createSoftShadows } from './themeShadows'

const primaryMain = '#FFA02E'
const secondaryMain = '#49eeeb'

const sharedTypography = {
  fontFamily: 'Verdana, sans-serif',
  fontSize: 12,
  fontWeightLight: 400,
  fontWeightRegular: 500,
  fontWeightMedium: 600,
  fontWeightBold: 800,
} as const

/** Dark text on orange `#FFA02E` (~WCAG AA for normal UI copy) */
const primaryContrast = '#1c1208'
const secondaryContrast = '#0d2222'

export const createAppTheme = (mode: PaletteMode) =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: primaryMain,
        contrastText: primaryContrast,
      },
      secondary: {
        main: secondaryMain,
        contrastText: secondaryContrast,
      },
      ...(mode === 'dark'
        ? {
            background: {
              default: '#162e14',
              paper: '#162e14',
            },
          }
        : {
            background: {
              default: '#f5f5f3',
              paper: '#fafaf8',
            },
          }),
    },
    typography: sharedTypography,
    shadows: createSoftShadows(mode),
    spacing: 11,
    shape: {
      borderRadius: 6,
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            border: `1px solid ${mode === 'dark' ? '#262626' : '#e0e0e0'}`,
          },
        },
      },
    },
  })

export default createAppTheme('dark')
