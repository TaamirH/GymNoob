import { useEffect } from 'react'
import type { Theme } from '@/db/types'

function apply(resolved: 'dark' | 'light') {
  document.documentElement.dataset.theme = resolved
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', resolved === 'dark' ? '#0B0F14' : '#F3F5F8')
}

export function useTheme(theme: Theme) {
  useEffect(() => {
    if (theme !== 'system') {
      apply(theme)
      return
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => apply(mq.matches ? 'dark' : 'light')
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [theme])
}
