import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router'
import { db } from '@/db/db'
import { useT } from '@/i18n'
import { useSettings } from '@/hooks/useSettings'
import { Page, PageHeader } from '@/components/PageHeader'
import { Card, SectionTitle, EmptyState } from '@/components/Card'
import { Icon } from '@/components/Icon'
import { Button, IconButton } from '@/components/Button'
import { MuscleTag } from '@/components/MuscleTag'
import { NewExerciseSheet } from './NewExerciseSheet'
import { addToRoutine, moveInRoutine, removeFromRoutine } from './exerciseService'
import { fmtKg } from '@/lib/format'
import type { Exercise, Prescription } from '@/db/types'

function ExerciseRow({
  ex,
  index,
  rx,
  editing,
  isFirst,
  isLast,
  inRoutine,
}: {
  ex: Exercise
  index?: number
  rx?: Prescription
  editing: boolean
  isFirst?: boolean
  isLast?: boolean
  inRoutine: boolean
}) {
  const t = useT()
  const body = (
    <Card className="px-3 py-3 flex items-center gap-3">
      {index !== undefined && (
        <div className="num w-8 h-8 rounded-xl bg-surface-2 flex items-center justify-center text-sm font-bold text-muted shrink-0">{index + 1}</div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-semibold leading-tight truncate">{ex.nameEn}</div>
        <div className="text-sm text-muted truncate">
          <span dir="rtl" lang="he">
            {ex.nameHe}
          </span>
        </div>
        {!editing && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {ex.primaryMuscles.map((m) => (
              <MuscleTag key={m} muscle={m} />
            ))}
            {ex.isAssisted && <span className="inline-flex items-center h-6 px-2 rounded-full text-[11px] font-medium bg-info-soft text-info">{t.common.assisted}</span>}
          </div>
        )}
      </div>
      {editing ? (
        inRoutine ? (
          <div className="flex items-center gap-0.5 shrink-0">
            <IconButton icon="arrow-up" label={t.exercises.moveUp} size={36} iconSize={18} disabled={isFirst} onClick={() => void moveInRoutine(ex.id, -1)} />
            <IconButton icon="arrow-down" label={t.exercises.moveDown} size={36} iconSize={18} disabled={isLast} onClick={() => void moveInRoutine(ex.id, 1)} />
            <IconButton icon="x" label={t.exercises.removeFromRoutine} size={36} iconSize={18} className="text-danger" onClick={() => void removeFromRoutine(ex.id)} />
          </div>
        ) : (
          <Button size="sm" variant="primary" icon="plus" iconSize={16} onClick={() => void addToRoutine(ex.id)}>
            {t.common.add}
          </Button>
        )
      ) : (
        <>
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
        </>
      )}
    </Card>
  )
  if (editing) return body
  return (
    <Link to={`/exercises/${ex.id}`} className="pressable block">
      {body}
    </Link>
  )
}

export default function ExercisesPage() {
  const t = useT()
  const settings = useSettings()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [creating, setCreating] = useState(false)

  const data = useLiveQuery(async () => {
    const [routines, exercises, prescriptions] = await Promise.all([db.routines.toArray(), db.exercises.toArray(), db.prescriptions.toArray()])
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
      <PageHeader title={t.exercises.title} action={<IconButton icon="plus" label={t.exercises.newExercise} onClick={() => setCreating(true)} />} />
      <div className="px-4">
        <SectionTitle
          action={
            <button type="button" onClick={() => setEditing((e) => !e)} className="pressable text-sm font-semibold text-accent px-2 py-1 -me-2">
              {editing ? t.exercises.doneEditing : t.exercises.editRoutine}
            </button>
          }
        >
          {data.routine?.name ?? t.exercises.routine}
        </SectionTitle>
        <div className="space-y-2">
          {routineItems.map((item, i) => {
            const ex = exMap.get(item.exerciseId)
            if (!ex) return null
            return <ExerciseRow key={item.exerciseId} ex={ex} index={i} rx={rxMap.get(ex.id)} editing={editing} isFirst={i === 0} isLast={i === routineItems.length - 1} inRoutine />
          })}
        </div>
        {routineItems.length === 0 && <EmptyState icon={<Icon name="book" />} title={t.today.noRoutine} />}

        {library.length > 0 && (
          <>
            <SectionTitle>{t.exercises.library}</SectionTitle>
            <div className="space-y-2">
              {library.map((ex) => (
                <ExerciseRow key={ex.id} ex={ex} rx={rxMap.get(ex.id)} editing={editing} inRoutine={false} />
              ))}
            </div>
          </>
        )}

        <Button full variant="outline" icon="plus" className="mt-6" onClick={() => setCreating(true)}>
          {t.exercises.newExercise}
        </Button>
      </div>

      <NewExerciseSheet open={creating} onClose={() => setCreating(false)} defaultIncrement={settings.defaultIncrementKg} onCreated={(id) => navigate(`/exercises/${id}`)} />
    </Page>
  )
}
