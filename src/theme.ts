import { createTheme, type PaletteMode } from '@mui/material'
import { createSoftShadows } from './themeShadows'

const primaryMain = '#FFA02E'
const secondaryMain = '#49eeeb'
const lightSurfaceBorder = '#e0e0e0'
const darkSurfaceBorder = '#262626'
const lightInputBorder = '#b0b0b0'
const darkInputBorder = '#4d4d4d'

const sharedTypography = {
  fontFamily: 'Inter, sans-serif',
  fontSize: 13,
  fontWeightLight: 300,
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightBold: 600,
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
            divider: darkSurfaceBorder,
            background: {
              default: '#162e14',
              paper: '#162e14',
            },
          }
        : {
            divider: lightSurfaceBorder,
            background: {
              default: '#f5f5f3',
              paper: '#fafaf8',
            },
          }),
    },
    typography: sharedTypography,
    shadows: createSoftShadows(mode),
    spacing: 10,
    shape: {
      borderRadius: 6,
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            border: `1px solid ${
              mode === 'dark' ? darkSurfaceBorder : lightSurfaceBorder
            }`,
          },
        },
      },
      MuiInputBase: {
        styleOverrides: {
          root: {
            backgroundColor: mode === 'dark' ? 'transparent' : '#ffffff',
            color: mode === 'dark' ? 'inherit' : '#1c1208',
          },
          input: {
            // Prevent iOS Safari/PWA auto-zoom on focus for text inputs.
            fontSize: '16px',
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          notchedOutline: {
            borderColor: mode === 'dark' ? darkInputBorder : lightInputBorder,
          },
        },
      },
    },
  })

export default createAppTheme('light')
