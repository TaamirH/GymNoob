import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App'

registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    if (!reg) return
    // The browser already checks for a new build on every launch.
    // This only covers an app left open for days.
    window.setInterval(() => void reg.update().catch(() => undefined), 24 * 60 * 60 * 1000)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
