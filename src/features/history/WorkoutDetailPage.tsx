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
import { EffortChips } from '@/features/workout/EffortChips'
import { deleteSet, deleteWorkout, updateSet } from '@/features/workout/workoutService'
import { fmtDuration, fmtKg } from '@/lib/format'
import { volume } from '@/logic/stats'
import type { WorkoutSet } from '@/db/types'

export default function WorkoutDetailPage() {
  const t = useT()
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [editing, setEditing] = useState<WorkoutSet | null>(null)
  const [pad, setPad] = useState<'w' | 'r' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const data = useLiveQuery(async () => {
    const workout = await db.workouts.get(id)
    if (!workout) return null
    const [items, sets, exercises, bw] = await Promise.all([
      db.workoutItems.where('workoutId').equals(id).toArray(),
      db.sets.where('workoutId').equals(id).toArray(),
      db.exercises.toArray(),
      db.bodyweight.orderBy('date').last(),
    ])
    items.sort((a, b) => a.order - b.order)
    return { workout, items, sets, exMap: new Map(exercises.map((e) => [e.id, e])), bw: bw?.kg ?? null }
  }, [id])

  if (data === undefined) return <Page />
  if (data === null) return <Page><PageHeader title="?" back="/history" /></Page>
  const { workout, items, sets, exMap, bw } = data
  const d = new Date(workout.startedAt)
  const title = `${t.time.dayNamesShort[d.getDay()]}, ${d.getDate()} ${t.time.monthsShort[d.getMonth()]}`
  const vol = volume(sets, exMap, bw)
  const inc = editing ? exMap.get(editing.exerciseId)?.incrementKg ?? 5 : 5

  const patchEditing = (patch: Partial<WorkoutSet>) => {
    if (!editing) return
    const next = { ...editing, ...patch }
    setEditing(next)
    void updateSet(editing.id, { weightKg: next.weightKg, reps: next.reps, effort: next.effort })
  }

  return (
    <Page>
      <PageHeader
        title={title}
        subtitle={workout.routineName}
        back="/history"
        action={<IconButton icon="trash" label={t.common.delete} className="text-danger" onClick={() => setConfirmDelete(true)} />}
      />
      <div className="px-4 space-y-4">
        <Card className="px-4 py-4 grid grid-cols-3 gap-3">
          <Stat label={t.summary.duration} value={workout.finishedAt ? fmtDuration(workout.finishedAt - workout.startedAt) : '—'} />
          <Stat label={t.summary.sets} value={sets.length} />
          <Stat label={t.summary.volume} value={vol > 0 ? Math.round(vol).toLocaleString() : '—'} sub={vol > 0 ? t.common.kg : undefined} accent />
        </Card>

        {items.map((item) => {
          const ex = exMap.get(item.exerciseId)
          const itemSets = sets.filter((s) => s.workoutItemId === item.id).sort((a, b) => a.setNumber - b.setNumber)
          if (!ex || itemSets.length === 0) return null
          return (
            <Card key={item.id} className="overflow-hidden">
              <div className="px-4 pt-3 pb-2 flex items-center gap-2">
                <div className="font-semibold flex-1 truncate">{ex.nameEn}</div>
                {item.prescribedWeightKg !== null && (
                  <div className="text-[11px] text-muted num">
                    {t.workout.target(item.minReps, item.maxReps)}
                  </div>
                )}
              </div>
              <div className="divide-y divide-line/60">
                {itemSets.map((s) => (
                  <button key={s.id} type="button" onClick={() => setEditing(s)} className="pressable w-full flex items-center gap-3 px-4 py-2.5 text-start">
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
              </div>
            </Card>
          )
        })}
      </div>

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={t.history.editSet} subtitle={editing ? `${exMap.get(editing.exerciseId)?.nameEn} · ${t.workout.setN(editing.setNumber)}` : undefined}>
        {editing && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{t.workout.weight}</div>
              <Stepper value={editing.weightKg} step={inc} unit={t.common.kg} format={fmtKg} width={64} onChange={(w) => patchEditing({ weightKg: w })} onTap={() => setPad('w')} />
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{t.workout.reps}</div>
              <Stepper value={editing.reps} step={1} max={99} width={64} onChange={(r) => patchEditing({ reps: r })} onTap={() => setPad('r')} />
            </div>
            <div>
              <div className="text-sm font-medium mb-2">{t.workout.effortQuestion}</div>
              <EffortChips value={editing.effort} onChange={(effort) => patchEditing({ effort })} />
            </div>
            <Button
              variant="danger"
              full
              icon="trash"
              onClick={() => {
                void deleteSet(editing.id)
                setEditing(null)
              }}
            >
              {t.history.deleteSet}
            </Button>
          </div>
        )}
      </Sheet>

      <NumPad
        open={pad !== null}
        title={pad === 'w' ? t.workout.weight : t.workout.reps}
        initial={editing ? (pad === 'w' ? editing.weightKg : editing.reps) : null}
        unit={pad === 'w' ? t.common.kg : t.common.reps}
        allowDecimal={pad === 'w'}
        max={pad === 'w' ? 999 : 99}
        onConfirm={(v) => patchEditing(pad === 'w' ? { weightKg: v } : { reps: Math.round(v) })}
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
