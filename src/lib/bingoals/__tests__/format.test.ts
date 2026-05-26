import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { clamp01, formatDuration, daysAgo } from '../format'

describe('clamp01', () => {
  it('clamps below 0 to 0', () => {
    expect(clamp01(-1)).toBe(0)
    expect(clamp01(-0.001)).toBe(0)
  })
  it('clamps above 1 to 1', () => {
    expect(clamp01(2)).toBe(1)
    expect(clamp01(1.001)).toBe(1)
  })
  it('passes through values in [0, 1]', () => {
    expect(clamp01(0)).toBe(0)
    expect(clamp01(0.5)).toBe(0.5)
    expect(clamp01(1)).toBe(1)
  })
})

describe('formatDuration', () => {
  it('formats zero', () => {
    expect(formatDuration(0)).toBe('00:00')
  })
  it('clamps negative to 00:00', () => {
    expect(formatDuration(-5000)).toBe('00:00')
  })
  it('formats sub-minute (MM:SS)', () => {
    expect(formatDuration(9000)).toBe('00:09')
    expect(formatDuration(45000)).toBe('00:45')
  })
  it('formats exactly one minute', () => {
    expect(formatDuration(60000)).toBe('01:00')
  })
  it('formats MM:SS when under an hour', () => {
    expect(formatDuration(90500)).toBe('01:30')
    expect(formatDuration(3599000)).toBe('59:59')
  })
  it('formats H:MM:SS for >= 1 hour', () => {
    expect(formatDuration(3600000)).toBe('1:00:00')
    expect(formatDuration(3661000)).toBe('1:01:01')
    expect(formatDuration(7322000)).toBe('2:02:02')
  })
})

describe('daysAgo', () => {
  // Use local noon to ensure unambiguous calendar day in any timezone
  const NOW = new Date(2024, 5, 15, 12, 0, 0)

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => vi.useRealTimers())

  it('returns null for null input', () => {
    expect(daysAgo(null)).toBeNull()
  })
  it('returns 0 for same calendar day', () => {
    const todayMorning = new Date(2024, 5, 15, 3, 0, 0).getTime()
    expect(daysAgo(todayMorning)).toBe(0)
  })
  it('returns 1 for yesterday', () => {
    const yesterday = new Date(2024, 5, 14, 23, 0, 0).getTime()
    expect(daysAgo(yesterday)).toBe(1)
  })
  it('returns 7 for one week ago', () => {
    const oneWeekAgo = new Date(2024, 5, 8, 10, 0, 0).getTime()
    expect(daysAgo(oneWeekAgo)).toBe(7)
  })
  it('returns 0 minimum (never negative) for future dates', () => {
    const future = new Date(2024, 5, 20, 0, 0, 0).getTime()
    expect(daysAgo(future)).toBe(0)
  })
})
