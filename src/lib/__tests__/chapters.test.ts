import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { parseSpacing, getRetentionPercent, getRecommendations } from '../chapters'
import type { Chapter } from '../chapters'

// ── parseSpacing ──────────────────────────────────────────────────────────────

describe('parseSpacing', () => {
  it('parses space-separated numbers', () => {
    expect(parseSpacing('1 1 2 5 7')).toEqual([1, 1, 2, 5, 7])
  })
  it('filters zeros and NaN', () => {
    expect(parseSpacing('1 0 2 abc 7')).toEqual([1, 2, 7])
  })
  it('handles extra whitespace', () => {
    expect(parseSpacing('  1  1  2  ')).toEqual([1, 1, 2])
  })
  it('returns empty array for blank string', () => {
    expect(parseSpacing('')).toEqual([])
  })
})

// ── getRetentionPercent ───────────────────────────────────────────────────────

const STUDIED_AT = new Date('2024-06-15T12:00:00.000Z').toISOString()

const baseChapter: Chapter = {
  id: 'ch-1',
  subjectId: 'sub-1',
  name: 'Test',
  studyCount: 1,
  lastStudiedAt: STUDIED_AT,
  createdAt: '2024-06-01T00:00:00.000Z',
  focusType: null,
  spacingOverride: '1 1 2 5 7', // interval for studyCount=1 is 1 day
}

describe('getRetentionPercent', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('returns null when never studied', () => {
    const ch = { ...baseChapter, studyCount: 0, lastStudiedAt: null }
    expect(getRetentionPercent(ch)).toBeNull()
  })
  it('returns 100 immediately after study', () => {
    vi.setSystemTime(new Date('2024-06-15T12:00:00.000Z'))
    expect(getRetentionPercent(baseChapter)).toBe(100)
  })
  it('returns 50 at the scheduled interval boundary (1 day)', () => {
    vi.setSystemTime(new Date('2024-06-16T12:00:00.000Z'))
    expect(getRetentionPercent(baseChapter)).toBe(50)
  })
  it('returns 25 at twice the interval (2 days)', () => {
    vi.setSystemTime(new Date('2024-06-17T12:00:00.000Z'))
    expect(getRetentionPercent(baseChapter)).toBe(25)
  })
  it('returns 0 in the far future', () => {
    vi.setSystemTime(new Date('2024-06-25T12:00:00.000Z')) // 10 days later
    expect(getRetentionPercent(baseChapter)).toBe(0)
  })
})

// ── getRecommendations ────────────────────────────────────────────────────────

// Local June 15 noon — unambiguously June 15 in any timezone
const NOW = new Date(2024, 5, 15, 12, 0, 0)

function makeChapter(overrides: Partial<Chapter> & { id: string }): Chapter {
  return {
    subjectId: 'sub-1',
    name: 'Chapter',
    studyCount: 1,
    lastStudiedAt: new Date(2024, 5, 10, 12, 0, 0).toISOString(),
    createdAt: new Date(2024, 5, 1, 0, 0, 0).toISOString(),
    focusType: null,
    spacingOverride: '1',
    ...overrides,
  }
}

describe('getRecommendations', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns empty when no chapters stored', () => {
    vi.setSystemTime(NOW)
    expect(getRecommendations({})).toEqual([])
  })

  it('excludes chapters with studyCount 0', () => {
    const chapters = [makeChapter({ id: 'ch-1', studyCount: 0, lastStudiedAt: null })]
    localStorage.setItem('study-buddy-chapters', JSON.stringify(chapters))
    vi.setSystemTime(NOW)
    expect(getRecommendations({ 'sub-1': 'Math' })).toEqual([])
  })

  it('excludes chapters not yet due', () => {
    // studied yesterday, interval=7 → due in 6 days
    const yesterday = new Date(2024, 5, 14, 12, 0, 0).toISOString()
    const chapters = [makeChapter({ id: 'ch-1', lastStudiedAt: yesterday, spacingOverride: '7' })]
    localStorage.setItem('study-buddy-chapters', JSON.stringify(chapters))
    vi.setSystemTime(NOW)
    expect(getRecommendations({ 'sub-1': 'Math' })).toEqual([])
  })

  it('returns overdue chapters sorted by daysOverdue descending', () => {
    const chapters = [
      // studied June 10, interval=1 → due June 11 → 4 days overdue
      makeChapter({ id: 'ch-1', lastStudiedAt: new Date(2024, 5, 10, 12, 0, 0).toISOString(), spacingOverride: '1' }),
      // studied June 14, interval=1 → due June 15 → 0 days overdue
      makeChapter({ id: 'ch-2', lastStudiedAt: new Date(2024, 5, 14, 12, 0, 0).toISOString(), spacingOverride: '1' }),
    ]
    localStorage.setItem('study-buddy-chapters', JSON.stringify(chapters))
    vi.setSystemTime(NOW)

    const result = getRecommendations({ 'sub-1': 'Math' })
    expect(result).toHaveLength(2)
    expect(result[0].chapter.id).toBe('ch-1')
    expect(result[0].daysOverdue).toBe(4)
    expect(result[1].chapter.id).toBe('ch-2')
    expect(result[1].daysOverdue).toBe(0)
  })

  it('maps subjectId to subjectName, falls back to Unknown', () => {
    const chapters = [makeChapter({ id: 'ch-1', subjectId: 'sub-99' })]
    localStorage.setItem('study-buddy-chapters', JSON.stringify(chapters))
    vi.setSystemTime(NOW)

    const result = getRecommendations({ 'sub-1': 'Math' })
    expect(result[0].subjectName).toBe('Unknown')
  })
})
