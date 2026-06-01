import type { ReactNode } from 'react'
import { SnackbarProvider } from 'notistack'

type ToastProviderProps = {
  children: ReactNode
}

export default function ToastProvider({ children }: ToastProviderProps) {
  return (
    <SnackbarProvider
      maxSnack={3}
      autoHideDuration={6000}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      style={{
        bottom: 'calc(72px + env(safe-area-inset-bottom))',
      }}
      classes={{
        containerRoot: 'app-snackbar-container',
      }}
    >
      {children}
    </SnackbarProvider>
  )
}
