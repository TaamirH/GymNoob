import type { Exercise, WorkoutSet } from '@/db/types'

/** Epley estimate. Only meaningful for non-assisted lifts and reps <= ~12. */
export function e1rm(weightKg: number, reps: number): number {
  if (reps <= 1) return weightKg
  return weightKg * (1 + reps / 30)
}

export function effectiveLoad(ex: Pick<Exercise, 'isAssisted'>, weightKg: number, bodyweightKg: number | null): number | null {
  if (!ex.isAssisted) return weightKg
  if (bodyweightKg === null) return null
  return Math.max(0, bodyweightKg - weightKg)
}

/** Sum of load × reps over working sets. Assisted sets need a bodyweight to count. */
export function volume(sets: WorkoutSet[], exMap: Map<string, Exercise>, bodyweightKg: number | null): number {
  let total = 0
  for (const s of sets) {
    if (s.type !== 'working') continue
    const ex = exMap.get(s.exerciseId)
    if (!ex) continue
    const load = effectiveLoad(ex, s.weightKg, bodyweightKg)
    if (load === null) continue
    total += load * s.reps
  }
  return total
}

export interface PR {
  exerciseId: string
  kind: 'weight' | 'reps'
  weightKg: number
  reps: number
  previous?: { weightKg: number; reps: number }
}

/** "Better weight" means heavier for normal machines and less assist for assisted ones. */
function betterWeight(ex: Pick<Exercise, 'isAssisted'>, a: number, b: number): boolean {
  return ex.isAssisted ? a < b : a > b
}

/**
 * PRs achieved by `current` sets against `previous` sets of the same exercises.
 * weight PR: a new best weight (at any reps).
 * reps PR: most reps ever at the existing best weight.
 */
export function detectPRs(current: WorkoutSet[], previous: WorkoutSet[], exMap: Map<string, Exercise>): PR[] {
  const prs: PR[] = []
  const byEx = new Map<string, WorkoutSet[]>()
  for (const s of current) {
    if (s.type !== 'working' || s.reps <= 0) continue
    byEx.set(s.exerciseId, [...(byEx.get(s.exerciseId) ?? []), s])
  }
  for (const [exerciseId, sets] of byEx) {
    const ex = exMap.get(exerciseId)
    if (!ex) continue
    const prev = previous.filter((p) => p.exerciseId === exerciseId && p.type === 'working' && p.reps > 0)
    if (prev.length === 0) continue // first session: everything is a "PR", not worth celebrating

    let prevBestW = prev[0].weightKg
    for (const p of prev) if (betterWeight(ex, p.weightKg, prevBestW)) prevBestW = p.weightKg
    const prevBestRepsAtW = Math.max(...prev.filter((p) => p.weightKg === prevBestW).map((p) => p.reps))

    let bestNow = sets[0]
    for (const s of sets) if (betterWeight(ex, s.weightKg, bestNow.weightKg) || (s.weightKg === bestNow.weightKg && s.reps > bestNow.reps)) bestNow = s

    if (betterWeight(ex, bestNow.weightKg, prevBestW)) {
      prs.push({ exerciseId, kind: 'weight', weightKg: bestNow.weightKg, reps: bestNow.reps, previous: { weightKg: prevBestW, reps: prevBestRepsAtW } })
    } else if (bestNow.weightKg === prevBestW && bestNow.reps > prevBestRepsAtW) {
      prs.push({ exerciseId, kind: 'reps', weightKg: bestNow.weightKg, reps: bestNow.reps, previous: { weightKg: prevBestW, reps: prevBestRepsAtW } })
    }
  }
  return prs
}

export interface ExerciseBest {
  heaviest: { weightKg: number; reps: number; at: number } | null
  mostReps: { weightKg: number; reps: number; at: number } | null
  bestE1rm: { value: number; weightKg: number; reps: number; at: number } | null
}

export function bestSets(ex: Pick<Exercise, 'isAssisted'>, sets: WorkoutSet[]): ExerciseBest {
  const working = sets.filter((s) => s.type === 'working' && s.reps > 0)
  if (working.length === 0) return { heaviest: null, mostReps: null, bestE1rm: null }
  let heaviest = working[0]
  let mostReps = working[0]
  let bestE = working[0]
  for (const s of working) {
    if (betterWeight(ex, s.weightKg, heaviest.weightKg) || (s.weightKg === heaviest.weightKg && s.reps > heaviest.reps)) heaviest = s
    if (s.reps > mostReps.reps || (s.reps === mostReps.reps && betterWeight(ex, s.weightKg, mostReps.weightKg))) mostReps = s
    if (!ex.isAssisted && e1rm(s.weightKg, s.reps) > e1rm(bestE.weightKg, bestE.reps)) bestE = s
  }
  return {
    heaviest: { weightKg: heaviest.weightKg, reps: heaviest.reps, at: heaviest.completedAt },
    mostReps: { weightKg: mostReps.weightKg, reps: mostReps.reps, at: mostReps.completedAt },
    bestE1rm: ex.isAssisted ? null : { value: e1rm(bestE.weightKg, bestE.reps), weightKg: bestE.weightKg, reps: bestE.reps, at: bestE.completedAt },
  }
}
