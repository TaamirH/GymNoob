import { forwardRef, useState } from 'react'
import type { Effort, Exercise, WorkoutItem, WorkoutSet } from '@/db/types'
import { useT } from '@/i18n'
import { Card } from '@/components/Card'
import { Icon } from '@/components/Icon'
import { IconButton } from '@/components/Button'
import { Stepper } from '@/components/Stepper'
import { NumPad } from '@/components/NumPad'
import { EffortChips } from './EffortChips'
import { fmtKg } from '@/lib/format'
import { haptics } from '@/lib/haptics'

interface Draft {
  w: number | null
  r: number
}

interface Props {
  index: number
  item: WorkoutItem
  exercise: Exercise
  sets: WorkoutSet[]
  collapsed: boolean
  onToggle: () => void
  onLog: (setNumber: number, weightKg: number, reps: number) => Promise<void>
  onUpdateSet: (id: string, patch: { effort?: Effort; weightKg?: number; reps?: number }) => void
  onDeleteSet: (id: string) => void
  onGuide: () => void
}

function quickWeights(current: number | null, inc: number): number[] {
  if (current === null) return [10, 15, 20, 25, 30, 40, 50, 60, 80]
  const out = [current - 2 * inc, current - inc, current + inc, current + 2 * inc].filter((v) => v >= 0)
  return [...new Set(out)]
}

