import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router'
import { db } from '@/db/db'
import { useT } from '@/i18n'
import { useSettings } from '@/hooks/useSettings'
import { Page, PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { Card, SectionTitle } from '@/components/Card'
import { Icon } from '@/components/Icon'
import { addDays, fmtKg, isSameDay, isoDate, startOfWeek } from '@/lib/format'

export default function TodayPage() {
  const t = useT()
  const settings = useSettings()
  const navigate = useNavigate()

  const data = useLiveQuery(async () => {
    const weekStart = startOfWeek(new Date(), settings.weekStartsOn).getTime()
    const [routines, exercises, prescriptions, active, weekWorkouts] = await Promise.all([
      db.routines.toArray(),
      db.exercises.toArray(),
      db.prescriptions.toArray(),
      db.workouts.where('status').equals('active').first(),
      db.workouts.where('finishedAt').aboveOrEqual(weekStart).filter((w) => w.status === 'completed').toArray(),
    ])
    return { routine: routines[0], exercises, prescriptions, active, weekWorkouts }
  }, [settings.weekStartsOn])

  if (!data) return <Page />

  const { routine, exercises, prescriptions, active, weekWorkouts } = data
  const exMap = new Map(exercises.map((e) => [e.id, e]))
  const rxMap = new Map(prescriptions.map((p) => [p.exerciseId, p]))
  const items = [...(routine?.items ?? [])].sort((a, b) => a.order - b.order)
  const done = weekWorkouts.length
  const target = settings.weeklyTarget
  const weekStart = startOfWeek(new Date(), settings.weekStartsOn)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const trainedDays = new Set(weekWorkouts.map((w) => isoDate(w.finishedAt ?? w.startedAt)))
  const firstTime = items.every((i) => (rxMap.get(i.exerciseId)?.weightKg ?? null) === null)
  const now = new Date()
  const dateLabel = `${t.time.dayNamesShort[now.getDay()]}, ${now.getDate()} ${t.time.monthsShort[now.getMonth()]}`

  return (
    <Page>
      <PageHeader title={t.nav.today} subtitle={dateLabel} />
      <div className="px-4 space-y-4">
        <Card className="p-5 fade-up">
          <div className="flex items-baseline justify-between">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{t.today.thisWeek}</div>
            <div className="text-sm text-ink-2">{t.today.sessionsOf(done, target)}</div>
          </div>
          <div className="grid grid-cols-7 gap-1.5 mt-4">
            {days.map((d, i) => {
              const key = isoDate(d)
              const trained = trainedDays.has(key)
              const today = isSameDay(d, now)
              return (
                <div key={key} className="flex flex-col items-center gap-1.5">
                  <div className={`text-[11px] font-medium ${today ? 'text-accent' : 'text-muted'}`}>
                    {t.time.dayNamesShort[(settings.weekStartsOn + i) % 7]}
                  </div>
                  <div
                    className={`w-full aspect-square rounded-xl flex items-center justify-center ${
                      trained ? 'bg-accent text-accent-ink' : today ? 'bg-surface-2 ring-1 ring-accent/60' : 'bg-surface-2'
                    }`}
                  >
                    {trained ? <Icon name="check" size={16} strokeWidth={3} /> : <span className="num text-xs text-muted">{d.getDate()}</span>}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 h-1.5 rounded-full bg-surface-2 overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${Math.min(100, (done / Math.max(1, target)) * 100)}%` }} />
          </div>
        </Card>

        <Button
          variant="primary"
          size="xl"
          full
          icon={active ? 'play' : 'bolt'}
          className="fade-up"
          onClick={() => navigate('/workout')}
          disabled={!routine || items.length === 0}
        >
          {active ? t.today.resume : `${t.today.start} ${routine?.name ?? ''}`}
        </Button>

        {done >= target && !active && <div className="text-center text-sm text-good font-medium">{t.today.weekDone}</div>}

        <SectionTitle>{t.today.plan}</SectionTitle>
        {firstTime && <div className="text-sm text-muted -mt-1 mb-2">{t.today.firstTime}</div>}
        <Card className="divide-y divide-line/60">
          {items.map((item) => {
            const ex = exMap.get(item.exerciseId)
            const rx = rxMap.get(item.exerciseId)
            if (!ex) return null
            return (
              <div key={item.exerciseId} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{ex.nameEn}</div>
                  <div className="text-xs text-muted">
                    {item.sets} × {item.minReps}–{item.maxReps}
                    {ex.isAssisted && <span className="ms-2 text-info">{t.common.assisted}</span>}
                  </div>
                </div>
                <div className="num text-lg font-bold">
                  {rx && rx.weightKg !== null ? (
                    <>
                      {fmtKg(rx.weightKg)}
                      <span className="text-xs text-muted font-medium ms-1">{t.common.kg}</span>
                    </>
                  ) : (
                    <span className="text-sm text-muted font-medium">—</span>
                  )}
                </div>
              </div>
            )
          })}
        </Card>
      </div>
    </Page>
  )
}
