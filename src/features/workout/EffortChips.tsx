import type { Effort } from '@/db/types'
import { useT } from '@/i18n'
import { haptics } from '@/lib/haptics'

const EFFORTS: Effort[] = ['easy', 'ok', 'hard', 'failed']

const selectedClass: Record<Effort, string> = {
  easy: 'bg-info-soft text-info',
  ok: 'bg-good-soft text-good',
  hard: 'bg-warn-soft text-warn',
  failed: 'bg-danger-soft text-danger',
}

export function EffortChips({ value, onChange, compact }: { value: Effort; onChange: (e: Effort) => void; compact?: boolean }) {
  const t = useT()
  return (
    <div className="flex gap-1.5" role="radiogroup" aria-label={t.workout.effortQuestion}>
      {EFFORTS.map((e) => {
        const selected = e === value
        return (
          <button
            key={e}
            type="button"
            role="radio"
            aria-checked={selected}
            title={t.effort[`${e}Hint`]}
            onClick={() => {
              if (!selected) {
                haptics.tap()
                onChange(e)
              }
            }}
            className={`pressable flex-1 ${compact ? 'h-7 text-[11px]' : 'h-8 text-xs'} rounded-full font-semibold transition-colors ${
              selected ? selectedClass[e] : 'bg-surface-2/70 text-muted'
            }`}
          >
            {t.effort[e]}
          </button>
        )
      })}
    </div>
  )
}
