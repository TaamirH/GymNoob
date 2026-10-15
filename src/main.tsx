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
    // Look for a new build whenever the app comes to the foreground, and hourly.
    const check = () => {
      if (document.visibilityState === 'visible') void reg.update().catch(() => undefined)
    }
    document.addEventListener('visibilitychange', check)
    window.setInterval(check, 60 * 60 * 1000)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
