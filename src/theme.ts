import { createTheme, type PaletteMode } from '@mui/material'
import { createSoftShadows } from './themeShadows'

const lightPrimary = {
  main: '#FFA02E',
  light: '#ffb84d',
  dark: '#e8900a',
  contrastText: '#1c1208',
} as const

const darkPrimary = {
  main: '#56ab56',
  light: '#6fbf6f',
  dark: '#489648',
  contrastText: '#f5f8f5',
} as const

const lightSecondary = {
  main: '#49eeeb',
  contrastText: '#0d2222',
} as const

const darkSecondary = {
  main: '#8a9489',
  contrastText: '#eceae6',
} as const

const lightSurfaceBorder = '#e0e0e0'
const darkSurfaceBorder = '#353330'
const lightInputBorder = '#b0b0b0'
const darkInputBorder = '#575350'
const darkInputBorderHover = '#6e6a66'
const darkInputFill = '#322f2c'
const lightBackground = '#f5f5f3'
const lightPaper = '#fafaf8'
const darkBackground = '#201e1c'
const darkPaper = '#2a2826'

const darkText = {
  primary: '#eceae6',
  secondary: '#95918b',
  disabled: '#5c5955',
} as const

const sharedTypography = {
  fontFamily: 'Inter, sans-serif',
  fontSize: 13,
  fontWeightLight: 300,
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightBold: 600,
} as const

export const createAppTheme = (mode: PaletteMode) =>
  createTheme({
    palette: {
      mode,
      primary: mode === 'dark' ? darkPrimary : lightPrimary,
      secondary: mode === 'dark' ? darkSecondary : lightSecondary,
      ...(mode === 'dark'
        ? {
            divider: darkSurfaceBorder,
            background: {
              default: darkBackground,
              paper: darkPaper,
            },
            text: darkText,
            action: {
              active: darkText.secondary,
              hover: 'rgba(236, 234, 230, 0.06)',
              selected: 'rgba(86, 171, 86, 0.14)',
              disabled: darkText.disabled,
              disabledBackground: 'rgba(236, 234, 230, 0.08)',
            },
          }
        : {
            divider: lightSurfaceBorder,
            background: {
              default: lightBackground,
              paper: lightPaper,
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
            backgroundColor: mode === 'dark' ? darkInputFill : '#ffffff',
            color: mode === 'dark' ? darkText.primary : lightPrimary.contrastText,
          },
          input: {
            // Prevent iOS Safari/PWA auto-zoom on focus for text inputs.
            fontSize: '16px',
            '&::placeholder': {
              color: mode === 'dark' ? darkText.secondary : undefined,
              opacity: mode === 'dark' ? 1 : undefined,
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            ...(mode === 'dark' && {
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: darkInputBorderHover,
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: darkPrimary.main,
                borderWidth: 2,
              },
            }),
          },
          notchedOutline: {
            borderColor: mode === 'dark' ? darkInputBorder : lightInputBorder,
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            ...(mode === 'dark' && {
              color: darkText.secondary,
              '&.Mui-focused': {
                color: darkPrimary.main,
              },
            }),
          },
        },
      },
    },
  })

export default createAppTheme('light')
