import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams } from 'react-router'
import { db } from '@/db/db'
import { useT } from '@/i18n'
import { useSettings } from '@/hooks/useSettings'
import { Button } from '@/components/Button'
import { Card, SectionTitle, Stat } from '@/components/Card'
import { Icon } from '@/components/Icon'
import { NumPad } from '@/components/NumPad'
import { describeChange, toneClass } from './progressionText'
import { detectPRs, volume } from '@/logic/stats'
import { fmtDuration, fmtKg, isoDate, startOfWeek } from '@/lib/format'
import { haptics } from '@/lib/haptics'

export default function SummaryPage() {
  const t = useT()
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const settings = useSettings()
  const [bwPad, setBwPad] = useState(false)
  const [bwSaved, setBwSaved] = useState(false)

  const data = useLiveQuery(async () => {
    const workout = await db.workouts.get(id)
    if (!workout) return null
    const [items, sets, exercises, prescriptions] = await Promise.all([
      db.workoutItems.where('workoutId').equals(id).toArray(),
      db.sets.where('workoutId').equals(id).toArray(),
      db.exercises.toArray(),
      db.prescriptions.toArray(),
    ])
    items.sort((a, b) => a.order - b.order)
    const exIds = items.map((i) => i.exerciseId)
    const previousAll = (await db.sets.where('exerciseId').anyOf(exIds).toArray()).filter((s) => s.workoutId !== id)
    const prevWorkouts = await db.workouts.bulkGet([...new Set(previousAll.map((s) => s.workoutId))])
    const completed = new Set(prevWorkouts.filter((w) => w?.status === 'completed').map((w) => w!.id))
    const previous = previousAll.filter((s) => completed.has(s.workoutId))
    const latestBw = await db.bodyweight.orderBy('date').last()
    const weekStart = isoDate(startOfWeek(new Date(), settings.weekStartsOn))
    const bwThisWeek = await db.bodyweight.where('date').aboveOrEqual(weekStart).count()
    return {
      workout,
      items,
      sets,
      exMap: new Map(exercises.map((e) => [e.id, e])),
      rxMap: new Map(prescriptions.map((p) => [p.exerciseId, p])),
      previous,
      latestBw: latestBw?.kg ?? null,
      bwThisWeek,
    }
  }, [id, settings.weekStartsOn])

  if (data === undefined) return <div className="h-full" />
  if (data === null) {
    navigate('/', { replace: true })
    return null
  }

  const { workout, items, sets, exMap, rxMap, previous, latestBw, bwThisWeek } = data
  const duration = (workout.finishedAt ?? Date.now()) - workout.startedAt
  const vol = volume(sets, exMap, latestBw)
  const prs = detectPRs(sets, previous, exMap)
  const loggedExerciseIds = new Set(sets.map((s) => s.exerciseId))

  const saveBodyweight = async (kg: number) => {
    const date = isoDate()
    const existing = await db.bodyweight.where('date').equals(date).first()
    if (existing?.id !== undefined) await db.bodyweight.update(existing.id, { kg })
    else await db.bodyweight.add({ date, kg })
    haptics.success()
    setBwSaved(true)
  }

  return (
    <div className="mx-auto max-w-lg min-h-full pb-[calc(32px+env(safe-area-inset-bottom))]">
      <div className="pt-safe px-4 pt-10 pb-6 text-center fade-up">
        <div className="w-20 h-20 mx-auto rounded-full bg-accent text-accent-ink flex items-center justify-center pop shadow-[0_12px_40px_var(--accent-soft)]">
          <Icon name="trophy" size={36} strokeWidth={2.2} />
        </div>
        <h1 className="text-3xl font-bold mt-5 tracking-tight">{t.summary.title}</h1>
        <div className="text-muted mt-1">{workout.routineName}</div>
      </div>

      <div className="px-4 space-y-4">
        <Card className="px-4 py-4 grid grid-cols-3 gap-3 fade-up">
          <Stat label={t.summary.duration} value={fmtDuration(duration)} />
          <Stat label={t.summary.sets} value={sets.length} />
          <Stat label={t.summary.volume} value={vol > 0 ? Math.round(vol).toLocaleString() : '—'} sub={vol > 0 ? t.common.kg : undefined} accent />
        </Card>

        {prs.length > 0 && (
          <>
            <SectionTitle>{t.summary.prs}</SectionTitle>
            <div className="space-y-2">
              {prs.map((pr) => {
                const ex = exMap.get(pr.exerciseId)
                return (
                  <Card key={`${pr.exerciseId}-${pr.kind}`} className="px-4 py-3 flex items-center gap-3 border-accent/40 fade-up">
                    <div className="w-10 h-10 rounded-2xl bg-accent-soft text-accent flex items-center justify-center shrink-0">
                      <Icon name="trophy" size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{ex?.nameEn}</div>
                      <div className="text-xs text-muted">{pr.kind === 'weight' ? t.summary.weightPr : t.summary.repsPr}</div>
                    </div>
                    <div className="text-end">
                      <div className="num font-bold text-lg leading-tight">
                        {fmtKg(pr.weightKg)} <span className="text-xs text-muted font-medium">{t.common.kg}</span> × {pr.reps}
                      </div>
                      {pr.previous && <div className="text-[11px] text-muted num">{t.summary.was(fmtKg(pr.previous.weightKg), pr.previous.reps)}</div>}
                    </div>
                  </Card>
                )
              })}
            </div>
          </>
        )}

        <SectionTitle>{t.summary.nextTime}</SectionTitle>
        <Card className="divide-y divide-line/60 fade-up">
          {items.map((item) => {
            const ex = exMap.get(item.exerciseId)
            const rx = rxMap.get(item.exerciseId)
            if (!ex || !rx) return null
            const logged = loggedExerciseIds.has(item.exerciseId)
            const d = logged ? describeChange(t, ex, rx) : null
            return (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{ex.nameEn}</div>
                  <div className="text-xs text-muted truncate">{d?.reason ?? '—'}</div>
                </div>
                <div className="text-end shrink-0">
                  <div className="num font-bold text-lg leading-tight">
                    {fmtKg(rx.weightKg)} <span className="text-xs text-muted font-medium">{t.common.kg}</span>
                  </div>
                  {d && <span className={`inline-block mt-1 px-2 h-5 leading-5 rounded-full text-[11px] font-semibold num ${toneClass[d.tone]}`}>{d.label}</span>}
                </div>
              </div>
            )
          })}
        </Card>

        {bwThisWeek === 0 && (
          <Card className="px-4 py-4 flex items-center gap-3 fade-up">
            <div className="w-10 h-10 rounded-2xl bg-surface-2 text-ink-2 flex items-center justify-center shrink-0">
              <Icon name="scale" size={20} />
            </div>
            <div className="flex-1 min-w-0 text-sm font-medium">{bwSaved ? t.bodyweight.saved : t.summary.bodyweightPrompt}</div>
            {!bwSaved && (
              <Button size="sm" onClick={() => setBwPad(true)}>
                {t.common.add}
              </Button>
            )}
          </Card>
        )}

        <Button variant="primary" size="xl" full className="mt-2" onClick={() => navigate('/', { replace: true })}>
          {t.summary.backHome}
        </Button>
      </div>

      <NumPad open={bwPad} title={t.bodyweight.title} hint={t.bodyweight.enter} initial={latestBw} unit={t.common.kg} allowDecimal min={20} max={400} onConfirm={(v) => void saveBodyweight(v)} onClose={() => setBwPad(false)} />
    </div>
  )
}
