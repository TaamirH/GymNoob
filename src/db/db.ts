import Dexie, { type EntityTable } from 'dexie'
import type {
  Bodyweight,
  Exercise,
  Meta,
  Prescription,
  Routine,
  Settings,
  Workout,
  WorkoutItem,
  WorkoutSet,
} from './types'
import { DEFAULT_SETTINGS } from './types'
import { BUILTIN_EXERCISES, DEFAULT_ROUTINE } from '@/data/exercises'

export class GymDB extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>
  routines!: EntityTable<Routine, 'id'>
  prescriptions!: EntityTable<Prescription, 'exerciseId'>
  workouts!: EntityTable<Workout, 'id'>
  workoutItems!: EntityTable<WorkoutItem, 'id'>
  sets!: EntityTable<WorkoutSet, 'id'>
  bodyweight!: EntityTable<Bodyweight, 'id'>
  settings!: EntityTable<Settings, 'id'>
  meta!: EntityTable<Meta, 'key'>

  constructor() {
    super('gymnoob')
    this.version(1).stores({
      exercises: 'id, *primaryMuscles, isCustom',
      routines: 'id',
      prescriptions: 'exerciseId',
      workouts: 'id, status, startedAt, finishedAt',
      workoutItems: 'id, workoutId, exerciseId, [workoutId+order]',
      sets: 'id, workoutId, workoutItemId, exerciseId, completedAt, [exerciseId+completedAt]',
      bodyweight: '++id, date',
      settings: 'id',
      meta: 'key',
    })
  }
}

export const db = new GymDB()

export const SCHEMA_VERSION = 1

/**
 * Idempotent seed. Inserts built-in exercises, the default routine, settings and
 * prescriptions when missing. Refreshes content fields (names, muscles, guides) of
 * built-in exercises so guide fixes ship with app updates without touching user tuning.
 */
export async function ensureSeed(): Promise<void> {
  await db.transaction('rw', db.exercises, db.routines, db.settings, db.prescriptions, async () => {
    for (const ex of BUILTIN_EXERCISES) {
      const existing = await db.exercises.get(ex.id)
      if (!existing) {
        await db.exercises.add(ex)
      } else {
        await db.exercises.update(ex.id, {
          nameEn: ex.nameEn,
          nameHe: ex.nameHe,
          primaryMuscles: ex.primaryMuscles,
          secondaryMuscles: ex.secondaryMuscles,
          equipment: ex.equipment,
          isAssisted: ex.isAssisted,
          guideHe: ex.guideHe,
          mediaUrl: ex.mediaUrl,
          attribution: ex.attribution,
        })
      }
    }

    const routineCount = await db.routines.count()
    if (routineCount === 0) {
      await db.routines.add(DEFAULT_ROUTINE)
    }

    if (!(await db.settings.get('settings'))) {
      await db.settings.add(DEFAULT_SETTINGS)
    } else {
      // Backfill any settings keys added in later versions.
      const current = await db.settings.get('settings')
      await db.settings.put({ ...DEFAULT_SETTINGS, ...current, id: 'settings' })
    }

    const routines = await db.routines.toArray()
    for (const routine of routines) {
      for (const item of routine.items) {
        if (!(await db.prescriptions.get(item.exerciseId))) {
          await db.prescriptions.add({
            exerciseId: item.exerciseId,
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
      }
    }
  })
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const row = await db.meta.get(key)
  return row?.value as T | undefined
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value })
}
