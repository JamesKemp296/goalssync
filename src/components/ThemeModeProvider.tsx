import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { CssBaseline, ThemeProvider, type PaletteMode } from '@mui/material'
import type { Session } from '@supabase/supabase-js'
import { createAppTheme } from '../theme'
import { supabase } from '../supabase'

const STORAGE_KEY = 'todoapp.themeMode'
const USER_META_KEY = 'theme_mode'

type ThemeModeContextType = {
  mode: PaletteMode
  toggleMode: () => void
  setMode: (mode: PaletteMode) => void
}

const ThemeModeContext = createContext<ThemeModeContextType | undefined>(undefined)

function readCachedMode(): PaletteMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // ignore storage errors (private mode, etc.)
  }
  return 'light'
}

function modeFromUserMetadata(session: Session | null): PaletteMode | null {
  const raw = session?.user.user_metadata?.[USER_META_KEY]
  return raw === 'light' || raw === 'dark' ? raw : null
}

function writeCache(mode: PaletteMode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // ignore storage errors
  }
}

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<PaletteMode>(readCachedMode)

  const theme = useMemo(() => createAppTheme(mode), [mode])

  useEffect(() => {
    if (!supabase) return

    const applyFromSession = (session: Session | null) => {
      const fromAccount = modeFromUserMetadata(session)
      if (fromAccount) {
        setModeState(fromAccount)
        writeCache(fromAccount)
        return
      }
      if (!session) {
        setModeState(readCachedMode())
      }
    }

    void supabase.auth.getSession().then(({ data }) => applyFromSession(data.session))

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      applyFromSession(session)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const persistToAccount = useCallback(async (next: PaletteMode) => {
    if (!supabase) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    const { error } = await supabase.auth.updateUser({
      data: {
        ...session.user.user_metadata,
        [USER_META_KEY]: next,
      },
    })
    if (error) {
      console.error('Failed to save theme to account:', error.message)
    }
  }, [])

  const value = useMemo<ThemeModeContextType>(() => {
    const setMode = (next: PaletteMode) => {
      setModeState(next)
      writeCache(next)
      void persistToAccount(next)
    }
    return {
      mode,
      setMode,
      toggleMode: () => setMode(mode === 'dark' ? 'light' : 'dark'),
    }
  }, [mode, persistToAccount])

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  )
}

export function useThemeMode(): ThemeModeContextType {
  const ctx = useContext(ThemeModeContext)
  if (!ctx) throw new Error('useThemeMode must be used inside <ThemeModeProvider>')
  return ctx
}
