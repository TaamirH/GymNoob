import { nanoid } from 'nanoid'
import { db } from '@/db/db'
import type { Effort, SetType, WorkoutSet } from '@/db/types'
import { nextPrescription, type SessionResult } from '@/logic/progression'

/** Returns the active workout id, creating one from the first routine when none is active. */
export async function startOrResumeWorkout(): Promise<string> {
  return db.transaction('rw', [db.workouts, db.workoutItems, db.routines, db.prescriptions, db.exercises], async () => {
    const active = await db.workouts.where('status').equals('active').first()
    if (active) return active.id

    const routine = (await db.routines.toArray())[0]
    if (!routine || routine.items.length === 0) throw new Error('no-routine')

    const id = nanoid()
    const now = Date.now()
    await db.workouts.add({
      id,
      routineId: routine.id,
      routineName: routine.name,
      startedAt: now,
      finishedAt: null,
      status: 'active',
    })

    const items = [...routine.items].sort((a, b) => a.order - b.order)
    for (const item of items) {
      const ex = await db.exercises.get(item.exerciseId)
      if (!ex) continue
      const rx = await db.prescriptions.get(item.exerciseId)
      const reps = Array.from({ length: item.sets }, (_, i) => rx?.repsPerSet?.[i] ?? item.minReps)
      await db.workoutItems.add({
        id: nanoid(),
        workoutId: id,
        exerciseId: item.exerciseId,
        order: item.order,
        prescribedWeightKg: rx?.weightKg ?? null,
        prescribedReps: reps,
        sets: item.sets,
        minReps: item.minReps,
        maxReps: item.maxReps,
        restSec: item.restSec,
      })
    }
    return id
  })
}

export interface LogSetInput {
  workoutId: string
  workoutItemId: string
  exerciseId: string
  setNumber: number
  weightKg: number
  reps: number
  effort?: Effort
  type?: SetType
}

/** Insert or update the set at (workoutItemId, setNumber). Returns the stored row and whether it was new. */
export async function logSet(input: LogSetInput): Promise<{ set: WorkoutSet; created: boolean }> {
  return db.transaction('rw', db.sets, async () => {
    const existing = await db.sets
      .where('workoutItemId')
      .equals(input.workoutItemId)
      .and((s) => s.setNumber === input.setNumber)
      .first()
    if (existing) {
      const patch = {
        weightKg: input.weightKg,
        reps: input.reps,
        effort: input.effort ?? existing.effort,
        type: input.type ?? existing.type,
      }
      await db.sets.update(existing.id, patch)
      return { set: { ...existing, ...patch }, created: false }
    }
    const set: WorkoutSet = {
      id: nanoid(),
      workoutId: input.workoutId,
      workoutItemId: input.workoutItemId,
      exerciseId: input.exerciseId,
      setNumber: input.setNumber,
      weightKg: input.weightKg,
      reps: input.reps,
      effort: input.effort ?? 'ok',
      type: input.type ?? 'working',
      completedAt: Date.now(),
    }
    await db.sets.add(set)
    return { set, created: true }
  })
}

export async function updateSet(id: string, patch: Partial<Pick<WorkoutSet, 'weightKg' | 'reps' | 'effort' | 'type'>>): Promise<void> {
  await db.sets.update(id, patch)
}

export async function deleteSet(id: string): Promise<void> {
  await db.sets.delete(id)
}

export async function discardWorkout(workoutId: string): Promise<void> {
  await db.transaction('rw', [db.workouts, db.workoutItems, db.sets], async () => {
    await db.sets.where('workoutId').equals(workoutId).delete()
    await db.workoutItems.where('workoutId').equals(workoutId).delete()
    await db.workouts.delete(workoutId)
  })
}

export async function deleteWorkout(workoutId: string): Promise<void> {
  await discardWorkout(workoutId)
}

/** Completed sessions for an exercise, newest first, working sets in order. */
export async function sessionHistory(exerciseId: string, limit = 6): Promise<SessionResult[]> {
  const sets = await db.sets.where('exerciseId').equals(exerciseId).toArray()
  const byWorkout = new Map<string, WorkoutSet[]>()
  for (const s of sets) {
    if (s.type !== 'working') continue
    byWorkout.set(s.workoutId, [...(byWorkout.get(s.workoutId) ?? []), s])
  }
  const workouts = await db.workouts.bulkGet([...byWorkout.keys()])
  const sessions: SessionResult[] = []
  for (const w of workouts) {
    if (!w || w.status !== 'completed' || w.finishedAt === null) continue
    const ws = (byWorkout.get(w.id) ?? []).sort((a, b) => a.setNumber - b.setNumber)
    if (ws.length === 0) continue
    sessions.push({
      workoutId: w.id,
      finishedAt: w.finishedAt,
      sets: ws.map((s) => ({ weightKg: s.weightKg, reps: s.reps, effort: s.effort })),
    })
  }
  sessions.sort((a, b) => b.finishedAt - a.finishedAt)
  return sessions.slice(0, limit)
}

