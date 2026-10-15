import { describe, expect, it } from 'vitest'
import { detectPRs, e1rm, effectiveLoad, volume } from './stats'
import type { Exercise, WorkoutSet } from '@/db/types'

const ex = (id: string, isAssisted = false): Exercise => ({
  id,
  nameEn: id,
  nameHe: id,
  primaryMuscles: ['chest'],
  secondaryMuscles: [],
  equipment: 'machine',
  isAssisted,
  incrementKg: 5,
  defaultMinReps: 10,
  defaultMaxReps: 15,
  defaultRestSec: 90,
  guideHe: { setup: [], steps: [], mistakes: [], cues: [] },
})

const set = (exerciseId: string, workoutId: string, weightKg: number, reps: number, n = 1): WorkoutSet => ({
  id: `${workoutId}-${exerciseId}-${n}`,
  workoutId,
  workoutItemId: 'i',
  exerciseId,
  setNumber: n,
  weightKg,
  reps,
  effort: 'ok',
  type: 'working',
  completedAt: 1,
})

describe('stats', () => {
  it('e1rm follows Epley', () => {
    expect(e1rm(100, 1)).toBe(100)
    expect(e1rm(100, 10)).toBeCloseTo(133.33, 1)
  })

  it('effective load subtracts assist from bodyweight', () => {
    expect(effectiveLoad({ isAssisted: true }, 30, 80)).toBe(50)
    expect(effectiveLoad({ isAssisted: true }, 30, null)).toBeNull()
    expect(effectiveLoad({ isAssisted: false }, 30, null)).toBe(30)
  })

  it('volume counts assisted sets only with a bodyweight', () => {
    const map = new Map([
      ['a', ex('a')],
      ['b', ex('b', true)],
    ])
    const sets = [set('a', 'w', 40, 10), set('b', 'w', 30, 10)]
    expect(volume(sets, map, null)).toBe(400)
    expect(volume(sets, map, 80)).toBe(400 + 500)
  })

  it('detects a weight PR and a reps PR', () => {
    const map = new Map([['a', ex('a')]])
    const prev = [set('a', 'w1', 40, 12), set('a', 'w1', 40, 11, 2)]
    expect(detectPRs([set('a', 'w2', 45, 10)], prev, map)).toMatchObject([{ kind: 'weight', weightKg: 45 }])
    expect(detectPRs([set('a', 'w2', 40, 13)], prev, map)).toMatchObject([{ kind: 'reps', reps: 13 }])
    expect(detectPRs([set('a', 'w2', 40, 12)], prev, map)).toEqual([])
  })

  it('treats less assist as a weight PR on assisted machines', () => {
    const map = new Map([['b', ex('b', true)]])
    const prev = [set('b', 'w1', 30, 12)]
    expect(detectPRs([set('b', 'w2', 25, 10)], prev, map)).toMatchObject([{ kind: 'weight', weightKg: 25 }])
    expect(detectPRs([set('b', 'w2', 35, 15)], prev, map)).toEqual([])
  })

  it('ignores first sessions', () => {
    const map = new Map([['a', ex('a')]])
    expect(detectPRs([set('a', 'w1', 40, 12)], [], map)).toEqual([])
  })
})
