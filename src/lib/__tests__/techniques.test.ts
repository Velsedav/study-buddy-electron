import { describe, it, expect } from 'vitest'
import { getTierColor } from '../techniques'

describe('getTierColor', () => {
  it('S tier returns gradient', () => {
    expect(getTierColor('S')).toBe('linear-gradient(135deg, var(--primary), var(--accent))')
  })
  it('A tier returns success color', () => {
    expect(getTierColor('A')).toBe('var(--success)')
  })
  it('B tier returns blue', () => {
    expect(getTierColor('B')).toBe('#3b82f6')
  })
  it('C tier returns cyan', () => {
    expect(getTierColor('C')).toBe('#22d3ee')
  })
  it('D tier returns amber', () => {
    expect(getTierColor('D')).toBe('#f59e0b')
  })
  it('E tier returns danger color', () => {
    expect(getTierColor('E')).toBe('var(--danger)')
  })
  it('F tier returns gray', () => {
    expect(getTierColor('F')).toBe('#9ca3af')
  })
})
