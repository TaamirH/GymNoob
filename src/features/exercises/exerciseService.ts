import { nanoid } from 'nanoid'
import { db } from '@/db/db'
import type { Equipment, Exercise, ExerciseGuide, MuscleGroup, RoutineItem } from '@/db/types'

async function firstRoutine() {
  return (await db.routines.toArray())[0]
}

export interface Tuning {
  incrementKg?: number
  restSec?: number
  sets?: number
  minReps?: number
  maxReps?: number
}

/** Updates per-exercise tuning on the exercise, its routine item and its prescription. */
export async function updateExerciseTuning(exerciseId: string, patch: Tuning): Promise<void> {
  await db.transaction('rw', [db.exercises, db.routines, db.prescriptions], async () => {
    const ex = await db.exercises.get(exerciseId)
    if (!ex) return
    const exPatch: Partial<Exercise> = {}
    if (patch.incrementKg !== undefined) exPatch.incrementKg = patch.incrementKg
    if (patch.restSec !== undefined) exPatch.defaultRestSec = patch.restSec
    if (patch.minReps !== undefined) exPatch.defaultMinReps = patch.minReps
    if (patch.maxReps !== undefined) exPatch.defaultMaxReps = patch.maxReps
    await db.exercises.update(exerciseId, exPatch)

    const routine = await firstRoutine()
    if (routine) {
      const items = routine.items.map((i) =>
        i.exerciseId === exerciseId
          ? {
              ...i,
              restSec: patch.restSec ?? i.restSec,
              sets: patch.sets ?? i.sets,
              minReps: patch.minReps ?? i.minReps,
              maxReps: patch.maxReps ?? i.maxReps,
            }
          : i,
      )
      await db.routines.update(routine.id, { items })
    }

    const rx = await db.prescriptions.get(exerciseId)
    if (rx) {
      const sets = patch.sets ?? rx.sets
      const minReps = patch.minReps ?? rx.minReps
      const maxReps = patch.maxReps ?? rx.maxReps
      const repsPerSet = Array.from({ length: sets }, (_, i) => Math.min(maxReps, Math.max(minReps, rx.repsPerSet[i] ?? minReps)))
      await db.prescriptions.update(exerciseId, { sets, minReps, maxReps, repsPerSet })
    }
  })
}

export async function addToRoutine(exerciseId: string): Promise<void> {
  await db.transaction('rw', [db.exercises, db.routines, db.prescriptions], async () => {
    const ex = await db.exercises.get(exerciseId)
    if (!ex) return
    let routine = await firstRoutine()
    if (!routine) {
      routine = { id: 'full-body', name: 'Full Body', items: [] }
      await db.routines.add(routine)
    }
    if (routine.items.some((i) => i.exerciseId === exerciseId)) return
    const item: RoutineItem = {
      exerciseId,
      order: routine.items.length ? Math.max(...routine.items.map((i) => i.order)) + 1 : 0,
      sets: 2,
      minReps: ex.defaultMinReps,
      maxReps: ex.defaultMaxReps,
      restSec: ex.defaultRestSec,
    }
    await db.routines.update(routine.id, { items: [...routine.items, item] })
    if (!(await db.prescriptions.get(exerciseId))) {
      await db.prescriptions.add({
        exerciseId,
        weightKg: null,
        sets: item.sets,
        minReps: item.minReps,
        maxReps: item.maxReps,
        repsPerSet: Array.from({ length: item.sets }, () => item.minReps),
        updatedAt: Date.now(),
        source: 'auto',
        lastChange: 'none',
        lastDelta: 0,
        reasonParams: {},
      })
    }
  })
}

export async function removeFromRoutine(exerciseId: string): Promise<void> {
  const routine = await firstRoutine()
  if (!routine) return
  const items = routine.items.filter((i) => i.exerciseId !== exerciseId).sort((a, b) => a.order - b.order).map((i, idx) => ({ ...i, order: idx }))
  await db.routines.update(routine.id, { items })
}

export async function moveInRoutine(exerciseId: string, dir: -1 | 1): Promise<void> {
  const routine = await firstRoutine()
  if (!routine) return
  const items = [...routine.items].sort((a, b) => a.order - b.order)
  const idx = items.findIndex((i) => i.exerciseId === exerciseId)
  const j = idx + dir
  if (idx < 0 || j < 0 || j >= items.length) return
  ;[items[idx], items[j]] = [items[j], items[idx]]
  await db.routines.update(routine.id, { items: items.map((i, k) => ({ ...i, order: k })) })
}

export interface NewExerciseInput {
  nameEn: string
  nameHe: string
  primaryMuscles: MuscleGroup[]
  secondaryMuscles: MuscleGroup[]
  equipment: Equipment
  isAssisted: boolean
  incrementKg: number
  addToRoutine: boolean
}

export async function createExercise(input: NewExerciseInput): Promise<string> {
  const id = `custom-${nanoid(8)}`
  const ex: Exercise = {
    id,
    nameEn: input.nameEn.trim(),
    nameHe: input.nameHe.trim(),
    primaryMuscles: input.primaryMuscles,
    secondaryMuscles: input.secondaryMuscles,
    equipment: input.equipment,
    isAssisted: input.isAssisted,
    incrementKg: input.incrementKg,
    defaultMinReps: 10,
    defaultMaxReps: 15,
    defaultRestSec: 90,
    guideHe: { setup: [], steps: [], mistakes: [], cues: [] },
    isCustom: true,
  }
  await db.exercises.add(ex)
  if (input.addToRoutine) await addToRoutine(id)
  return id
}

export async function updateExercise(id: string, patch: Partial<Pick<Exercise, 'nameEn' | 'nameHe' | 'primaryMuscles' | 'secondaryMuscles' | 'isAssisted' | 'equipment'>>): Promise<void> {
  await db.exercises.update(id, patch)
}

export async function updateGuide(id: string, guide: ExerciseGuide): Promise<void> {
  await db.exercises.update(id, { guideHe: guide, guideEdited: true })
}

/** Removes from routine and deletes the prescription; deletes the exercise row only when it has no history. */
export async function deleteExercise(id: string): Promise<'deleted' | 'kept-history'> {
  await removeFromRoutine(id)
  await db.prescriptions.delete(id)
  const used = await db.sets.where('exerciseId').equals(id).count()
  if (used > 0) return 'kept-history'
  await db.exercises.delete(id)
  return 'deleted'
}
