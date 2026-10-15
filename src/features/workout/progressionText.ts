import type { Dict } from '@/i18n/en'
import type { Exercise, Prescription } from '@/db/types'
import { fmtKg } from '@/lib/format'

export type Tone = 'good' | 'muted' | 'warn' | 'info'

export function describeChange(t: Dict, ex: Pick<Exercise, 'isAssisted'>, rx: Prescription): { label: string; reason: string; tone: Tone } {
  const p = rx.reasonParams ?? {}
  const abs = Math.abs(rx.lastDelta)
  switch (rx.lastChange) {
    case 'bump':
      return {
        label: ex.isAssisted ? t.summary.assistedBump(abs) : t.summary.bump(abs),
        reason: t.summary.reasonBump(p.max ?? rx.maxReps, p.sets ?? rx.sets, p.weight ?? 0),
        tone: 'good',
      }
    case 'deload':
      return {
        label: ex.isAssisted ? t.summary.assistedDeload(abs) : t.summary.deload(abs),
        reason: t.summary.reasonDeload(p.min ?? rx.minReps),
        tone: 'warn',
      }
    case 'hold':
      return { label: t.summary.hold, reason: t.summary.reasonHold, tone: 'muted' }
    case 'first':
      return { label: `${fmtKg(rx.weightKg)} ${t.common.kg}`, reason: t.summary.reasonFirst, tone: 'info' }
    default:
      return { label: '—', reason: '', tone: 'muted' }
  }
}

export const toneClass: Record<Tone, string> = {
  good: 'bg-good-soft text-good',
  muted: 'bg-surface-2 text-muted',
  warn: 'bg-warn-soft text-warn',
  info: 'bg-info-soft text-info',
}
