import { useCallback, useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, getMeta, setMeta } from '@/db/db'

export interface RestState {
  endsAt: number
  totalSec: number
}

const KEY = 'rest'

/**
 * Rest countdown that survives reloads and backgrounding.
 * The end time lives in the database; the UI only computes `endsAt - now`.
 * `onEnd` fires once per timer, as soon as the page notices the time passed.
 */
export function useRestTimer(onEnd?: (state: RestState) => void) {
  const rest = useLiveQuery(() => getMeta<RestState>(KEY), [])
  const [now, setNow] = useState(() => Date.now())
  const firedFor = useRef<number | null>(null)
  const onEndRef = useRef(onEnd)
  onEndRef.current = onEnd

  const endsAt = rest?.endsAt ?? null

  // Tick while a timer exists, and resync whenever the page comes back.
  useEffect(() => {
    if (endsAt === null) return
    const bump = () => setNow(Date.now())
    bump()
    const id = window.setInterval(bump, 250)
    document.addEventListener('visibilitychange', bump)
    window.addEventListener('focus', bump)
    window.addEventListener('pageshow', bump)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', bump)
      window.removeEventListener('focus', bump)
      window.removeEventListener('pageshow', bump)
    }
  }, [endsAt])

  // A one-shot timeout for the exact end moment; survives interval throttling in background tabs.
  useEffect(() => {
    if (endsAt === null) return
    const ms = endsAt - Date.now()
    if (ms <= 0) return
    const id = window.setTimeout(() => setNow(Date.now()), ms + 30)
    return () => window.clearTimeout(id)
  }, [endsAt])

  // Fire end exactly once per timer.
  useEffect(() => {
    if (!rest || endsAt === null) return
    if (now >= endsAt && firedFor.current !== endsAt) {
      firedFor.current = endsAt
      void db.meta.delete(KEY)
      onEndRef.current?.(rest)
    }
  }, [now, endsAt, rest])

  const start = useCallback(async (sec: number) => {
    const s = Math.max(5, Math.round(sec))
    await setMeta(KEY, { endsAt: Date.now() + s * 1000, totalSec: s } satisfies RestState)
  }, [])

  const add = useCallback(
    async (sec: number) => {
      if (!rest) return
      await setMeta(KEY, { endsAt: Math.max(Date.now(), rest.endsAt) + sec * 1000, totalSec: rest.totalSec + sec } satisfies RestState)
    },
    [rest],
  )

  const skip = useCallback(async () => {
    if (endsAt !== null) firedFor.current = endsAt
    await db.meta.delete(KEY)
  }, [endsAt])

  const active = endsAt !== null && now < endsAt
  const remainingSec = active ? Math.ceil((endsAt - now) / 1000) : 0
  const totalSec = rest?.totalSec ?? 0

  return { active, remainingSec, totalSec, start, add, skip }
}
