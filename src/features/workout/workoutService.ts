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

/** Marks the workout completed and re-evaluates every exercise that was logged. */
export async function finishWorkout(workoutId: string): Promise<void> {
  await db.transaction('rw', [db.workouts, db.workoutItems, db.sets, db.prescriptions, db.exercises, db.routines], async () => {
    const workout = await db.workouts.get(workoutId)
    if (!workout || workout.status !== 'active') return
    const now = Date.now()
    await db.workouts.update(workoutId, { status: 'completed', finishedAt: now })

    const items = await db.workoutItems.where('workoutId').equals(workoutId).toArray()
    const routine = await db.routines.get(workout.routineId)

    for (const item of items) {
      const ex = await db.exercises.get(item.exerciseId)
      if (!ex) continue
      const loggedHere = await db.sets.where('workoutItemId').equals(item.id).count()
      if (loggedHere === 0) continue

      const rx = await db.prescriptions.get(item.exerciseId)
      const ri = routine?.items.find((i) => i.exerciseId === item.exerciseId)
      const current = {
        weightKg: rx?.weightKg ?? null,
        sets: ri?.sets ?? item.sets,
        minReps: ri?.minReps ?? item.minReps,
        maxReps: ri?.maxReps ?? item.maxReps,
      }
      const history = await sessionHistory(item.exerciseId)
      const out = nextPrescription(ex, current, history)
      await db.prescriptions.put({
        exerciseId: item.exerciseId,
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
