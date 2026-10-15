import type { Effort, Prescription, ProgressionChange, ProgressionParams } from '@/db/types'

/** One completed session for one exercise. Working sets only, in set order. */
export interface SessionResult {
  workoutId: string
  finishedAt: number
  sets: { weightKg: number; reps: number; effort: Effort }[]
}

export interface ExerciseRules {
  isAssisted: boolean
  incrementKg: number
}

export interface ProgressionOutcome {
  change: ProgressionChange
  weightKg: number | null
  repsPerSet: number[]
  /** signed change applied to the stack weight */
  delta: number
  params: ProgressionParams
}

export const DELOAD_AFTER_FAILED_SESSIONS = 3

function fill(n: number, value: number): number[] {
  return Array.from({ length: n }, () => value)
}

function sessionFailed(s: SessionResult, minReps: number): boolean {
  return s.sets.some((set) => set.reps < minReps || set.effort === 'failed')
}

/**
 * Double progression.
 *
 * - No history: nothing to do.
 * - First session: adopt the weight used as the base.
 * - Bump: every prescribed set hit maxReps at the same weight.
 * - Deload: the last N sessions at this weight each had a set below minReps or marked failed.
 * - Otherwise hold, and show last session's reps per set as the thing to beat.
 *
 * Assisted machines invert the direction: a bump removes assist, a deload adds it.
 */
export function nextPrescription(
  rules: ExerciseRules,
  current: Pick<Prescription, 'weightKg' | 'sets' | 'minReps' | 'maxReps'>,
  history: SessionResult[],
): ProgressionOutcome {
  const sessions = [...history].filter((s) => s.sets.length > 0).sort((a, b) => b.finishedAt - a.finishedAt)
  const { sets: nSets, minReps, maxReps } = current

  if (sessions.length === 0) {
    return { change: 'none', weightKg: current.weightKg, repsPerSet: fill(nSets, minReps), delta: 0, params: {} }
  }

  const latest = sessions[0]
  const base = latest.sets[latest.sets.length - 1].weightKg
  const dir = rules.isAssisted ? -1 : 1
  const step = rules.incrementKg * dir

  const lastReps = fill(nSets, minReps).map((v, i) => latest.sets[i]?.reps ?? v)

  if (current.weightKg === null) {
    return { change: 'first', weightKg: base, repsPerSet: lastReps, delta: 0, params: { weight: base } }
  }

  const allSameWeight = latest.sets.every((s) => s.weightKg === base)
  const enoughSets = latest.sets.length >= nSets
  const allHitMax = latest.sets.every((s) => s.reps >= maxReps && s.effort !== 'failed')

  if (allSameWeight && enoughSets && allHitMax) {
    const next = Math.max(0, base + step)
    return {
      change: 'bump',
      weightKg: next,
      repsPerSet: fill(nSets, minReps),
      delta: next - base,
      params: { max: maxReps, sets: latest.sets.length, weight: base },
    }
  }

  const recentAtBase = sessions.slice(0, DELOAD_AFTER_FAILED_SESSIONS)
  const deload =
    recentAtBase.length >= DELOAD_AFTER_FAILED_SESSIONS &&
    recentAtBase.every((s) => s.sets[s.sets.length - 1].weightKg === base && sessionFailed(s, minReps))

  if (deload) {
    const next = Math.max(0, base - step)
    return {
      change: 'deload',
      weightKg: next,
      repsPerSet: fill(nSets, minReps),
      delta: next - base,
      params: { min: minReps, weight: base },
    }
  }

  return { change: 'hold', weightKg: base, repsPerSet: lastReps, delta: 0, params: { weight: base } }
}
