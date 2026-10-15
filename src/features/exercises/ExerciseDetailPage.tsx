import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams } from 'react-router'
import { db } from '@/db/db'
import { useT } from '@/i18n'
import { Page, PageHeader } from '@/components/PageHeader'
import { Card, SectionTitle, Stat } from '@/components/Card'
import { Button, IconButton } from '@/components/Button'
import { Stepper } from '@/components/Stepper'
import { NumPad } from '@/components/NumPad'
import { Row } from '@/components/Toggle'
import { ConfirmDialog } from '@/components/Sheet'
import { MuscleTag } from '@/components/MuscleTag'
import { GuideView } from './GuideView'
import { GuideEditorSheet } from './GuideEditorSheet'
import { addToRoutine, deleteExercise, removeFromRoutine, updateExerciseTuning } from './exerciseService'
import { setPrescriptionWeight } from '@/features/workout/workoutService'
import { fmtKg } from '@/lib/format'
import { haptics } from '@/lib/haptics'

export default function ExerciseDetailPage() {
  const t = useT()
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [weightPad, setWeightPad] = useState(false)
  const [editGuide, setEditGuide] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const data = useLiveQuery(async () => {
    const [ex, rx, sets, routines] = await Promise.all([
      db.exercises.get(id),
      db.prescriptions.get(id),
      db.sets.where('exerciseId').equals(id).toArray(),
      db.routines.toArray(),
    ])
    const item = routines[0]?.items.find((i) => i.exerciseId === id)
    const sessions = new Set(sets.map((s) => s.workoutId)).size
    return { ex, rx, sessions, item }
  }, [id])

  if (!data) return <Page />
  const { ex, rx, sessions, item } = data
  if (!ex) {
    return (
      <Page>
        <PageHeader title="?" back="/exercises" />
      </Page>
    )
  }

  const flash = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2000)
  }

  const g = ex.guideHe
  const hasGuide = g.setup.length + g.steps.length + g.mistakes.length + g.cues.length > 0
  const inRoutine = !!item
  const sets = item?.sets ?? rx?.sets ?? 2
  const minReps = item?.minReps ?? ex.defaultMinReps
  const maxReps = item?.maxReps ?? ex.defaultMaxReps
  const restSec = item?.restSec ?? ex.defaultRestSec

  return (
    <Page>
      <PageHeader
        title={ex.nameEn}
        subtitle={
          <span dir="rtl" lang="he">
            {ex.nameHe}
          </span>
        }
        back="/exercises"
        action={ex.isCustom ? <IconButton icon="trash" label={t.exercises.deleteExercise} className="text-danger" onClick={() => setConfirmDelete(true)} /> : undefined}
      />
      <div className="px-4 space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {ex.primaryMuscles.map((m) => (
            <MuscleTag key={m} muscle={m} />
          ))}
          {ex.secondaryMuscles.map((m) => (
            <MuscleTag key={m} muscle={m} secondary />
          ))}
          {ex.isCustom && <span className="inline-flex items-center h-6 px-2 rounded-full text-[11px] font-medium bg-surface-2 text-muted">{t.exercises.custom}</span>}
        </div>

        {ex.isAssisted && <div className="rounded-2xl bg-info-soft text-info text-sm px-4 py-3 font-medium">{t.common.assistedHint}</div>}

        <Card className="px-4 py-4 grid grid-cols-3 gap-3">
          <button type="button" onClick={() => setWeightPad(true)} className="pressable text-start">
            <Stat label={t.exercises.nextWeight} value={rx && rx.weightKg !== null ? fmtKg(rx.weightKg) : '—'} sub={rx && rx.weightKg !== null ? `${t.common.kg} · ${t.common.edit}` : t.exercises.setWeight} accent />
          </button>
          <Stat label={t.exercises.repRange} value={`${minReps}–${maxReps}`} sub={`${sets} ${t.common.sets}`} />
          <Stat label={t.progress.sessions} value={sessions} />
        </Card>

        {ex.mediaUrl && (
          <Card className="overflow-hidden">
            <img src={ex.mediaUrl} alt={ex.nameEn} className="w-full aspect-square object-cover bg-surface-2" loading="lazy" />
            {ex.attribution && <div className="px-4 py-2 text-[11px] text-muted">{ex.attribution}</div>}
          </Card>
        )}

        <SectionTitle action={<IconButton icon="edit" label={t.exercises.editGuide} size={32} iconSize={16} onClick={() => setEditGuide(true)} />}>{t.exercises.guide}</SectionTitle>
        <Card className="px-4 py-5">
          {hasGuide ? (
            <GuideView guide={g} />
          ) : (
            <div className="text-center py-4">
              <div className="text-muted text-sm mb-3">{t.exercises.noGuide}</div>
              <Button size="sm" icon="edit" iconSize={16} onClick={() => setEditGuide(true)}>
                {t.exercises.editGuide}
              </Button>
            </div>
          )}
        </Card>

        <SectionTitle>{t.exercises.settings}</SectionTitle>
        <Card className="divide-y divide-line/60">
          <Row label={t.exercises.increment}>
            <Stepper value={ex.incrementKg} step={2.5} min={0.5} max={50} unit={t.common.kg} format={fmtKg} width={56} onChange={(v) => updateExerciseTuning(ex.id, { incrementKg: v })} />
          </Row>
          <Row label={t.exercises.restSec}>
            <Stepper value={restSec} step={15} min={15} max={600} unit={t.common.sec} width={56} onChange={(v) => updateExerciseTuning(ex.id, { restSec: v })} />
          </Row>
          <Row label={t.exercises.setsPerSession}>
            <Stepper value={sets} step={1} min={1} max={6} width={44} onChange={(v) => updateExerciseTuning(ex.id, { sets: v })} />
          </Row>
          <Row label={t.exercises.repRange}>
            <div className="flex items-center gap-1.5">
              <Stepper value={minReps} step={1} min={1} max={maxReps - 1} width={40} onChange={(v) => updateExerciseTuning(ex.id, { minReps: v })} />
              <span className="text-muted">–</span>
              <Stepper value={maxReps} step={1} min={minReps + 1} max={50} width={40} onChange={(v) => updateExerciseTuning(ex.id, { maxReps: v })} />
            </div>
          </Row>
          <Row label={inRoutine ? t.exercises.inRoutine : t.exercises.notInRoutine}>
            {inRoutine ? (
              <Button size="sm" variant="outline" onClick={() => void removeFromRoutine(ex.id)}>
                {t.exercises.removeFromRoutine}
              </Button>
            ) : (
              <Button size="sm" variant="primary" icon="plus" iconSize={16} onClick={() => void addToRoutine(ex.id)}>
                {t.exercises.addToRoutine}
              </Button>
            )}
          </Row>
        </Card>
      </div>

      <NumPad
        open={weightPad}
        title={t.exercises.nextWeight}
        hint={ex.nameEn}
        initial={rx?.weightKg ?? null}
        unit={t.common.kg}
        allowDecimal
        max={999}
        onConfirm={(v) => {
          void setPrescriptionWeight(ex.id, v)
          haptics.success()
          flash(t.exercises.saved)
        }}
        onClose={() => setWeightPad(false)}
      />

      <GuideEditorSheet open={editGuide} exercise={ex} onClose={() => setEditGuide(false)} onSaved={() => flash(t.exercises.saved)} />

      <ConfirmDialog
        open={confirmDelete}
        title={t.exercises.deleteExercise}
        message={t.exercises.deleteExerciseConfirm}
        confirmLabel={t.common.delete}
        danger
        onConfirm={() => {
          setConfirmDelete(false)
          void deleteExercise(ex.id).then(() => navigate('/exercises', { replace: true }))
        }}
        onClose={() => setConfirmDelete(false)}
      />

      {toast && (
        <div className="fixed inset-x-0 bottom-[calc(84px+env(safe-area-inset-bottom))] z-50 flex justify-center pointer-events-none">
          <div className="bg-surface-3 text-ink text-sm font-medium px-4 py-2 rounded-full shadow-lg fade-up">{toast}</div>
        </div>
      )}
    </Page>
  )
}
