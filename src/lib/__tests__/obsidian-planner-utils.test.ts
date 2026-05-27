import { describe, it, expect } from 'vitest'
import { generateBlocks, formatSessionSummary } from '../obsidian-planner-utils'
import type { ShapeConfig, PlannerBlock } from '../obsidian-planner-utils'

const SHAPE_25_5: ShapeConfig = { work: 25, break: 5, prep: 5 }
const SHAPE_50_10: ShapeConfig = { work: 50, break: 10, prep: 10 }

describe('generateBlocks', () => {
  it('creates PREP + [WORK+BREAK] x repeats', () => {
    const blocks = generateBlocks(SHAPE_25_5, 2)
    expect(blocks.map(b => b.type)).toEqual(['PREP', 'WORK', 'BREAK', 'WORK', 'BREAK'])
  })
  it('skips PREP when prep=0', () => {
    const blocks = generateBlocks({ work: 25, break: 5, prep: 0 }, 1)
    expect(blocks[0].type).toBe('WORK')
    expect(blocks.length).toBe(2)
  })
  it('sets correct minutes on each block type', () => {
    const blocks = generateBlocks(SHAPE_25_5, 1)
    expect(blocks.find(b => b.type === 'PREP')!.minutes).toBe(5)
    expect(blocks.find(b => b.type === 'WORK')!.minutes).toBe(25)
    expect(blocks.find(b => b.type === 'BREAK')!.minutes).toBe(5)
  })
  it('preserves WORK block assignments from existing blocks at matching index', () => {
    const existing: PlannerBlock[] = [
      { id: 'x', type: 'WORK', minutes: 25, subject_id: 'sub-1', technique_id: 'tech-1', chapter_name: 'Ch1', objective: 'learn', cycle_id: undefined },
    ]
    const blocks = generateBlocks(SHAPE_25_5, 1, existing)
    const work = blocks.find(b => b.type === 'WORK')!
    expect(work.subject_id).toBe('sub-1')
    expect(work.technique_id).toBe('tech-1')
    expect(work.chapter_name).toBe('Ch1')
    expect(work.objective).toBe('learn')
  })
  it('extra repeats get empty WORK blocks when existing is shorter', () => {
    const existing: PlannerBlock[] = [
      { id: 'x', type: 'WORK', minutes: 25, subject_id: 'sub-1', technique_id: null, chapter_name: null, objective: '', cycle_id: undefined },
    ]
    const blocks = generateBlocks(SHAPE_25_5, 2, existing)
    const works = blocks.filter(b => b.type === 'WORK')
    expect(works[0].subject_id).toBe('sub-1')
    expect(works[1].subject_id).toBeNull()
  })
  it('generates unique ids for all blocks', () => {
    const blocks = generateBlocks(SHAPE_25_5, 3)
    const ids = blocks.map(b => b.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('formatSessionSummary', () => {
  it('formats minutes-only total (< 1h)', () => {
    const blocks = generateBlocks({ work: 25, break: 5, prep: 0 }, 1)
    // 25 + 5 = 30m
    expect(formatSessionSummary(blocks)).toMatch(/^30m · ends /)
  })
  it('formats hours+minutes total', () => {
    const blocks = generateBlocks(SHAPE_50_10, 2)
    // 10 + 50+10 + 50+10 = 130m = 2h 10m
    expect(formatSessionSummary(blocks)).toMatch(/^2h 10m · ends /)
  })
  it('formats exactly 1h as 1h 0m', () => {
    const blocks = generateBlocks({ work: 55, break: 5, prep: 0 }, 1)
    // 60m = 1h 0m
    expect(formatSessionSummary(blocks)).toMatch(/^1h 0m · ends /)
  })
  it('returns 0m for empty block list', () => {
    expect(formatSessionSummary([])).toMatch(/^0m · ends /)
  })
})
