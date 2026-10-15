import type { MuscleGroup } from '@/db/types'
import { useT } from '@/i18n'

export function MuscleTag({ muscle, secondary }: { muscle: MuscleGroup; secondary?: boolean }) {
  const t = useT()
  return (
    <span
      className={`inline-flex items-center h-6 px-2 rounded-full text-[11px] font-medium ${
        secondary ? 'bg-surface-2 text-muted' : 'bg-accent-soft text-accent'
      }`}
    >
      {t.muscles[muscle]}
    </span>
  )
}
