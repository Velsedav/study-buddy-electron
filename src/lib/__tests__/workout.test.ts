import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isMuscleEligible } from '../workout'
import type { WorkoutLog } from '../workout'

// isMuscleEligible uses midnight-normalized dates (local time)
const NOW = new Date(2024, 5, 15, 12, 0, 0) // local June 15

describe('isMuscleEligible', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => vi.useRealTimers())

  it('returns true when muscle has no log entry', () => {
    const log: WorkoutLog = {}
    expect(isMuscleEligible('biceps', log)).toBe(true)
  })

  it('returns false when worked today', () => {
    const log: WorkoutLog = { biceps: new Date(2024, 5, 15, 8, 0, 0).toISOString() }
    expect(isMuscleEligible('biceps', log)).toBe(false)
  })

  it('returns false when worked yesterday (1 day ago, need >= 2)', () => {
    const log: WorkoutLog = { biceps: new Date(2024, 5, 14, 12, 0, 0).toISOString() }
    expect(isMuscleEligible('biceps', log)).toBe(false)
  })

  it('returns true when worked 2 days ago', () => {
    const log: WorkoutLog = { biceps: new Date(2024, 5, 13, 12, 0, 0).toISOString() }
    expect(isMuscleEligible('biceps', log)).toBe(true)
  })

  it('only checks the requested muscle id', () => {
    const log: WorkoutLog = {
      biceps: new Date(2024, 5, 15, 8, 0, 0).toISOString(), // worked today
      triceps: new Date(2024, 5, 13, 8, 0, 0).toISOString(), // 2 days ago
    }
    expect(isMuscleEligible('biceps', log)).toBe(false)
    expect(isMuscleEligible('triceps', log)).toBe(true)
  })
})
