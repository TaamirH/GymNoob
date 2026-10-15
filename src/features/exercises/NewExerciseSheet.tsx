import { useEffect, useState } from 'react'
import { Sheet } from '@/components/Sheet'
import { Button } from '@/components/Button'
import { Stepper } from '@/components/Stepper'
import { Toggle, Row } from '@/components/Toggle'
import { useT } from '@/i18n'
import { MUSCLE_GROUPS, type MuscleGroup } from '@/db/types'
import { createExercise } from './exerciseService'
import { fmtKg } from '@/lib/format'
import { haptics } from '@/lib/haptics'

function MuscleChips({ value, onChange }: { value: MuscleGroup[]; onChange: (v: MuscleGroup[]) => void }) {
  const t = useT()
  return (
    <div className="flex flex-wrap gap-1.5">
      {MUSCLE_GROUPS.map((m) => {
        const on = value.includes(m)
        return (
          <button
            key={m}
            type="button"
            onClick={() => {
              haptics.tap()
              onChange(on ? value.filter((x) => x !== m) : [...value, m])
            }}
            className={`pressable h-8 px-3 rounded-full text-xs font-medium ${on ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-ink-2'}`}
          >
            {t.muscles[m]}
          </button>
        )
      })}
    </div>
  )
}

export function NewExerciseSheet({ open, onClose, onCreated, defaultIncrement }: { open: boolean; onClose: () => void; onCreated?: (id: string) => void; defaultIncrement: number }) {
  const t = useT()
  const [nameEn, setNameEn] = useState('')
  const [nameHe, setNameHe] = useState('')
  const [primary, setPrimary] = useState<MuscleGroup[]>([])
  const [secondary, setSecondary] = useState<MuscleGroup[]>([])
  const [assisted, setAssisted] = useState(false)
  const [increment, setIncrement] = useState(defaultIncrement)
  const [toRoutine, setToRoutine] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setNameEn('')
    setNameHe('')
    setPrimary([])
    setSecondary([])
    setAssisted(false)
    setIncrement(defaultIncrement)
    setToRoutine(true)
    setError(null)
  }, [open, defaultIncrement])

  const save = async () => {
    if (!nameEn.trim() && !nameHe.trim()) {
      setError(t.exercises.nameRequired)
      return
    }
    const id = await createExercise({
      nameEn: nameEn.trim() || nameHe.trim(),
      nameHe: nameHe.trim() || nameEn.trim(),
      primaryMuscles: primary,
      secondaryMuscles: secondary.filter((m) => !primary.includes(m)),
      equipment: assisted ? 'assisted-machine' : 'machine',
      isAssisted: assisted,
      incrementKg: increment,
      addToRoutine: toRoutine,
    })
    haptics.success()
    onCreated?.(id)
    onClose()
  }

  const input = 'w-full h-11 px-3 rounded-xl bg-surface-2 text-ink outline-none focus:ring-2 ring-accent/40'

  return (
    <Sheet open={open} onClose={onClose} title={t.exercises.newExercise}>
      <div className="space-y-4">
        <label className="block">
          <div className="text-sm font-medium mb-1.5">{t.exercises.name}</div>
          <input className={input} value={nameEn} onChange={(e) => setNameEn(e.target.value)} autoComplete="off" />
        </label>
        <label className="block">
          <div className="text-sm font-medium mb-1.5">{t.exercises.nameHe}</div>
          <input className={input} dir="rtl" lang="he" value={nameHe} onChange={(e) => setNameHe(e.target.value)} autoComplete="off" />
        </label>
        <div>
          <div className="text-sm font-medium mb-1.5">{t.exercises.primary}</div>
          <MuscleChips value={primary} onChange={setPrimary} />
        </div>
        <div>
          <div className="text-sm font-medium mb-1.5">{t.exercises.secondary}</div>
          <MuscleChips value={secondary} onChange={setSecondary} />
        </div>
        <div className="rounded-2xl bg-surface-2/60 divide-y divide-line/60 -mx-1">
          <Row label={t.exercises.isAssisted} hint={t.common.assistedHint}>
            <Toggle checked={assisted} onChange={setAssisted} label={t.exercises.isAssisted} />
          </Row>
          <Row label={t.exercises.increment}>
            <Stepper value={increment} step={2.5} min={0.5} max={50} unit={t.common.kg} format={fmtKg} width={56} onChange={setIncrement} />
          </Row>
          <Row label={t.exercises.addToRoutineToggle}>
            <Toggle checked={toRoutine} onChange={setToRoutine} label={t.exercises.addToRoutineToggle} />
          </Row>
        </div>
        {error && <div className="text-sm text-danger">{error}</div>}
        <Button variant="primary" size="lg" full onClick={() => void save()}>
          {t.common.save}
        </Button>
      </div>
    </Sheet>
  )
}
