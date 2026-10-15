import { useCallback, useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router'
import { db, getMeta, setMeta } from '@/db/db'
import type { Effort, Exercise, WorkoutItem } from '@/db/types'
import { useT } from '@/i18n'
import { useSettings, updateSettings } from '@/hooks/useSettings'
import { useRestTimer } from '@/hooks/useRestTimer'
import { useWakeLock } from '@/hooks/useWakeLock'
import { Button, IconButton } from '@/components/Button'
import { ConfirmDialog } from '@/components/Sheet'
import { Icon } from '@/components/Icon'
import { ExerciseCard } from './ExerciseCard'
import { RestTimerBar } from './RestTimerBar'
import { GuideSheet } from './GuideSheet'
import { deleteSet, discardWorkout, finishWorkout, logSet, startOrResumeWorkout, updateSet } from './workoutService'
import { haptics } from '@/lib/haptics'
import { playRestEnd, unlockAudio } from '@/lib/sound'
import { notificationState, requestNotificationPermission, showNotification } from '@/lib/notifications'
import { fmtClock } from '@/lib/format'

export default function WorkoutPage() {
  const t = useT()
  const navigate = useNavigate()
  const settings = useSettings()
  const [workoutId, setWorkoutId] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [guideEx, setGuideEx] = useState<Exercise | null>(null)
  const [confirm, setConfirm] = useState<null | 'finish' | 'discard'>(null)
  const [restFlash, setRestFlash] = useState(false)
  const [tick, setTick] = useState(0)
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const initialised = useRef(false)

  useEffect(() => {
    let cancelled = false
    startOrResumeWorkout()
      .then((id) => !cancelled && setWorkoutId(id))
      .catch(() => !cancelled && navigate('/', { replace: true }))
    return () => {
      cancelled = true
    }
  }, [navigate])

  const data = useLiveQuery(async () => {
    if (!workoutId) return undefined
    const workout = await db.workouts.get(workoutId)
    if (!workout || workout.status !== 'active') return null
    const [items, sets, exercises] = await Promise.all([
      db.workoutItems.where('workoutId').equals(workoutId).toArray(),
      db.sets.where('workoutId').equals(workoutId).toArray(),
      db.exercises.toArray(),
    ])
    items.sort((a, b) => a.order - b.order)
    return { workout, items, sets, exMap: new Map(exercises.map((e) => [e.id, e])) }
  }, [workoutId])

  useEffect(() => {
    if (data === null) navigate('/', { replace: true })
  }, [data, navigate])

  // Collapse exercises that were already complete when the page opened (resume case).
  useEffect(() => {
    if (!data || initialised.current) return
    initialised.current = true
    const init: Record<string, boolean> = {}
    for (const item of data.items) {
      const n = data.sets.filter((s) => s.workoutItemId === item.id).length
      if (n >= item.sets) init[item.id] = true
    }
    setCollapsed(init)
  }, [data])

  useEffect(() => {
    const id = window.setInterval(() => setTick((x) => x + 1), 1000)
    return () => window.clearInterval(id)
  }, [])

  useWakeLock(true)

  const onRestEnd = useCallback(() => {
    haptics.alarm()
    playRestEnd()
    if (document.visibilityState === 'hidden') void showNotification(t.workout.restOver, t.workout.restOverBody)
    setRestFlash(true)
    window.setTimeout(() => setRestFlash(false), 2500)
  }, [t])

  const rest = useRestTimer(onRestEnd)

  const items = data?.items ?? []
  const sets = data?.sets ?? []
  const loggedFor = (item: WorkoutItem) => sets.filter((s) => s.workoutItemId === item.id).length
  const totalSets = items.reduce((a, i) => a + i.sets, 0)
  const loggedTotal = items.reduce((a, i) => a + Math.min(i.sets, loggedFor(i)), 0)
  const allDone = items.length > 0 && items.every((i) => loggedFor(i) >= i.sets)

  const maybeAskNotifications = async () => {
    if (notificationState() !== 'default') return
    if (await getMeta<boolean>('askedNotifications')) return
    await setMeta('askedNotifications', true)
    const granted = await requestNotificationPermission()
    if (granted) await updateSettings({ notificationsEnabled: true })
  }

  const handleLog = async (item: WorkoutItem, setNumber: number, weightKg: number, reps: number) => {
    if (!workoutId) return
    unlockAudio()
    void maybeAskNotifications()
    const { created } = await logSet({ workoutId, workoutItemId: item.id, exerciseId: item.exerciseId, setNumber, weightKg, reps })
    haptics.confirm()
    if (!created) return

    const nowLogged = loggedFor(item) + 1
    const doneAfter = items.every((i) => (i.id === item.id ? nowLogged : loggedFor(i)) >= i.sets)
    if (!doneAfter) void rest.start(item.restSec || settings.defaultRestSec)

    if (nowLogged >= item.sets) {
      setCollapsed((c) => ({ ...c, [item.id]: true }))
      const next = items.find((i) => i.order > item.order && loggedFor(i) < i.sets)
      if (next) window.setTimeout(() => cardRefs.current[next.id]?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 180)
    }
  }

  const handleFinish = async () => {
    if (!workoutId) return
    setConfirm(null)
    await finishWorkout(workoutId)
    await rest.skip()
    haptics.success()
    navigate(`/workout/summary/${workoutId}`, { replace: true })
  }

  const handleDiscard = async () => {
    if (!workoutId) return
    setConfirm(null)
    await discardWorkout(workoutId)
    await rest.skip()
    navigate('/', { replace: true })
  }

  const requestFinish = () => {
    if (loggedTotal === 0) {
      setConfirm('discard')
      return
    }
    setConfirm('finish')
  }

  if (!data) {
    return <div className="h-full" />
  }

  const elapsed = Math.max(0, Date.now() - data.workout.startedAt)
  void tick

  return (
    <div className="mx-auto max-w-lg min-h-full pb-[calc(120px+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-30 pt-safe bg-bg/85 backdrop-blur-xl border-b border-line/60">
        <div className="flex items-center gap-2 px-3 h-14">
          <IconButton icon="x" label={t.common.close} onClick={() => navigate('/')} />
          <div className="flex-1 min-w-0 text-center">
            <div className="font-bold leading-tight truncate">{data.workout.routineName}</div>
            <div className="num text-xs text-muted">
              {fmtClock(elapsed / 1000)} · {loggedTotal}/{totalSets} {t.common.sets}
            </div>
          </div>
          <Button size="sm" variant={allDone ? 'primary' : 'secondary'} icon="flag" iconSize={15} onClick={requestFinish}>
            {t.workout.finish}
          </Button>
        </div>
        <div className="h-0.5 bg-surface-2">
          <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${totalSets ? (loggedTotal / totalSets) * 100 : 0}%` }} />
        </div>
      </header>

      <div className="px-3 pt-3 space-y-3">
        {items.map((item, i) => {
          const ex = data.exMap.get(item.exerciseId)
          if (!ex) return null
          return (
            <ExerciseCard
              key={item.id}
              ref={(el) => {
                cardRefs.current[item.id] = el
              }}
              index={i}
              item={item}
              exercise={ex}
              sets={sets.filter((s) => s.workoutItemId === item.id)}
              collapsed={collapsed[item.id] === true}
              onToggle={() => setCollapsed((c) => ({ ...c, [item.id]: !c[item.id] }))}
              onLog={(n, w, r) => handleLog(item, n, w, r)}
              onUpdateSet={(id, patch: { effort?: Effort; weightKg?: number; reps?: number }) => void updateSet(id, patch)}
              onDeleteSet={(id) => void deleteSet(id)}
              onGuide={() => setGuideEx(ex)}
            />
          )
        })}

        {allDone && (
          <div className="pt-2 fade-up">
            <div className="text-center text-sm text-good font-medium mb-3 flex items-center justify-center gap-1.5">
              <Icon name="check" size={16} strokeWidth={3} /> {t.workout.allDone}
            </div>
            <Button variant="primary" size="xl" full icon="flag" onClick={requestFinish}>
              {t.workout.finish}
            </Button>
          </div>
        )}

        <div className="pt-6 pb-2 text-center">
          <button type="button" onClick={() => setConfirm('discard')} className="pressable text-sm text-muted hover:text-danger px-3 py-2">
            {t.workout.discard}
          </button>
        </div>
      </div>

      <RestTimerBar active={rest.active} remainingSec={rest.remainingSec} totalSec={rest.totalSec} flash={restFlash} onAdd={() => void rest.add(30)} onSkip={() => void rest.skip()} />

      <GuideSheet exercise={guideEx} onClose={() => setGuideEx(null)} />

      <ConfirmDialog
        open={confirm === 'finish'}
        title={t.workout.finish}
        message={loggedTotal < totalSets ? t.workout.finishIncomplete(totalSets - loggedTotal) : t.workout.finishConfirm}
        confirmLabel={t.workout.finish}
        onConfirm={() => void handleFinish()}
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'discard'}
        title={t.workout.discard}
        message={t.workout.discardConfirm}
        confirmLabel={t.common.delete}
        danger
        onConfirm={() => void handleDiscard()}
        onClose={() => setConfirm(null)}
      />
    </div>
  )
}
