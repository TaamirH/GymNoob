import type { Exercise } from '@/db/types'
import { Sheet } from '@/components/Sheet'
import { GuideView } from '@/features/exercises/GuideView'
import { useT } from '@/i18n'

export function GuideSheet({ exercise, onClose }: { exercise: Exercise | null; onClose: () => void }) {
  const t = useT()
  return (
    <Sheet open={!!exercise} onClose={onClose} title={exercise?.nameEn} subtitle={exercise && <span dir="rtl" lang="he">{exercise.nameHe}</span>}>
      {exercise && (
        <div className="space-y-4">
          {exercise.isAssisted && <div className="rounded-2xl bg-info-soft text-info text-sm px-4 py-3 font-medium">{t.common.assistedHint}</div>}
          {exercise.mediaUrl && (
            <div className="rounded-2xl overflow-hidden bg-surface-2">
              <img src={exercise.mediaUrl} alt={exercise.nameEn} className="w-full aspect-square object-cover" loading="lazy" />
            </div>
          )}
          <GuideView guide={exercise.guideHe} />
          {exercise.attribution && exercise.mediaUrl && <div className="text-[11px] text-muted">{exercise.attribution}</div>}
        </div>
      )}
    </Sheet>
  )
}
