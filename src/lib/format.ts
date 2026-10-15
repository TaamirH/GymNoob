export function fmtKg(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '')
}

export function fmtClock(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

export function fmtDuration(ms: number): string {
  const min = Math.round(ms / 60000)
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

/** YYYY-MM-DD in local time */
export function isoDate(d: Date | number = new Date()): string {
  const date = typeof d === 'number' ? new Date(d) : d
  const y = date.getFullYear()
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function startOfDay(d: Date | number): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function startOfWeek(d: Date | number, weekStartsOn: 0 | 1): Date {
  const x = startOfDay(d)
  const diff = (x.getDay() - weekStartsOn + 7) % 7
  x.setDate(x.getDate() - diff)
  return x
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function isSameDay(a: Date | number, b: Date | number): boolean {
  return isoDate(a) === isoDate(b)
}

export function roundTo(n: number, step: number): number {
  return Math.round(n / step) * step
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}
