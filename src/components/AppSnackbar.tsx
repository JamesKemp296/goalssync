import { forwardRef, useCallback, type ReactNode } from 'react'
import { Box, IconButton, Paper, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import {
  closeSnackbar,
  useSnackbar,
  type EnqueueSnackbar,
  type SnackbarKey,
} from 'notistack'
import type { IconType } from 'react-icons'
import { TbAlertCircle, TbCircleCheck, TbInfoCircle, TbX } from 'react-icons/tb'

export type AppSnackbarVariant = 'default' | 'success' | 'error' | 'info'

export type AppSnackbarProps = {
  snackbarKey: SnackbarKey
  title: ReactNode
  subTitle?: ReactNode
  variant?: AppSnackbarVariant
  icon?: IconType
}

const VARIANT_ICONS: Record<AppSnackbarVariant, IconType> = {
  default: TbInfoCircle,
  success: TbCircleCheck,
  error: TbAlertCircle,
  info: TbInfoCircle,
}

const AppSnackbar = forwardRef<HTMLDivElement, AppSnackbarProps>(
  function AppSnackbar(
    { snackbarKey, title, subTitle, variant = 'default', icon },
    ref,
  ) {
  const theme = useTheme()
  const accent =
    variant === 'error'
      ? theme.palette.error.main
      : variant === 'info'
        ? theme.palette.secondary.main
        : theme.palette.primary.main
  const Icon = icon ?? VARIANT_ICONS[variant]

  return (
    <Paper
      ref={ref}
      elevation={3}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        px: 2,
        py: 1.5,
        width: { xs: '100%', sm: 360 },
        maxWidth: '100%',
        border: '1px solid',
        borderColor: alpha(accent, 0.45),
        bgcolor: 'background.paper',
        backgroundImage: 'none',
      }}
    >
      <Box
        sx={{
          color: accent,
          display: 'flex',
          alignItems: 'center',
          pt: 0.25,
          flexShrink: 0,
        }}
      >
        <Icon size={22} strokeWidth={1.75} />
      </Box>
      <Box sx={{ minWidth: 0, flex: 1, pr: 0.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          {title}
        </Typography>
        {subTitle ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {subTitle}
          </Typography>
        ) : null}
      </Box>
      <IconButton
        size="small"
        aria-label="Dismiss notification"
        onClick={() => closeSnackbar(snackbarKey)}
        sx={{
          mt: -0.25,
          mr: -0.5,
          color: 'text.secondary',
          flexShrink: 0,
        }}
      >
        <TbX size={16} />
      </IconButton>
    </Paper>
  )
  },
)

export default AppSnackbar

export type AppToastOptions = {
  subTitle?: string
  variant?: AppSnackbarVariant
}

export function showAppToast(
  enqueueSnackbar: EnqueueSnackbar,
  title: string,
  options?: AppToastOptions,
) {
  enqueueSnackbar(title, {
    content: (key: SnackbarKey, message) => (
      <AppSnackbar
        snackbarKey={key}
        title={message}
        subTitle={options?.subTitle}
        variant={options?.variant ?? 'success'}
      />
    ),
  })
}

export function useAppToast() {
  const { enqueueSnackbar } = useSnackbar()

  return useCallback(
    (title: string, options?: AppToastOptions) => {
      showAppToast(enqueueSnackbar, title, options)
    },
    [enqueueSnackbar],
  )
}
