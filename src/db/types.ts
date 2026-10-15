export type Effort = 'easy' | 'ok' | 'hard' | 'failed'
export type SetType = 'working' | 'warmup'
export type WorkoutStatus = 'active' | 'completed' | 'discarded'
export type PrescriptionSource = 'auto' | 'manual'
export type ProgressionChange = 'none' | 'first' | 'bump' | 'hold' | 'deload'

export interface ProgressionParams {
  max?: number
  min?: number
  sets?: number
  weight?: number
}

export type MuscleGroup =
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'core'
  | 'calves'

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'quads',
  'hamstrings',
  'glutes',
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'core',
  'calves',
]

export type Equipment = 'machine' | 'assisted-machine' | 'cable' | 'dumbbell' | 'barbell' | 'bodyweight'

export interface ExerciseGuide {
  setup: string[]
  steps: string[]
  mistakes: string[]
  cues: string[]
}

export interface Exercise {
  id: string
  nameEn: string
  nameHe: string
  primaryMuscles: MuscleGroup[]
  secondaryMuscles: MuscleGroup[]
  equipment: Equipment
  /** Assisted machines: more stack weight = easier. Progression goes down. */
  isAssisted: boolean
  incrementKg: number
  defaultMinReps: number
  defaultMaxReps: number
  defaultRestSec: number
  guideHe: ExerciseGuide
  /** set when the user edited the guide; built-in refresh then leaves it alone */
  guideEdited?: boolean
  mediaUrl?: string
  attribution?: string
  isCustom?: boolean
}

export interface RoutineItem {
  exerciseId: string
  order: number
  sets: number
  minReps: number
  maxReps: number
  restSec: number
}

export interface Routine {
  id: string
  name: string
  items: RoutineItem[]
}

export interface Prescription {
  exerciseId: string
  /** null until the user has completed a session and picked a starting weight */
  weightKg: number | null
  sets: number
  minReps: number
  maxReps: number
  /** reps to show per set row next time; derived from last session */
  repsPerSet: number[]
  updatedAt: number
  source: PrescriptionSource
  lastChange: ProgressionChange
  /** signed change to the stack weight applied by the last evaluation */
  lastDelta: number
  reasonParams: ProgressionParams
}

export interface Workout {
  id: string
  routineId: string
  routineName: string
  startedAt: number
  finishedAt: number | null
  status: WorkoutStatus
  notes?: string
}

export interface WorkoutItem {
  id: string
  workoutId: string
  exerciseId: string
  order: number
  prescribedWeightKg: number | null
  prescribedReps: number[]
  sets: number
  minReps: number
  maxReps: number
  restSec: number
}

export interface WorkoutSet {
  id: string
  workoutId: string
  workoutItemId: string
  exerciseId: string
  setNumber: number
  weightKg: number
  reps: number
  effort: Effort
  type: SetType
  completedAt: number
}

export interface Bodyweight {
  id?: number
  /** YYYY-MM-DD */
  date: string
  kg: number
}

export type Theme = 'dark' | 'light' | 'system'
export type Language = 'en' | 'he'

export interface Settings {
  id: 'settings'
  units: 'kg'
  language: Language
  theme: Theme
  defaultRestSec: number
  defaultIncrementKg: number
  notificationsEnabled: boolean
  weeklyTarget: number
  /** 0 = Sunday, 1 = Monday */
  weekStartsOn: 0 | 1
  soundEnabled: boolean
  vibrateEnabled: boolean
}

export interface Meta {
  key: string
  value: unknown
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  units: 'kg',
  language: 'en',
  theme: 'dark',
  defaultRestSec: 90,
  defaultIncrementKg: 5,
  notificationsEnabled: false,
  weeklyTarget: 3,
  weekStartsOn: 0,
  soundEnabled: true,
  vibrateEnabled: true,
}
