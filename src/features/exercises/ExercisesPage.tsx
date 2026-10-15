import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router'
import { db } from '@/db/db'
import { useT } from '@/i18n'
import { Page, PageHeader } from '@/components/PageHeader'
import { Card, SectionTitle, EmptyState } from '@/components/Card'
import { Icon } from '@/components/Icon'
import { MuscleTag } from '@/components/MuscleTag'
import { fmtKg } from '@/lib/format'
import type { Exercise, Prescription } from '@/db/types'

function ExerciseRow({ ex, index, rx }: { ex: Exercise; index?: number; rx?: Prescription }) {
  const t = useT()
  return (
    <Link to={`/exercises/${ex.id}`} className="pressable block">
      <Card className="px-4 py-3.5 flex items-center gap-3">
        {index !== undefined && (
          <div className="num w-8 h-8 rounded-xl bg-surface-2 flex items-center justify-center text-sm font-bold text-muted shrink-0">
            {index + 1}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold leading-tight truncate">{ex.nameEn}</div>
          <div className="text-sm text-muted truncate" dir="rtl" lang="he" style={{ textAlign: 'start' }}>
            {ex.nameHe}
          </div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {ex.primaryMuscles.map((m) => (
              <MuscleTag key={m} muscle={m} />
            ))}
            {ex.isAssisted && (
              <span className="inline-flex items-center h-6 px-2 rounded-full text-[11px] font-medium bg-info-soft text-info">
                {t.common.assisted}
              </span>
            )}
          </div>
        </div>
        <div className="text-end shrink-0">
          {rx && rx.weightKg !== null ? (
            <>
              <div className="num text-xl font-bold leading-none">
                {fmtKg(rx.weightKg)}
                <span className="text-xs text-muted font-medium ms-1">{t.common.kg}</span>
              </div>
              <div className="text-[11px] text-muted mt-1">
                {rx.sets} × {rx.minReps}–{rx.maxReps}
              </div>
            </>
          ) : (
            <div className="text-xs text-muted">{t.common.notSet}</div>
          )}
        </div>
        <Icon name="chevron-right" size={18} className="text-muted shrink-0 rtl:rotate-180" />
      </Card>
    </Link>
  )
}

export default function ExercisesPage() {
  const t = useT()
  const data = useLiveQuery(async () => {
    const [routines, exercises, prescriptions] = await Promise.all([
      db.routines.toArray(),
      db.exercises.toArray(),
      db.prescriptions.toArray(),
    ])
    return { routine: routines[0], exercises, prescriptions }
  }, [])

  if (!data) return <Page />

  const exMap = new Map(data.exercises.map((e) => [e.id, e]))
  const rxMap = new Map(data.prescriptions.map((p) => [p.exerciseId, p]))
  const routineItems = [...(data.routine?.items ?? [])].sort((a, b) => a.order - b.order)
  const inRoutine = new Set(routineItems.map((i) => i.exerciseId))
  const library = data.exercises.filter((e) => !inRoutine.has(e.id)).sort((a, b) => a.nameEn.localeCompare(b.nameEn))

  return (
    <Page>
      <PageHeader title={t.exercises.title} />
      <div className="px-4">
        <SectionTitle>{data.routine?.name ?? t.exercises.routine}</SectionTitle>
        <div className="space-y-2">
          {routineItems.map((item, i) => {
            const ex = exMap.get(item.exerciseId)
            if (!ex) return null
            return <ExerciseRow key={item.exerciseId} ex={ex} index={i} rx={rxMap.get(ex.id)} />
          })}
        </div>
        {routineItems.length === 0 && (
          <EmptyState icon={<Icon name="book" />} title={t.today.noRoutine} />
        )}

        {library.length > 0 && (
          <>
            <SectionTitle>{t.exercises.library}</SectionTitle>
            <div className="space-y-2">
              {library.map((ex) => (
                <ExerciseRow key={ex.id} ex={ex} rx={rxMap.get(ex.id)} />
              ))}
            </div>
          </>
        )}
      </div>
    </Page>
  )
}