/** Recomputes one exercise's prescription from its completed history. Must run inside a transaction. */
async function evaluateExercise(exerciseId: string, now: number, fallback?: { sets: number; minReps: number; maxReps: number }): Promise<void> {
  const ex = await db.exercises.get(exerciseId)
  if (!ex) return
  const rx = await db.prescriptions.get(exerciseId)
  const routine = (await db.routines.toArray())[0]
  const ri = routine?.items.find((i) => i.exerciseId === exerciseId)
  const current = {
    weightKg: rx?.weightKg ?? null,
    sets: ri?.sets ?? fallback?.sets ?? rx?.sets ?? 2,
    minReps: ri?.minReps ?? fallback?.minReps ?? rx?.minReps ?? ex.defaultMinReps,
    maxReps: ri?.maxReps ?? fallback?.maxReps ?? rx?.maxReps ?? ex.defaultMaxReps,
  }
  const history = await sessionHistory(exerciseId)
  if (history.length === 0) return
  const out = nextPrescription(ex, current, history)
  await db.prescriptions.put({
    exerciseId,
    weightKg: out.weightKg,
    sets: current.sets,
    minReps: current.minReps,
    maxReps: current.maxReps,
    repsPerSet: out.repsPerSet,
    updatedAt: now,
    source: 'auto',
    lastChange: out.change,
    lastDelta: out.delta,
    reasonParams: out.params,
  })
}

/** Marks the workout completed and re-evaluates every exercise that was logged. */
export async function finishWorkout(workoutId: string): Promise<void> {
  await db.transaction('rw', [db.workouts, db.workoutItems, db.sets, db.prescriptions, db.exercises, db.routines], async () => {
    const workout = await db.workouts.get(workoutId)
    if (!workout || workout.status !== 'active') return
    const now = Date.now()
    await db.workouts.update(workoutId, { status: 'completed', finishedAt: now })

    const items = await db.workoutItems.where('workoutId').equals(workoutId).toArray()
    for (const item of items) {
      const loggedHere = await db.sets.where('workoutItemId').equals(item.id).count()
      if (loggedHere === 0) continue
      await evaluateExercise(item.exerciseId, now, { sets: item.sets, minReps: item.minReps, maxReps: item.maxReps })
    }
  })
}

/**
 * After editing a past workout: recompute the exercise's next weight from history.
 * A manual override is left alone so a history edit never silently undoes it.
 */
export async function reevaluateExercise(exerciseId: string): Promise<void> {
  await db.transaction('rw', [db.workouts, db.workoutItems, db.sets, db.prescriptions, db.exercises, db.routines], async () => {
    const rx = await db.prescriptions.get(exerciseId)
    if (rx?.source === 'manual') return
    await evaluateExercise(exerciseId, Date.now())
  })
}

/** Adds an exercise to an existing (usually past) workout. Returns the new item id. */
export async function addExerciseToWorkout(workoutId: string, exerciseId: string): Promise<string> {
  return db.transaction('rw', [db.workouts, db.workoutItems, db.exercises, db.routines], async () => {
    const workout = await db.workouts.get(workoutId)
    const ex = await db.exercises.get(exerciseId)
    if (!workout || !ex) throw new Error('not-found')
    const existing = await db.workoutItems.where('workoutId').equals(workoutId).toArray()
    const dup = existing.find((i) => i.exerciseId === exerciseId)
    if (dup) return dup.id
    const routine = (await db.routines.toArray())[0]
    const ri = routine?.items.find((i) => i.exerciseId === exerciseId)
    const sets = ri?.sets ?? 2
    const minReps = ri?.minReps ?? ex.defaultMinReps
    const maxReps = ri?.maxReps ?? ex.defaultMaxReps
    const id = nanoid()
    await db.workoutItems.add({
      id,
      workoutId,
      exerciseId,
      order: existing.length ? Math.max(...existing.map((i) => i.order)) + 1 : 0,
      prescribedWeightKg: null,
      prescribedReps: Array.from({ length: sets }, () => minReps),
      sets,
      minReps,
      maxReps,
      restSec: ri?.restSec ?? ex.defaultRestSec,
    })
    return id
  })
}

/** Appends a set to an item of a past workout, timestamped at the workout's end. */
export async function appendSet(workoutId: string, item: { id: string; exerciseId: string }, weightKg: number, reps: number, effort: Effort): Promise<WorkoutSet> {
  return db.transaction('rw', [db.workouts, db.sets], async () => {
    const workout = await db.workouts.get(workoutId)
    const existing = await db.sets.where('workoutItemId').equals(item.id).toArray()
    const setNumber = existing.reduce((m, s) => Math.max(m, s.setNumber), 0) + 1
    const set: WorkoutSet = {
      id: nanoid(),
      workoutId,
      workoutItemId: item.id,
      exerciseId: item.exerciseId,
      setNumber,
      weightKg,
      reps,
      effort,
      type: 'working',
      completedAt: workout?.finishedAt ?? Date.now(),
    }
    await db.sets.add(set)
    return set
  })
}

/** Manual override of the next weight for an exercise. */
export async function setPrescriptionWeight(exerciseId: string, weightKg: number | null): Promise<void> {
  await db.transaction('rw', [db.prescriptions, db.routines, db.exercises], async () => {
    const rx = await db.prescriptions.get(exerciseId)
    const routine = (await db.routines.toArray())[0]
    const ri = routine?.items.find((i) => i.exerciseId === exerciseId)
    const ex = await db.exercises.get(exerciseId)
    const sets = rx?.sets ?? ri?.sets ?? 2
    const minReps = rx?.minReps ?? ri?.minReps ?? ex?.defaultMinReps ?? 10
    const maxReps = rx?.maxReps ?? ri?.maxReps ?? ex?.defaultMaxReps ?? 15
    await db.prescriptions.put({
      exerciseId,
      weightKg,
      sets,
      minReps,
      maxReps,
      repsPerSet: Array.from({ length: sets }, () => minReps),
      updatedAt: Date.now(),
      source: 'manual',
      lastChange: 'none',
      lastDelta: 0,
      reasonParams: {},
    })
  })
}
