import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { daysSince, formatHM, formatTimeHHMM, formatSecondsMMSS } from '../time'

describe('formatHM', () => {
  it('formats zero minutes', () => {
    expect(formatHM(0)).toBe('0m')
  })
  it('formats sub-hour minutes', () => {
    expect(formatHM(45)).toBe('45m')
    expect(formatHM(59)).toBe('59m')
  })
  it('formats hours and minutes', () => {
    expect(formatHM(60)).toBe('1h 0m')
    expect(formatHM(90)).toBe('1h 30m')
    expect(formatHM(125)).toBe('2h 5m')
  })
})

describe('formatTimeHHMM', () => {
  it('pads single-digit hours and minutes', () => {
    expect(formatTimeHHMM(new Date(2024, 0, 1, 9, 5))).toBe('09:05')
  })
  it('formats midnight', () => {
    expect(formatTimeHHMM(new Date(2024, 0, 1, 0, 0))).toBe('00:00')
  })
  it('formats afternoon time', () => {
    expect(formatTimeHHMM(new Date(2024, 0, 1, 14, 30))).toBe('14:30')
  })
})

describe('formatSecondsMMSS', () => {
  it('formats zero', () => {
    expect(formatSecondsMMSS(0)).toBe('00:00')
  })
  it('formats sub-minute', () => {
    expect(formatSecondsMMSS(9)).toBe('00:09')
    expect(formatSecondsMMSS(45)).toBe('00:45')
  })
  it('formats exactly one minute', () => {
    expect(formatSecondsMMSS(60)).toBe('01:00')
  })
  it('formats minutes and seconds', () => {
    expect(formatSecondsMMSS(90)).toBe('01:30')
  })
  it('handles values over one hour', () => {
    expect(formatSecondsMMSS(3661)).toBe('61:01')
  })
})

describe('daysSince', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 5, 15, 12, 0, 0)) // local June 15 noon
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns null for null input', () => {
    expect(daysSince(null)).toBeNull()
  })
  it('returns 0 for same day', () => {
    expect(daysSince(new Date(2024, 5, 15, 6, 0, 0).toISOString())).toBe(0)
  })
  it('returns 3 for 3 days ago', () => {
    expect(daysSince(new Date(2024, 5, 12, 12, 0, 0).toISOString())).toBe(3)
  })
  it('returns 7 for one week ago', () => {
    expect(daysSince(new Date(2024, 5, 8, 12, 0, 0).toISOString())).toBe(7)
  })
})
