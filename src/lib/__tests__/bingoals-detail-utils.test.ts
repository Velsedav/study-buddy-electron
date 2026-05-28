import { describe, it, expect } from 'vitest'
import { computeTotalMs, computeLastStudiedTs } from '../bingoals/progress'
import { titleToHue } from '../bingoals/color'

describe('computeTotalMs', () => {
  it('returns 0 for empty map', () => {
    expect(computeTotalMs(new Map())).toBe(0)
  })
  it('sums all total_ms values', () => {
    const map = new Map([
      ['a', { total_ms: 5000, last_end: null }],
      ['b', { total_ms: 3000, last_end: 1000 }],
    ])
    expect(computeTotalMs(map)).toBe(8000)
  })
  it('handles single entry', () => {
    const map = new Map([['x', { total_ms: 7200000, last_end: null }]])
    expect(computeTotalMs(map)).toBe(7200000)
  })
})

describe('computeLastStudiedTs', () => {
  it('returns null for empty inputs', () => {
    expect(computeLastStudiedTs(new Map(), [])).toBe(null)
  })
  it('returns max of last_end values', () => {
    const map = new Map([
      ['a', { total_ms: 0, last_end: 100 }],
      ['b', { total_ms: 0, last_end: 200 }],
    ])
    expect(computeLastStudiedTs(map, [])).toBe(200)
  })
  it('returns max of updated_at when higher than last_end', () => {
    const map = new Map([['a', { total_ms: 0, last_end: 100 }]])
    expect(computeLastStudiedTs(map, [{ updated_at: 300 }])).toBe(300)
  })
  it('ignores last_end when null', () => {
    const map = new Map([['a', { total_ms: 0, last_end: null }]])
    expect(computeLastStudiedTs(map, [{ updated_at: 500 }])).toBe(500)
  })
  it('returns null when all last_end null and no subs', () => {
    const map = new Map([['a', { total_ms: 100, last_end: null }]])
    expect(computeLastStudiedTs(map, [])).toBe(null)
  })
})

describe('titleToHue', () => {
  it('returns a number in [0, 360)', () => {
    const hue = titleToHue('Kind of Blue')
    expect(hue).toBeGreaterThanOrEqual(0)
    expect(hue).toBeLessThan(360)
  })
  it('is deterministic — same title always same hue', () => {
    expect(titleToHue('Moonlight')).toBe(titleToHue('Moonlight'))
  })
  it('returns different hues for different titles', () => {
    expect(titleToHue('Moonlight')).not.toBe(titleToHue('Blonde'))
  })
  it('handles empty string without throwing', () => {
    const hue = titleToHue('')
    expect(hue).toBeGreaterThanOrEqual(0)
    expect(hue).toBeLessThan(360)
  })
})
