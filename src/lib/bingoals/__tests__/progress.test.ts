import { describe, it, expect } from 'vitest'
import { computeObjectivePercent } from '../progress'
import type { Objective, Subobjective } from '../db'

function makeObjective(overrides: Partial<Objective> = {}): Objective {
  return {
    id: 'obj-1',
    title: 'Test objective',
    goal_kind: 'count',
    goal_target: 4,
    goal_unit: null,
    cover_data: null,
    current_value: 0,
    created_at: 0,
    updated_at: 0,
    pin_bottom: 0,
    frequency_days: null,
    ...overrides,
  }
}

function makeSub(overrides: Partial<Subobjective> = {}): Subobjective {
  return {
    id: 'sub-1',
    objective_id: 'obj-1',
    title: 'Task',
    note: null,
    target_total: null,
    progress_current: 0,
    unit: null,
    is_done: 0,
    created_at: 0,
    updated_at: 0,
    ...overrides,
  }
}

// ── count mode ────────────────────────────────────────────────────────────────

describe('computeObjectivePercent — count mode', () => {
  it('returns null when goal_target is null', () => {
    const obj = makeObjective({ goal_target: null })
    expect(computeObjectivePercent(obj, [])).toBeNull()
  })

  it('returns null when goal_target is 0', () => {
    const obj = makeObjective({ goal_target: 0 })
    expect(computeObjectivePercent(obj, [])).toBeNull()
  })

  it('returns 0 when no subobjectives are done', () => {
    const obj = makeObjective({ goal_target: 4 })
    const subs = [makeSub({ is_done: 0 }), makeSub({ id: 'sub-2', is_done: 0 })]
    expect(computeObjectivePercent(obj, subs)).toBe(0)
  })

  it('returns 0.5 when half the subobjectives are done', () => {
    const obj = makeObjective({ goal_target: 4 })
    const subs = [
      makeSub({ id: 'sub-1', is_done: 1 }),
      makeSub({ id: 'sub-2', is_done: 1 }),
      makeSub({ id: 'sub-3', is_done: 0 }),
      makeSub({ id: 'sub-4', is_done: 0 }),
    ]
    expect(computeObjectivePercent(obj, subs)).toBe(0.5)
  })

  it('returns 1 (clamped) when more items done than target', () => {
    const obj = makeObjective({ goal_target: 2 })
    const subs = [
      makeSub({ id: 'sub-1', is_done: 1 }),
      makeSub({ id: 'sub-2', is_done: 1 }),
      makeSub({ id: 'sub-3', is_done: 1 }),
    ]
    expect(computeObjectivePercent(obj, subs)).toBe(1)
  })

  it('uses fractional progress when sub has target_total', () => {
    const obj = makeObjective({ goal_target: 2 })
    // sub-1: 5 of 10 done = 0.5 contribution; sub-2: done = 1.0 contribution
    const subs = [
      makeSub({ id: 'sub-1', target_total: 10, progress_current: 5, is_done: 0 }),
      makeSub({ id: 'sub-2', target_total: null, is_done: 1 }),
    ]
    // sum = 0.5 + 1.0 = 1.5; target = 2 → 1.5/2 = 0.75
    expect(computeObjectivePercent(obj, subs)).toBe(0.75)
  })
})

// ── metric / amount / manual mode ─────────────────────────────────────────────

describe('computeObjectivePercent — metric/amount/manual mode', () => {
  it('returns null when goal_target is null', () => {
    const obj = makeObjective({ goal_kind: 'metric', goal_target: null, current_value: 5 })
    expect(computeObjectivePercent(obj, [])).toBeNull()
  })

  it('returns partial progress', () => {
    const obj = makeObjective({ goal_kind: 'metric', goal_target: 10, current_value: 3 })
    expect(computeObjectivePercent(obj, [])).toBeCloseTo(0.3)
  })

  it('returns 1 when target met', () => {
    const obj = makeObjective({ goal_kind: 'metric', goal_target: 10, current_value: 10 })
    expect(computeObjectivePercent(obj, [])).toBe(1)
  })

  it('clamps to 1 when over target', () => {
    const obj = makeObjective({ goal_kind: 'metric', goal_target: 10, current_value: 15 })
    expect(computeObjectivePercent(obj, [])).toBe(1)
  })
})
