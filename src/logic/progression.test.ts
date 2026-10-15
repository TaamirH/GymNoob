import { describe, expect, it } from 'vitest'
import { nextPrescription, type SessionResult } from './progression'

const machine = { isAssisted: false, incrementKg: 5 }
const assisted = { isAssisted: true, incrementKg: 5 }
const rx = { weightKg: 40, sets: 2, minReps: 10, maxReps: 15 }

function session(weightKg: number, reps: number[], finishedAt = 1, effort: 'easy' | 'ok' | 'hard' | 'failed' = 'ok'): SessionResult {
  return { workoutId: `w${finishedAt}`, finishedAt, sets: reps.map((r) => ({ weightKg, reps: r, effort })) }
}

describe('nextPrescription', () => {
  it('does nothing without history', () => {
    const out = nextPrescription(machine, rx, [])
    expect(out.change).toBe('none')
    expect(out.weightKg).toBe(40)
    expect(out.repsPerSet).toEqual([10, 10])
  })

  it('adopts the first session weight as the base', () => {
    const out = nextPrescription(machine, { ...rx, weightKg: null }, [session(35, [12, 11])])
    expect(out.change).toBe('first')
    expect(out.weightKg).toBe(35)
    expect(out.repsPerSet).toEqual([12, 11])
  })

  it('bumps when every set hits the top of the range', () => {
    const out = nextPrescription(machine, rx, [session(40, [15, 15])])
    expect(out.change).toBe('bump')
    expect(out.weightKg).toBe(45)
    expect(out.delta).toBe(5)
    expect(out.repsPerSet).toEqual([10, 10])
  })

  it('holds when only one set hits the top', () => {
    const out = nextPrescription(machine, rx, [session(40, [15, 13])])
    expect(out.change).toBe('hold')
    expect(out.weightKg).toBe(40)
    expect(out.repsPerSet).toEqual([15, 13])
  })

  it('holds when the user did fewer sets than prescribed', () => {
    const out = nextPrescription(machine, rx, [session(40, [15])])
    expect(out.change).toBe('hold')
    expect(out.repsPerSet).toEqual([15, 10])
  })

  it('does not bump a set marked failed even at max reps', () => {
    const out = nextPrescription(machine, rx, [session(40, [15, 15], 1, 'failed')])
    expect(out.change).toBe('hold')
  })

  it('uses the last set weight as the base when sets differ', () => {
    const s: SessionResult = { workoutId: 'w', finishedAt: 1, sets: [{ weightKg: 40, reps: 15, effort: 'ok' }, { weightKg: 45, reps: 15, effort: 'ok' }] }
    const out = nextPrescription(machine, rx, [s])
    expect(out.change).toBe('hold')
    expect(out.weightKg).toBe(45)
  })

  it('inverts direction for assisted machines', () => {
    const out = nextPrescription(assisted, rx, [session(40, [15, 15])])
    expect(out.change).toBe('bump')
    expect(out.weightKg).toBe(35)
    expect(out.delta).toBe(-5)
  })

  it('never goes below zero assist', () => {
    const out = nextPrescription(assisted, { ...rx, weightKg: 0 }, [session(0, [15, 15])])
    expect(out.weightKg).toBe(0)
    expect(out.delta).toBe(0)
  })

  it('deloads after three failed sessions at the same weight', () => {
    const hist = [session(40, [9, 8], 3), session(40, [9, 9], 2), session(40, [10, 8], 1)]
    const out = nextPrescription(machine, rx, hist)
    expect(out.change).toBe('deload')
    expect(out.weightKg).toBe(35)
    expect(out.delta).toBe(-5)
  })

  it('does not deload when one of the three sessions was at another weight', () => {
    const hist = [session(40, [9, 8], 3), session(35, [9, 9], 2), session(40, [10, 8], 1)]
    const out = nextPrescription(machine, rx, hist)
    expect(out.change).toBe('hold')
  })

  it('does not deload after only two failed sessions', () => {
    const hist = [session(40, [9, 8], 2), session(40, [9, 9], 1)]
    const out = nextPrescription(machine, rx, hist)
    expect(out.change).toBe('hold')
  })

  it('deloads assisted by adding assist', () => {
    const hist = [session(20, [8, 8], 3), session(20, [9, 8], 2), session(20, [8, 8], 1)]
    const out = nextPrescription(assisted, { ...rx, weightKg: 20 }, hist)
    expect(out.change).toBe('deload')
    expect(out.weightKg).toBe(25)
  })

  it('sorts history newest first regardless of input order', () => {
    const hist = [session(40, [10, 10], 1), session(40, [15, 15], 2)]
    const out = nextPrescription(machine, rx, hist)
    expect(out.change).toBe('bump')
  })
})
