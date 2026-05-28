import { describe, it, expect } from 'vitest'
import { progressLabel } from '../bingoals/progress'

describe('progressLabel', () => {
  it('returns X / Y unit for count kind with target and unit', () => {
    expect(progressLabel(0.25, 'count', 12, 'Films')).toBe('3 / 12 Films')
  })

  it('returns X / Y with no unit when goal_unit is null', () => {
    expect(progressLabel(0.5, 'count', 10, null)).toBe('5 / 10')
  })

  it('rounds the done count', () => {
    expect(progressLabel(0.333, 'count', 12, 'albums')).toBe('4 / 12 albums')
  })

  it('returns percentage string for manual kind', () => {
    expect(progressLabel(0.25, 'manual', null, null)).toBe('25%')
  })

  it('returns percentage when goal_target is null regardless of kind', () => {
    expect(progressLabel(0.5, 'count', null, 'books')).toBe('50%')
  })

  it('returns — when percent is null', () => {
    expect(progressLabel(null, 'count', 12, 'Films')).toBe('—')
  })

  it('returns 100% at full completion for manual', () => {
    expect(progressLabel(1.0, 'manual', null, null)).toBe('100%')
  })

  it('returns 12 / 12 Films at full completion for count', () => {
    expect(progressLabel(1.0, 'count', 12, 'Films')).toBe('12 / 12 Films')
  })
})