export const ExerciseCard = forwardRef<HTMLDivElement, Props>(function ExerciseCard(
  { index, item, exercise, sets, collapsed, onToggle, onLog, onUpdateSet, onDeleteSet, onGuide },
  ref,
) {
  const t = useT()
  const [drafts, setDrafts] = useState<Record<number, Draft>>({})
  const [editing, setEditing] = useState<Record<number, boolean>>({})
  const [extraRows, setExtraRows] = useState(0)
  const [pad, setPad] = useState<{ setNumber: number; field: 'w' | 'r' } | null>(null)
  const [busy, setBusy] = useState<number | null>(null)

  const inc = exercise.incrementKg || 5
  const logged = new Map(sets.map((s) => [s.setNumber, s]))
  const maxLogged = sets.reduce((m, s) => Math.max(m, s.setNumber), 0)
  const rowCount = Math.max(item.sets + extraRows, maxLogged)
  const loggedCount = sets.length
  const complete = loggedCount >= item.sets

  const defaultsFor = (n: number): Draft => {
    const s = logged.get(n)
    if (s) return { w: s.weightKg, r: s.reps }
    const prev = sets.filter((x) => x.setNumber < n).sort((a, b) => b.setNumber - a.setNumber)[0]
    return { w: prev ? prev.weightKg : item.prescribedWeightKg, r: item.prescribedReps[n - 1] ?? item.minReps }
  }
  const draftFor = (n: number): Draft => drafts[n] ?? defaultsFor(n)
  const setDraft = (n: number, patch: Partial<Draft>) => setDrafts((d) => ({ ...d, [n]: { ...draftFor(n), ...patch } }))

  const confirm = async (n: number) => {
    const d = draftFor(n)
    if (d.w === null || busy !== null) return
    setBusy(n)
    try {
      await onLog(n, d.w, d.r)
      setEditing((e) => ({ ...e, [n]: false }))
      setDrafts((dr) => {
        const next = { ...dr }
        delete next[n]
        return next
      })
    } finally {
      setBusy(null)
    }
  }

  const startEdit = (n: number) => {
    haptics.tap()
    setDrafts((d) => ({ ...d, [n]: defaultsFor(n) }))
    setEditing((e) => ({ ...e, [n]: true }))
  }

  const removeLast = () => {
    const last = logged.get(rowCount)
    haptics.tap()
    if (last) onDeleteSet(last.id)
    else if (rowCount > item.sets) setExtraRows((x) => x - 1)
  }

  const padDraft = pad ? draftFor(pad.setNumber) : null
  const firstWeightMissing = item.prescribedWeightKg === null && sets.length === 0

  const summary = complete
    ? `${fmtKg(sets[0]?.weightKg)} ${t.common.kg} · ${[...sets].sort((a, b) => a.setNumber - b.setNumber).map((s) => s.reps).join(', ')}`
    : null

  return (
    <Card ref={ref} className={`overflow-hidden scroll-mt-24 ${complete && collapsed ? 'opacity-90' : ''}`}>
      <button type="button" onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3.5 text-start">
        <div
          className={`num w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
            complete ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-muted'
          }`}
        >
          {complete ? <Icon name="check" size={16} strokeWidth={3} /> : index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold leading-tight truncate">{exercise.nameEn}</div>
          <div className="text-xs text-muted truncate">
            {collapsed && summary ? (
              <span className="num">{summary}</span>
            ) : (
              <>
                {item.sets} × {t.workout.target(item.minReps, item.maxReps)}
                {exercise.isAssisted && <span className="ms-2 text-info">{t.common.assisted}</span>}
              </>
            )}
          </div>
        </div>
        <IconButton
          icon="info"
          label={t.workout.guide}
          size={36}
          iconSize={20}
          className="text-muted"
          onClick={(e) => {
            e.stopPropagation()
            onGuide()
          }}
        />
        <Icon name="chevron-down" size={18} className={`text-muted transition-transform ${collapsed ? '-rotate-90 rtl:rotate-90' : ''}`} />
      </button>

      {!collapsed && (
        <div className="px-3 pb-3 space-y-2">
          {firstWeightMissing && (
            <div className="rounded-xl bg-accent-soft text-accent text-xs px-3 py-2 font-medium leading-relaxed">
              <span className="font-bold">{t.workout.pickWeight}.</span> {t.workout.pickWeightHint}
            </div>
          )}

          {Array.from({ length: rowCount }, (_, i) => i + 1).map((n) => {
            const s = logged.get(n)
            const isEditing = editing[n] === true
            if (s && !isEditing) {
              return (
                <div key={n} className="rounded-2xl bg-surface-2/60 px-2.5 py-2 fade-up">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => startEdit(n)} className="pressable flex-1 flex items-center gap-2 text-start min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-accent text-accent-ink flex items-center justify-center shrink-0">
                        <Icon name="check" size={14} strokeWidth={3} />
                      </span>
                      <span className="num text-lg font-bold">
                        {fmtKg(s.weightKg)}
                        <span className="text-[11px] text-muted font-medium ms-1">{t.common.kg}</span>
                      </span>
                      <span className="text-muted">×</span>
                      <span className="num text-lg font-bold">
                        {s.reps}
                        <span className="text-[11px] text-muted font-medium ms-1">{t.common.reps}</span>
                      </span>
                    </button>
                    <div className="w-[164px] shrink-0">
                      <EffortChips compact value={s.effort} onChange={(effort) => onUpdateSet(s.id, { effort })} />
                    </div>
                  </div>
                </div>
              )
            }
            const d = draftFor(n)
            return (
              <div key={n} className="flex items-center gap-1.5 fade-up">
                <div className="num w-7 h-7 rounded-lg bg-surface-2 flex items-center justify-center text-xs font-bold text-muted shrink-0">{n}</div>
                <Stepper
                  value={d.w}
                  step={inc}
                  unit={t.common.kg}
                  format={fmtKg}
                  width={56}
                  highlight={d.w === null}
                  onChange={(w) => setDraft(n, { w })}
                  onTap={() => setPad({ setNumber: n, field: 'w' })}
                />
                <Stepper value={d.r} step={1} min={0} max={99} width={44} onChange={(r) => setDraft(n, { r })} onTap={() => setPad({ setNumber: n, field: 'r' })} />
                <div className="flex-1" />
                <button
                  type="button"
                  disabled={d.w === null || busy === n}
                  onClick={() => confirm(n)}
                  aria-label={t.workout.logSet}
                  className={`pressable w-12 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    d.w === null ? 'bg-surface-2 text-muted' : 'bg-accent text-accent-ink shadow-[0_6px_18px_var(--accent-soft)]'
                  } disabled:opacity-50`}
                >
                  <Icon name="check" size={22} strokeWidth={3} />
                </button>
              </div>
            )
          })}

          <div className="flex items-center justify-between pt-1">
            <button type="button" onClick={() => setExtraRows((x) => x + 1)} className="pressable h-8 px-2 rounded-lg text-xs font-medium text-muted flex items-center gap-1">
              <Icon name="plus" size={14} /> {t.workout.addSet}
            </button>
            {rowCount > item.sets && (
              <button type="button" onClick={removeLast} className="pressable h-8 px-2 rounded-lg text-xs font-medium text-muted flex items-center gap-1">
                <Icon name="minus" size={14} /> {t.workout.removeSet}
              </button>
            )}
          </div>
        </div>
      )}

      <NumPad
        open={pad !== null}
        title={pad?.field === 'w' ? t.workout.weight : t.workout.reps}
        hint={pad?.field === 'w' && firstWeightMissing ? t.workout.pickWeightHint : exercise.nameEn}
        initial={pad ? (pad.field === 'w' ? padDraft?.w ?? null : padDraft?.r ?? null) : null}
        unit={pad?.field === 'w' ? t.common.kg : t.common.reps}
        allowDecimal={pad?.field === 'w'}
        max={pad?.field === 'w' ? 999 : 99}
        quick={pad?.field === 'w' ? quickWeights(padDraft?.w ?? null, inc) : undefined}
        onConfirm={(v) => pad && setDraft(pad.setNumber, pad.field === 'w' ? { w: v } : { r: Math.round(v) })}
        onClose={() => setPad(null)}
      />
    </Card>
  )
})
