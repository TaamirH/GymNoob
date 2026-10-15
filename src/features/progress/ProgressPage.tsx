import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router'
import { db } from '@/db/db'
import { useT } from '@/i18n'
import { useSettings } from '@/hooks/useSettings'
import { Page, PageHeader } from '@/components/PageHeader'
import { Card, EmptyState, SectionTitle, Stat } from '@/components/Card'
import { Icon } from '@/components/Icon'
import { LineChart, type LinePoint } from '@/components/charts/LineChart'
import { BarList, type BarRow } from '@/components/charts/BarList'
import { bestSets } from '@/logic/stats'
import { addDays, fmtKg, startOfWeek } from '@/lib/format'
import type { Exercise, MuscleGroup, Workout, WorkoutSet } from '@/db/types'
import { MUSCLE_GROUPS } from '@/db/types'

const WEEKLY_SET_TARGET = 10

export default function ProgressPage() {
  const t = useT()
  const settings = useSettings()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<string | null>(null)

  const data = useLiveQuery(async () => {
    const [workouts, sets, exercises, routines, bodyweight] = await Promise.all([
      db.workouts.where('status').equals('completed').toArray(),
      db.sets.toArray(),
      db.exercises.toArray(),
      db.routines.toArray(),
      db.bodyweight.orderBy('date').toArray(),
    ])
    const wMap = new Map(workouts.map((w) => [w.id, w]))
    const completedSets = sets.filter((s) => s.type === 'working' && wMap.has(s.workoutId))
    return { workouts, wMap, sets: completedSets, exercises, routine: routines[0], bodyweight }
  }, [])

  const xFormat = (ts: number) => {
    const d = new Date(ts)
    return `${d.getDate()} ${t.time.monthsShort[d.getMonth()]}`
  }

  const exercisesInOrder = useMemo(() => {
    if (!data) return []
    const order = new Map((data.routine?.items ?? []).map((i) => [i.exerciseId, i.order]))
    const withData = new Set(data.sets.map((s) => s.exerciseId))
    return [...data.exercises]
      .filter((e) => order.has(e.id) || withData.has(e.id))
      .sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999) || a.nameEn.localeCompare(b.nameEn))
  }, [data])

  if (!data) return <Page />

  const { wMap, sets, exercises, bodyweight } = data
  const exMap = new Map(exercises.map((e) => [e.id, e]))
  const hasData = sets.length > 0
  const selectedId = selected ?? exercisesInOrder[0]?.id ?? null
  const selectedEx = selectedId ? exMap.get(selectedId) ?? null : null

  // Sessions for the selected exercise: one point per workout.
  const sessions = selectedEx ? sessionsFor(selectedEx, sets, wMap) : []
  const points: LinePoint[] = sessions.map((s) => ({
    x: s.finishedAt,
    y: s.weightKg,
    tip: `${s.reps.join(', ')} ${t.common.reps}`,
  }))
  const best = selectedEx ? bestSets(selectedEx, sets.filter((s) => s.exerciseId === selectedEx.id)) : null

  // Weekly sets per muscle (this week).
  const weekStart = startOfWeek(new Date(), settings.weekStartsOn).getTime()
  const weekEnd = addDays(new Date(weekStart), 7).getTime()
  const weekCounts = new Map<MuscleGroup, number>()
  for (const s of sets) {
    const w = wMap.get(s.workoutId)
    if (!w || w.finishedAt === null || w.finishedAt < weekStart || w.finishedAt >= weekEnd) continue
    const ex = exMap.get(s.exerciseId)
    if (!ex) continue
    for (const m of ex.primaryMuscles) weekCounts.set(m, (weekCounts.get(m) ?? 0) + 1)
  }
  const routineMuscles = new Set<MuscleGroup>()
  for (const ex of exercisesInOrder) for (const m of ex.primaryMuscles) routineMuscles.add(m)
  const barRows: BarRow[] = MUSCLE_GROUPS.filter((m) => routineMuscles.has(m) || weekCounts.has(m))
    .map((m) => ({ m, v: weekCounts.get(m) ?? 0 }))
    .sort((a, b) => b.v - a.v)
    .map(({ m, v }) => ({
      key: m,
      label: t.muscles[m],
      value: v,
      badge: v >= WEEKLY_SET_TARGET ? <Icon name="check" size={12} strokeWidth={3} className="text-good shrink-0" /> : undefined,
    }))

  const bwPoints: LinePoint[] = bodyweight.map((b) => ({ x: new Date(b.date + 'T12:00:00').getTime(), y: b.kg }))

  return (
    <Page>
      <PageHeader title={t.progress.title} />
      {!hasData && bodyweight.length === 0 ? (
        <EmptyState icon={<Icon name="chart" />} title={t.progress.noData} />
      ) : (
        <div className="px-4 space-y-4">
          {exercisesInOrder.length > 0 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
              {exercisesInOrder.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => setSelected(ex.id)}
                  className={`pressable shrink-0 h-9 px-3.5 rounded-full text-sm font-medium whitespace-nowrap ${
                    ex.id === selectedId ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-ink-2'
                  }`}
                >
                  {ex.nameEn}
                </button>
              ))}
            </div>
          )}

          {selectedEx && (
            <Card className="px-4 pt-4 pb-3">
              <div className="flex items-baseline justify-between mb-1">
                <div className="font-semibold">{t.progress.weightOverTime}</div>
                <div className="text-[11px] text-muted">{selectedEx.isAssisted ? t.common.assistedHint : `${sessions.length} ${t.progress.sessions.toLowerCase()}`}</div>
              </div>
              {points.length === 0 ? (
                <div className="text-sm text-muted py-10 text-center">{t.progress.noData}</div>
              ) : (
                <LineChart points={points} xFormat={xFormat} yFormat={fmtKg} unit={t.common.kg} labelExtreme={selectedEx.isAssisted ? 'min' : 'max'} />
              )}
              {best && (best.heaviest || best.mostReps) && (
                <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-line/60">
                  <Stat label={t.progress.heaviest} value={best.heaviest ? `${fmtKg(best.heaviest.weightKg)}` : '—'} sub={best.heaviest ? `× ${best.heaviest.reps}` : undefined} accent />
                  <Stat label={t.progress.mostReps} value={best.mostReps ? best.mostReps.reps : '—'} sub={best.mostReps ? `${fmtKg(best.mostReps.weightKg)} ${t.common.kg}` : undefined} />
                  {best.bestE1rm ? (
                    <Stat label={t.progress.e1rm} value={fmtKg(Math.round(best.bestE1rm.value))} sub={t.common.kg} />
                  ) : (
                    <Stat label={t.progress.sessions} value={sessions.length} />
                  )}
                </div>
              )}
              {sessions.length > 0 && (
                <div className="mt-3 pt-2 border-t border-line/60 divide-y divide-line/40">
                  {[...sessions]
                    .reverse()
                    .slice(0, 6)
                    .map((s) => (
                      <button key={s.workoutId} type="button" onClick={() => navigate(`/history/${s.workoutId}`)} className="pressable w-full flex items-center gap-3 py-2 text-start">
                        <span className="text-xs text-muted num w-14 shrink-0">{xFormat(s.finishedAt)}</span>
                        <span className="num font-semibold">
                          {fmtKg(s.weightKg)} <span className="text-[11px] text-muted font-medium">{t.common.kg}</span>
                        </span>
                        <span className="text-muted">×</span>
                        <span className="num text-ink-2">{s.reps.join(', ')}</span>
                      </button>
                    ))}
                </div>
              )}
            </Card>
          )}

          {barRows.length > 0 && (
            <Card className="px-4 pt-4 pb-4">
              <div className="font-semibold">{t.progress.weeklySets}</div>
              <div className="text-[11px] text-muted mb-3">{t.progress.thisWeek}</div>
              <BarList rows={barRows} target={WEEKLY_SET_TARGET} targetLabel={t.progress.weeklyTarget(WEEKLY_SET_TARGET)} />
            </Card>
          )}

          {hasData && (
            <>
              <SectionTitle>{t.progress.prs}</SectionTitle>
              <Card className="divide-y divide-line/60">
                {exercisesInOrder.map((ex) => {
                  const b = bestSets(ex, sets.filter((s) => s.exerciseId === ex.id))
                  if (!b.heaviest) return null
                  return (
                    <div key={ex.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="w-8 h-8 rounded-xl bg-accent-soft text-accent flex items-center justify-center shrink-0">
                        <Icon name="trophy" size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate text-sm">{ex.nameEn}</div>
                        <div className="text-[11px] text-muted num">{xFormat(b.heaviest.at)}</div>
                      </div>
                      <div className="num font-bold">
                        {fmtKg(b.heaviest.weightKg)} <span className="text-[11px] text-muted font-medium">{t.common.kg}</span> × {b.heaviest.reps}
                      </div>
                    </div>
                  )
                })}
              </Card>
            </>
          )}

          {bwPoints.length > 0 && (
            <Card className="px-4 pt-4 pb-3">
              <div className="flex items-baseline justify-between mb-1">
                <div className="font-semibold">{t.progress.bodyweight}</div>
                <div className="num text-sm font-bold">
                  {fmtKg(bodyweight[bodyweight.length - 1].kg)} <span className="text-[11px] text-muted font-medium">{t.common.kg}</span>
                </div>
              </div>
              {bwPoints.length >= 2 ? <LineChart points={bwPoints} xFormat={xFormat} yFormat={fmtKg} unit={t.common.kg} labelExtreme="none" height={150} /> : <div className="text-xs text-muted py-2">{bodyweight[0].date}</div>}
            </Card>
          )}
        </div>
      )}
    </Page>
  )
}

interface SessionPoint {
  workoutId: string
  finishedAt: number
  weightKg: number
  reps: number[]
}

function sessionsFor(ex: Exercise, sets: WorkoutSet[], wMap: Map<string, Workout>): SessionPoint[] {
  const by = new Map<string, WorkoutSet[]>()
  for (const s of sets) if (s.exerciseId === ex.id) by.set(s.workoutId, [...(by.get(s.workoutId) ?? []), s])
  const out: SessionPoint[] = []
  for (const [workoutId, ss] of by) {
    const w = wMap.get(workoutId)
    if (!w || w.finishedAt === null) continue
    ss.sort((a, b) => a.setNumber - b.setNumber)
    out.push({ workoutId, finishedAt: w.finishedAt, weightKg: ss[ss.length - 1].weightKg, reps: ss.map((s) => s.reps) })
  }
  return out.sort((a, b) => a.finishedAt - b.finishedAt)
}
