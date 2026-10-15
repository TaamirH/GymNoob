import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router'
import { db } from '@/db/db'
import { useT } from '@/i18n'
import { Page, PageHeader } from '@/components/PageHeader'
import { Card, EmptyState } from '@/components/Card'
import { Icon } from '@/components/Icon'
import { Button } from '@/components/Button'
import { fmtDuration } from '@/lib/format'
import { volume } from '@/logic/stats'
import type { Workout, WorkoutSet } from '@/db/types'

function monthKey(ts: number) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${d.getMonth()}`
}

export default function HistoryPage() {
  const t = useT()
  const navigate = useNavigate()
  const data = useLiveQuery(async () => {
    const [workouts, sets, exercises, latestBw] = await Promise.all([
      db.workouts.orderBy('startedAt').reverse().toArray(),
      db.sets.toArray(),
      db.exercises.toArray(),
      db.bodyweight.orderBy('date').last(),
    ])
    const setsByWorkout = new Map<string, WorkoutSet[]>()
    for (const s of sets) setsByWorkout.set(s.workoutId, [...(setsByWorkout.get(s.workoutId) ?? []), s])
    return { workouts, setsByWorkout, exMap: new Map(exercises.map((e) => [e.id, e])), bw: latestBw?.kg ?? null }
  }, [])

  if (!data) return <Page />
  const { workouts, setsByWorkout, exMap, bw } = data
  const active = workouts.find((w) => w.status === 'active')
  const completed = workouts.filter((w) => w.status === 'completed')

  const groups: { key: string; label: string; items: Workout[] }[] = []
  for (const w of completed) {
    const key = monthKey(w.startedAt)
    let g = groups.find((x) => x.key === key)
    if (!g) {
      const d = new Date(w.startedAt)
      g = { key, label: `${t.time.monthsShort[d.getMonth()]} ${d.getFullYear()}`, items: [] }
      groups.push(g)
    }
    g.items.push(w)
  }

  return (
    <Page>
      <PageHeader title={t.history.title} subtitle={completed.length ? t.history.workouts(completed.length) : undefined} />
      <div className="px-4 space-y-5">
        {active && (
          <Card className="px-4 py-3 flex items-center gap-3 border-accent/40">
            <div className="w-10 h-10 rounded-2xl bg-accent-soft text-accent flex items-center justify-center shrink-0">
              <Icon name="play" size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{active.routineName}</div>
              <div className="text-xs text-muted">{t.history.incomplete}</div>
            </div>
            <Button size="sm" variant="primary" onClick={() => navigate('/workout')}>
              {t.today.resume}
            </Button>
          </Card>
        )}

        {completed.length === 0 && !active && <EmptyState icon={<Icon name="clock" />} title={t.history.empty} hint={t.history.emptyHint} />}

        {groups.map((g) => (
          <section key={g.key}>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted mb-2">{g.label}</div>
            <div className="space-y-2">
              {g.items.map((w) => {
                const sets = setsByWorkout.get(w.id) ?? []
                const d = new Date(w.startedAt)
                const vol = volume(sets, exMap, bw)
                const ordered = [...sets].sort((a, b) => a.completedAt - b.completedAt)
                const exNames = [...new Set(ordered.map((s) => s.exerciseId))].map((id) => exMap.get(id)?.nameEn).filter(Boolean)
                return (
                  <Link key={w.id} to={`/history/${w.id}`} className="pressable block">
                    <Card className="px-4 py-3 flex items-center gap-3">
                      <div className="w-12 shrink-0 text-center">
                        <div className="text-[11px] uppercase text-muted font-semibold">{t.time.dayNamesShort[d.getDay()]}</div>
                        <div className="num text-2xl font-bold leading-none">{d.getDate()}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{w.routineName}</div>
                        <div className="text-xs text-muted truncate">{exNames.join(' · ')}</div>
                      </div>
                      <div className="text-end shrink-0">
                        <div className="num text-sm font-semibold">
                          {sets.length} {t.common.sets}
                        </div>
                        <div className="text-[11px] text-muted num">
                          {w.finishedAt ? fmtDuration(w.finishedAt - w.startedAt) : ''}
                          {vol > 0 ? ` · ${Math.round(vol).toLocaleString()} ${t.common.kg}` : ''}
                        </div>
                      </div>
                      <Icon name="chevron-right" size={18} className="text-muted shrink-0 rtl:rotate-180" />
                    </Card>
                  </Link>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </Page>
  )
}
