import { db, ensureSeed, SCHEMA_VERSION } from './db'
import type { Bodyweight, Exercise, Meta, Prescription, Routine, Settings, Workout, WorkoutItem, WorkoutSet } from './types'

export interface BackupFile {
  app: 'gymnoob'
  schemaVersion: number
  exportedAt: string
  data: {
    exercises: Exercise[]
    routines: Routine[]
    prescriptions: Prescription[]
    workouts: Workout[]
    workoutItems: WorkoutItem[]
    sets: WorkoutSet[]
    bodyweight: Bodyweight[]
    settings: Settings[]
    meta: Meta[]
  }
}

export async function buildBackup(): Promise<BackupFile> {
  const [exercises, routines, prescriptions, workouts, workoutItems, sets, bodyweight, settings, meta] = await Promise.all([
    db.exercises.toArray(),
    db.routines.toArray(),
    db.prescriptions.toArray(),
    db.workouts.toArray(),
    db.workoutItems.toArray(),
    db.sets.toArray(),
    db.bodyweight.toArray(),
    db.settings.toArray(),
    db.meta.toArray(),
  ])
  return {
    app: 'gymnoob',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: { exercises, routines, prescriptions, workouts, workoutItems, sets, bodyweight, settings, meta },
  }
}

export function downloadText(text: string, filename: string, type = 'application/json') {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export async function exportBackup(): Promise<void> {
  const file = await buildBackup()
  const stamp = file.exportedAt.slice(0, 10)
  downloadText(JSON.stringify(file, null, 2), `gymnoob-backup-${stamp}.json`)
}

function isArr(x: unknown): x is unknown[] {
  return Array.isArray(x)
}

export function parseBackup(text: string): BackupFile {
  const raw = JSON.parse(text) as Partial<BackupFile>
  if (!raw || raw.app !== 'gymnoob' || typeof raw.data !== 'object' || raw.data === null) throw new Error('not-a-backup')
  const d = raw.data as Record<string, unknown>
  const pick = <T>(k: string): T[] => (isArr(d[k]) ? (d[k] as T[]) : [])
  return {
    app: 'gymnoob',
    schemaVersion: typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 1,
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
    data: {
      exercises: pick('exercises'),
      routines: pick('routines'),
      prescriptions: pick('prescriptions'),
      workouts: pick('workouts'),
      workoutItems: pick('workoutItems'),
      sets: pick('sets'),
      bodyweight: pick('bodyweight'),
      settings: pick('settings'),
      meta: pick('meta'),
    },
  }
}

export interface ImportSummary {
  workouts: number
  sets: number
  exercises: number
  bodyweight: number
}

export async function importBackup(file: BackupFile, mode: 'replace' | 'merge'): Promise<ImportSummary> {
  const { data } = file
  const tables = [db.exercises, db.routines, db.prescriptions, db.workouts, db.workoutItems, db.sets, db.bodyweight, db.settings, db.meta]
  await db.transaction('rw', tables, async () => {
    if (mode === 'replace') {
      for (const t of tables) await t.clear()
    }
    await db.exercises.bulkPut(data.exercises)
    await db.routines.bulkPut(data.routines)
    await db.prescriptions.bulkPut(data.prescriptions)
    await db.workouts.bulkPut(data.workouts)
    await db.workoutItems.bulkPut(data.workoutItems)
    await db.sets.bulkPut(data.sets)
    for (const b of data.bodyweight) {
      const existing = await db.bodyweight.where('date').equals(b.date).first()
      if (existing?.id !== undefined) await db.bodyweight.update(existing.id, { kg: b.kg })
      else await db.bodyweight.add({ date: b.date, kg: b.kg })
    }
    if (data.settings[0]) await db.settings.put({ ...data.settings[0], id: 'settings' })
    for (const m of data.meta) if (m.key !== 'rest') await db.meta.put(m)
  })
  await ensureSeed()
  return { workouts: data.workouts.length, sets: data.sets.length, exercises: data.exercises.length, bodyweight: data.bodyweight.length }
}

export async function resetAll(): Promise<void> {
  const tables = [db.exercises, db.routines, db.prescriptions, db.workouts, db.workoutItems, db.sets, db.bodyweight, db.settings, db.meta]
  await db.transaction('rw', tables, async () => {
    for (const t of tables) await t.clear()
  })
  await ensureSeed()
}
