import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { ThemeModeProvider } from './components/ThemeModeProvider'

registerSW({ immediate: true })

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element #root not found')

createRoot(rootEl).render(
  <StrictMode>
    <ThemeModeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeModeProvider>
  </StrictMode>,
)
