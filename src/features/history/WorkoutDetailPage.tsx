import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams } from 'react-router'
import { db } from '@/db/db'
import { useT } from '@/i18n'
import { Page, PageHeader } from '@/components/PageHeader'
import { Card, Stat } from '@/components/Card'
import { Icon } from '@/components/Icon'
import { IconButton, Button } from '@/components/Button'
import { ConfirmDialog, Sheet } from '@/components/Sheet'
import { NumPad } from '@/components/NumPad'
import { Stepper } from '@/components/Stepper'
import { MuscleTag } from '@/components/MuscleTag'
import { EffortChips } from '@/features/workout/EffortChips'
import { addExerciseToWorkout, appendSet, deleteSet, deleteWorkout, reevaluateExercise, updateSet } from '@/features/workout/workoutService'
import { fmtDuration, fmtKg } from '@/lib/format'
import { haptics } from '@/lib/haptics'
import { volume } from '@/logic/stats'
import type { Effort, WorkoutItem, WorkoutSet } from '@/db/types'

interface EditState {
  item: WorkoutItem
  /** null when adding a new set */
  set: WorkoutSet | null
  w: number
  r: number
  e: Effort
}

export default function WorkoutDetailPage() {
  const t = useT()
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [editing, setEditing] = useState<EditState | null>(null)
  const [pad, setPad] = useState<'w' | 'r' | null>(null)
  const [picking, setPicking] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const data = useLiveQuery(async () => {
    const workout = await db.workouts.get(id)
    if (!workout) return null
    const [items, sets, exercises, bw, routines] = await Promise.all([
      db.workoutItems.where('workoutId').equals(id).toArray(),
      db.sets.where('workoutId').equals(id).toArray(),
      db.exercises.toArray(),
      db.bodyweight.orderBy('date').last(),
      db.routines.toArray(),
    ])
    items.sort((a, b) => a.order - b.order)
    return { workout, items, sets, exercises, exMap: new Map(exercises.map((e) => [e.id, e])), bw: bw?.kg ?? null, routine: routines[0] }
  }, [id])

  if (data === undefined) return <Page />
  if (data === null)
    return (
      <Page>
        <PageHeader title="?" back="/history" />
      </Page>
    )
  const { workout, items, sets, exercises, exMap, bw, routine } = data
  const d = new Date(workout.startedAt)
  const title = `${t.time.dayNamesShort[d.getDay()]}, ${d.getDate()} ${t.time.monthsShort[d.getMonth()]}`
  const vol = volume(sets, exMap, bw)
  const inc = editing ? (exMap.get(editing.item.exerciseId)?.incrementKg ?? 5) : 5
  const completed = workout.status === 'completed'

  const afterChange = (exerciseId: string) => {
    if (completed) void reevaluateExercise(exerciseId)
  }

  const openExisting = (item: WorkoutItem, s: WorkoutSet) => setEditing({ item, set: s, w: s.weightKg, r: s.reps, e: s.effort })

  const openNew = (item: WorkoutItem) => {
    const last = sets.filter((s) => s.workoutItemId === item.id).sort((a, b) => b.setNumber - a.setNumber)[0]
    setEditing({ item, set: null, w: last?.weightKg ?? item.prescribedWeightKg ?? 0, r: last?.reps ?? item.minReps, e: 'ok' })
    if (!last && item.prescribedWeightKg === null) setPad('w')
  }

  const patch = (p: Partial<Pick<EditState, 'w' | 'r' | 'e'>>) => {
    if (!editing) return
    const next = { ...editing, ...p }
    setEditing(next)
    if (next.set) {
      void updateSet(next.set.id, { weightKg: next.w, reps: next.r, effort: next.e }).then(() => afterChange(next.item.exerciseId))
    }
  }

  const saveNew = async () => {
    if (!editing || editing.set) return
    await appendSet(workout.id, editing.item, editing.w, editing.r, editing.e)
    haptics.confirm()
    afterChange(editing.item.exerciseId)
    setEditing(null)
  }

  const removeSet = async () => {
    if (!editing?.set) return
    const exerciseId = editing.item.exerciseId
    await deleteSet(editing.set.id)
    setEditing(null)
    afterChange(exerciseId)
  }

  const addExercise = async (exerciseId: string) => {
    setPicking(false)
    const itemId = await addExerciseToWorkout(workout.id, exerciseId)
    haptics.tap()
    const item = await db.workoutItems.get(itemId)
    if (item) openNew(item)
  }

  const inWorkout = new Set(items.map((i) => i.exerciseId))
  const routineOrder = new Map((routine?.items ?? []).map((i) => [i.exerciseId, i.order]))
  const candidates = exercises.filter((e) => !inWorkout.has(e.id)).sort((a, b) => (routineOrder.get(a.id) ?? 999) - (routineOrder.get(b.id) ?? 999) || a.nameEn.localeCompare(b.nameEn))

  return (
    <Page>
      <PageHeader title={title} subtitle={workout.routineName} back="/history" action={<IconButton icon="trash" label={t.common.delete} className="text-danger" onClick={() => setConfirmDelete(true)} />} />
      <div className="px-4 space-y-4">
        <Card className="px-4 py-4 grid grid-cols-3 gap-3">
          <Stat label={t.summary.duration} value={workout.finishedAt ? fmtDuration(workout.finishedAt - workout.startedAt) : '—'} />
          <Stat label={t.summary.sets} value={sets.length} />
          <Stat label={t.summary.volume} value={vol > 0 ? Math.round(vol).toLocaleString() : '—'} sub={vol > 0 ? t.common.kg : undefined} accent />
        </Card>

        {items.map((item) => {
          const ex = exMap.get(item.exerciseId)
          const itemSets = sets.filter((s) => s.workoutItemId === item.id).sort((a, b) => a.setNumber - b.setNumber)
          if (!ex) return null
          return (
            <Card key={item.id} className="overflow-hidden">
              <div className="px-4 pt-3 pb-2 flex items-center gap-2">
                <div className="font-semibold flex-1 truncate">{ex.nameEn}</div>
                <div className="text-[11px] text-muted num">{t.workout.target(item.minReps, item.maxReps)}</div>
              </div>
              <div className="divide-y divide-line/60">
                {itemSets.map((s) => (
                  <button key={s.id} type="button" onClick={() => openExisting(item, s)} className="pressable w-full flex items-center gap-3 px-4 py-2.5 text-start">
                    <span className="num w-6 text-xs font-bold text-muted">{s.setNumber}</span>
                    <span className="num font-bold">
                      {fmtKg(s.weightKg)} <span className="text-[11px] text-muted font-medium">{t.common.kg}</span>
                    </span>
                    <span className="text-muted">×</span>
                    <span className="num font-bold">{s.reps}</span>
                    <span className="flex-1" />
                    <span className="text-xs text-muted">{t.effort[s.effort]}</span>
                    <Icon name="chevron-right" size={16} className="text-muted rtl:rotate-180" />
                  </button>
                ))}
                {itemSets.length === 0 && <div className="px-4 py-2 text-xs text-muted">{t.history.noSets}</div>}
                <button type="button" onClick={() => openNew(item)} className="pressable w-full flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-accent">
                  <Icon name="plus" size={14} /> {t.workout.addSet}
                </button>
              </div>
            </Card>
          )
        })}

        <Button full variant="outline" icon="plus" onClick={() => setPicking(true)}>
          {t.history.addExercise}
        </Button>
      </div>

      <Sheet open={picking} onClose={() => setPicking(false)} title={t.history.pickExercise}>
        {candidates.length === 0 ? (
          <div className="text-sm text-muted py-4">{t.history.allAdded}</div>
        ) : (
          <div className="space-y-2">
            {candidates.map((ex) => (
              <button key={ex.id} type="button" onClick={() => void addExercise(ex.id)} className="pressable w-full text-start">
                <Card className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{ex.nameEn}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {ex.primaryMuscles.map((m) => (
                        <MuscleTag key={m} muscle={m} />
                      ))}
                    </div>
                  </div>
                  <Icon name="plus" size={18} className="text-accent" />
                </Card>
              </button>
            ))}
          </div>
        )}
      </Sheet>

      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.set ? t.history.editSet : t.history.newSet}
        subtitle={editing ? `${exMap.get(editing.item.exerciseId)?.nameEn} · ${editing.set ? t.workout.setN(editing.set.setNumber) : t.history.newSet}` : undefined}
      >
        {editing && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{t.workout.weight}</div>
              <Stepper value={editing.w} step={inc} unit={t.common.kg} format={fmtKg} width={64} onChange={(w) => patch({ w })} onTap={() => setPad('w')} />
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{t.workout.reps}</div>
              <Stepper value={editing.r} step={1} max={99} width={64} onChange={(r) => patch({ r })} onTap={() => setPad('r')} />
            </div>
            <div>
              <div className="text-sm font-medium mb-2">{t.workout.effortQuestion}</div>
              <EffortChips value={editing.e} onChange={(e) => patch({ e })} />
            </div>
            {editing.set ? (
              <Button variant="danger" full icon="trash" onClick={() => void removeSet()}>
                {t.history.deleteSet}
              </Button>
            ) : (
              <Button variant="primary" size="lg" full icon="check" disabled={editing.w <= 0 || editing.r <= 0} onClick={() => void saveNew()}>
                {t.common.save}
              </Button>
            )}
          </div>
        )}
      </Sheet>

      <NumPad
        open={pad !== null}
        title={pad === 'w' ? t.workout.weight : t.workout.reps}
        initial={editing ? (pad === 'w' ? (editing.w > 0 ? editing.w : null) : editing.r) : null}
        unit={pad === 'w' ? t.common.kg : t.common.reps}
        allowDecimal={pad === 'w'}
        max={pad === 'w' ? 999 : 99}
        quick={pad === 'w' && editing && editing.w <= 0 ? [10, 15, 20, 25, 30, 40, 50, 60, 80] : undefined}
        onConfirm={(v) => patch(pad === 'w' ? { w: v } : { r: Math.round(v) })}
        onClose={() => setPad(null)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title={t.common.delete}
        message={t.history.deleteConfirm}
        confirmLabel={t.common.delete}
        danger
        onConfirm={() => {
          setConfirmDelete(false)
          void deleteWorkout(id).then(() => navigate('/history', { replace: true }))
        }}
        onClose={() => setConfirmDelete(false)}
      />
    </Page>
  )
}
