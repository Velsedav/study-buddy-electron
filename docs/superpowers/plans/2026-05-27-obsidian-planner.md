# ObsidianPlanner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `ObsidianPlanner` — a 3-view Pomodoro planner (Timeline / Split / Wizard) optimized for the obsidian theme and a 1080×2560 vertical monitor.

**Architecture:** Early-return pattern in `Plan.tsx` renders `<ObsidianPlanner />` when `theme === 'obsidian'`. ObsidianPlanner is self-contained: it owns its state, loads data, and calls `startSession()` using the same `activeSession` localStorage schema. Pure utility functions (block generation, time formatting) live in `src/lib/obsidian-planner-utils.ts` for testability.

**Tech Stack:** React 19, TypeScript, Vitest, Lucide icons, CSS variables from the obsidian theme, `useUndoRedo` from `src/lib/undo.ts`.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/lib/obsidian-planner-utils.ts` | Create | Types, `generateBlocks`, `formatSessionSummary` |
| `src/lib/__tests__/obsidian-planner-utils.test.ts` | Create | Vitest tests for utility functions |
| `src/pages/ObsidianPlanner.css` | Create | All `.op-*` styles |
| `src/pages/ObsidianPlanner.tsx` | Create | Full component (sub-components inline) |
| `src/pages/Plan.tsx` | Modify | Add early-return `if (theme === 'obsidian') return <ObsidianPlanner />` |

---

## Task 1: Utility functions + types

**Files:**
- Create: `src/lib/obsidian-planner-utils.ts`
- Create: `src/lib/__tests__/obsidian-planner-utils.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/__tests__/obsidian-planner-utils.test.ts
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
```

- [ ] **Step 2: Run tests, confirm they fail**

```bash
cd /home/html5ishard/.gemini/antigravity/scratch/study-buddy-electron
npm test -- obsidian-planner-utils
```

Expected: FAIL with "Cannot find module '../obsidian-planner-utils'"

- [ ] **Step 3: Implement the utility file**

```ts
// src/lib/obsidian-planner-utils.ts
export type PlannerView = 'timeline' | 'split' | 'wizard'
export type PlannerShapeName = '25/5' | '50/10' | '90/15' | 'Custom'

export interface ShapeConfig {
  work: number
  break: number
  prep: number
}

export interface PlannerBlock {
  id: string
  type: 'PREP' | 'WORK' | 'BREAK'
  minutes: number
  subject_id: string | null
  technique_id: string | null
  chapter_name: string | null
  objective: string
  cycle_id?: string
}

export const PLANNER_SHAPES: Record<PlannerShapeName, ShapeConfig> = {
  '25/5':  { work: 25, break: 5,  prep: 5  },
  '50/10': { work: 50, break: 10, prep: 10 },
  '90/15': { work: 90, break: 15, prep: 10 },
  'Custom': { work: 25, break: 5, prep: 5  },
}

export function generateBlocks(
  shape: ShapeConfig,
  repeats: number,
  existing: PlannerBlock[] = [],
): PlannerBlock[] {
  const blocks: PlannerBlock[] = []
  const existingWork = existing.filter(b => b.type === 'WORK')

  if (shape.prep > 0) {
    blocks.push({
      id: crypto.randomUUID(),
      type: 'PREP',
      minutes: shape.prep,
      subject_id: null,
      technique_id: null,
      chapter_name: null,
      objective: '',
    })
  }

  for (let i = 0; i < repeats; i++) {
    const prev = existingWork[i] ?? null
    blocks.push({
      id: crypto.randomUUID(),
      type: 'WORK',
      minutes: shape.work,
      subject_id: prev?.subject_id ?? null,
      technique_id: prev?.technique_id ?? null,
      chapter_name: prev?.chapter_name ?? null,
      objective: prev?.objective ?? '',
    })
    blocks.push({
      id: crypto.randomUUID(),
      type: 'BREAK',
      minutes: shape.break,
      subject_id: null,
      technique_id: null,
      chapter_name: null,
      objective: '',
    })
  }

  return blocks
}

export function formatSessionSummary(blocks: PlannerBlock[]): string {
  const total = blocks.reduce((acc, b) => acc + b.minutes, 0)
  const h = Math.floor(total / 60)
  const m = total % 60
  const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`
  const end = new Date()
  end.setMinutes(end.getMinutes() + total)
  const endStr = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return `${timeStr} · ends ${endStr}`
}
```

- [ ] **Step 4: Run tests, confirm they pass**

```bash
npm test -- obsidian-planner-utils
```

Expected: all 10 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/obsidian-planner-utils.ts src/lib/__tests__/obsidian-planner-utils.test.ts
git commit -m "feat(obsidian-planner): add utility functions and types"
```

---

## Task 2: CSS layout shell

**Files:**
- Create: `src/pages/ObsidianPlanner.css`

- [ ] **Step 1: Write the CSS file**

This establishes the full page layout and all visual classes used in later tasks. Write the entire file now so later tasks can reference classes without modification.

```css
/* src/pages/ObsidianPlanner.css */

/* ── Root layout ── */
.op-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-color, #0d1117);
  color: var(--text-dark, #e6edf3);
  font-family: var(--font-body, system-ui, sans-serif);
  overflow: hidden;
}

/* ── Top bar (48px fixed) ── */
.op-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 16px;
  border-bottom: 1px solid var(--border-color, #30363d);
  flex-shrink: 0;
  gap: 12px;
}

.op-view-pills {
  display: flex;
  gap: 4px;
  background: var(--surface-raised, #21262d);
  padding: 3px;
  border-radius: 8px;
}

.op-view-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border: none;
  background: none;
  color: var(--text-muted, #7d8590);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: background 0.1s, color 0.1s;
  white-space: nowrap;
}

.op-view-pill:hover {
  color: var(--text-dark, #e6edf3);
  background: rgba(255, 255, 255, 0.05);
}

.op-view-pill-active {
  background: var(--card-bg, #161b22);
  color: var(--text-dark, #e6edf3);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
}

.op-start-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  background: var(--primary, #58a6ff);
  color: #0d1117;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.1s, opacity 0.1s;
  white-space: nowrap;
}

.op-start-btn:hover:not(:disabled) {
  background: var(--primary-hover, #79b8ff);
}

.op-start-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ── Config strip (72px) ── */
.op-config {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 16px;
  height: 72px;
  border-bottom: 1px solid var(--border-color, #30363d);
  flex-shrink: 0;
  flex-wrap: wrap;
  overflow: hidden;
}

.op-config-section {
  display: flex;
  align-items: center;
  gap: 6px;
}

.op-config-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted, #7d8590);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.op-shape-pills {
  display: flex;
  gap: 4px;
}

.op-shape-pill {
  padding: 4px 10px;
  border: 1px solid var(--border-color, #30363d);
  background: var(--surface-raised, #21262d);
  color: var(--text-dark, #e6edf3);
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  transition: border-color 0.1s, color 0.1s;
  white-space: nowrap;
}

.op-shape-pill:hover {
  border-color: var(--primary, #58a6ff);
}

.op-shape-pill-active {
  border-color: var(--primary, #58a6ff);
  color: var(--primary, #58a6ff);
  background: rgba(88, 166, 255, 0.1);
}

.op-custom-fields {
  display: flex;
  align-items: center;
  gap: 6px;
}

.op-custom-input {
  width: 52px;
  padding: 4px 6px;
  border: 1px solid var(--border-color, #30363d);
  background: var(--input-bg-focus, #0d1117);
  color: var(--text-dark, #e6edf3);
  border-radius: 4px;
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  outline: none;
}

.op-custom-input:focus {
  border-color: var(--primary, #58a6ff);
}

.op-custom-sep {
  font-size: 11px;
  color: var(--text-muted, #7d8590);
}

.op-stepper {
  display: flex;
  align-items: center;
  gap: 6px;
}

.op-stepper-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color, #30363d);
  background: var(--surface-raised, #21262d);
  color: var(--text-dark, #e6edf3);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  transition: border-color 0.1s;
}

.op-stepper-btn:hover:not(:disabled) {
  border-color: var(--primary, #58a6ff);
}

.op-stepper-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.op-stepper-val {
  min-width: 20px;
  text-align: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 600;
}

.op-summary {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--text-muted, #7d8590);
  white-space: nowrap;
}

.op-config-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}

.op-icon-btn {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1px solid transparent;
  color: var(--text-muted, #7d8590);
  border-radius: 6px;
  cursor: pointer;
  transition: color 0.1s, border-color 0.1s, background 0.1s;
}

.op-icon-btn:hover:not(:disabled) {
  color: var(--text-dark, #e6edf3);
  background: var(--surface-raised, #21262d);
}

.op-icon-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.op-icon-btn-active {
  color: var(--primary, #58a6ff);
}

/* ── Content area ── */
.op-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
}

/* ── Timeline view ── */
.op-timeline {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.op-add-block-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  border: 1px dashed var(--border-color, #30363d);
  background: none;
  color: var(--text-muted, #7d8590);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: border-color 0.1s, color 0.1s;
  align-self: flex-start;
  margin-top: 4px;
}

.op-add-block-btn:hover {
  border-color: var(--primary, #58a6ff);
  color: var(--primary, #58a6ff);
}

/* ── Block card ── */
.op-block {
  border-radius: 6px;
  border: 1px solid var(--border-color, #30363d);
  background: var(--card-bg, #161b22);
  border-left: 3px solid var(--block-accent);
  overflow: hidden;
  transition: border-color 0.15s;
}

.op-block:hover {
  border-color: var(--block-accent);
  border-left-color: var(--block-accent);
}

.op-block-prep  { --block-accent: #7d8590; }
.op-block-work  { --block-accent: #58a6ff; }
.op-block-break { --block-accent: #3fb950; }

.op-block-collapsed {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  height: 72px;
  cursor: pointer;
  user-select: none;
}

.op-block-type-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.op-block-type-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--block-accent);
  white-space: nowrap;
  flex-shrink: 0;
  min-width: 44px;
}

.op-block-mins {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--text-muted, #7d8590);
  white-space: nowrap;
  flex-shrink: 0;
}

.op-block-subject {
  flex: 1;
  font-size: 13px;
  color: var(--text-dark, #e6edf3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.op-block-subject-empty {
  color: var(--text-muted, #7d8590);
  font-style: italic;
}

.op-block-meta {
  font-size: 11px;
  color: var(--text-muted, #7d8590);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.op-block-spacer { flex: 1; }

.op-block-menu-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--text-muted, #7d8590);
  border-radius: 4px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.1s, background 0.1s;
  flex-shrink: 0;
}

.op-block-collapsed:hover .op-block-menu-btn {
  opacity: 1;
}

.op-block-menu-btn:hover {
  background: var(--surface-raised, #21262d);
  color: var(--text-dark, #e6edf3);
}

/* Block menu popover */
.op-block-menu {
  position: absolute;
  right: 0;
  top: 100%;
  z-index: 50;
  background: var(--card-bg, #161b22);
  border: 1px solid var(--border-color, #30363d);
  border-radius: 6px;
  padding: 4px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  min-width: 140px;
}

.op-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  background: none;
  border: none;
  color: var(--text-dark, #e6edf3);
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  text-align: left;
  transition: background 0.1s;
}

.op-menu-item:hover {
  background: var(--surface-raised, #21262d);
}

.op-menu-item-danger {
  color: var(--danger, #f85149);
}

.op-menu-item-danger:hover {
  background: rgba(248, 81, 73, 0.1);
}

/* Block expand area */
.op-block-expand {
  padding: 12px;
  border-top: 1px solid var(--border-color, #30363d);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.op-expand-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.op-expand-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted, #7d8590);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Subject search combobox */
.op-subject-combo {
  position: relative;
}

.op-subject-input {
  width: 100%;
  box-sizing: border-box;
  padding: 7px 10px;
  border: 1px solid var(--border-color, #30363d);
  background: var(--surface-raised, #21262d);
  color: var(--text-dark, #e6edf3);
  border-radius: 4px;
  font-size: 13px;
  outline: none;
}

.op-subject-input:focus {
  border-color: var(--primary, #58a6ff);
}

.op-subject-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 60;
  background: var(--card-bg, #161b22);
  border: 1px solid var(--border-color, #30363d);
  border-radius: 4px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  max-height: 180px;
  overflow-y: auto;
  margin-top: 2px;
}

.op-subject-option {
  padding: 8px 10px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-dark, #e6edf3);
  transition: background 0.1s;
}

.op-subject-option:hover,
.op-subject-option-highlight {
  background: var(--surface-raised, #21262d);
}

.op-expand-select {
  width: 100%;
  padding: 7px 10px;
  border: 1px solid var(--border-color, #30363d);
  background: var(--surface-raised, #21262d);
  color: var(--text-dark, #e6edf3);
  border-radius: 4px;
  font-size: 13px;
  outline: none;
  cursor: pointer;
  box-sizing: border-box;
}

.op-expand-select:focus {
  border-color: var(--primary, #58a6ff);
}

/* Technique card (same style as ObsidianQuickStart) */
.op-technique-card {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  border: 1px solid var(--border-color, #30363d);
  background: var(--surface-raised, #21262d);
  color: var(--text-dark, #e6edf3);
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s;
  box-sizing: border-box;
}

.op-technique-card:hover {
  border-color: var(--primary, #58a6ff);
}

.op-tech-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.op-tech-name {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.op-tech-meta {
  display: flex;
  gap: 8px;
  font-size: 11px;
}

.op-tech-tier {
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
}

.op-tech-none {
  font-size: 13px;
  color: var(--text-muted, #7d8590);
}

.op-tech-browse {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--primary, #58a6ff);
  white-space: nowrap;
  flex-shrink: 0;
  padding: 2px 6px;
  border: 1px solid var(--primary, #58a6ff);
  border-radius: 4px;
}

.op-expand-input {
  width: 100%;
  box-sizing: border-box;
  padding: 7px 10px;
  border: 1px solid var(--border-color, #30363d);
  background: var(--surface-raised, #21262d);
  color: var(--text-dark, #e6edf3);
  border-radius: 4px;
  font-size: 13px;
  outline: none;
}

.op-expand-input:focus {
  border-color: var(--primary, #58a6ff);
}

.op-expand-input::placeholder {
  color: var(--text-muted, #7d8590);
}

/* ── Split view ── */
.op-split {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.op-subject-panel {
  width: 280px;
  flex-shrink: 0;
  border-right: 1px solid var(--border-color, #30363d);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.op-subject-panel-header {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-bottom: 1px solid var(--border-color, #30363d);
  flex-shrink: 0;
}

.op-subject-search {
  width: 100%;
  box-sizing: border-box;
  padding: 7px 10px;
  border: 1px solid var(--border-color, #30363d);
  background: var(--surface-raised, #21262d);
  color: var(--text-dark, #e6edf3);
  border-radius: 4px;
  font-size: 13px;
  outline: none;
}

.op-subject-search:focus {
  border-color: var(--primary, #58a6ff);
}

.op-tag-filter {
  width: 100%;
  box-sizing: border-box;
  padding: 6px 8px;
  border: 1px solid var(--border-color, #30363d);
  background: var(--surface-raised, #21262d);
  color: var(--text-dark, #e6edf3);
  border-radius: 4px;
  font-size: 12px;
  outline: none;
  cursor: pointer;
}

.op-subject-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.op-subject-item {
  padding: 8px 10px;
  border: 1px solid var(--border-color, #30363d);
  background: var(--card-bg, #161b22);
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-dark, #e6edf3);
  transition: border-color 0.1s, background 0.1s;
}

.op-subject-item:hover {
  border-color: var(--primary, #58a6ff);
  background: rgba(88, 166, 255, 0.05);
}

@keyframes op-block-pulse {
  0%   { background: rgba(88, 166, 255, 0.25); }
  100% { background: var(--card-bg, #161b22); }
}

.op-block-pulsing {
  animation: op-block-pulse 0.8s ease-out;
}

/* ── Wizard view ── */
.op-wizard {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.op-wizard-steps {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.op-wizard-step {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-muted, #7d8590);
}

.op-wizard-step-active {
  color: var(--primary, #58a6ff);
  font-weight: 600;
}

.op-wizard-sep {
  color: var(--text-muted, #7d8590);
  opacity: 0.4;
}

.op-wizard-subject-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 8px;
}

.op-wizard-subject-card {
  padding: 12px;
  border: 1px solid var(--border-color, #30363d);
  background: var(--card-bg, #161b22);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-dark, #e6edf3);
  transition: border-color 0.1s, background 0.1s;
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: left;
}

.op-wizard-subject-card:hover {
  border-color: var(--primary, #58a6ff);
}

.op-wizard-subject-selected {
  border-color: var(--primary, #58a6ff);
  background: rgba(88, 166, 255, 0.08);
}

.op-wizard-check {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid var(--border-color, #30363d);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.op-wizard-subject-selected .op-wizard-check {
  background: var(--primary, #58a6ff);
  border-color: var(--primary, #58a6ff);
  color: #0d1117;
}

.op-wizard-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.op-wizard-build-btn {
  padding: 9px 20px;
  background: var(--primary, #58a6ff);
  color: #0d1117;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.1s, opacity 0.1s;
}

.op-wizard-build-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.op-wizard-build-btn:hover:not(:disabled) {
  background: var(--primary-hover, #79b8ff);
}

.op-wizard-back-btn {
  padding: 9px 16px;
  background: none;
  border: 1px solid var(--border-color, #30363d);
  color: var(--text-dark, #e6edf3);
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.1s;
}

.op-wizard-back-btn:hover {
  border-color: var(--primary, #58a6ff);
}

/* ── Empty state ── */
.op-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px;
  color: var(--text-muted, #7d8590);
  font-size: 13px;
  text-align: center;
}

.op-block-menu-wrap {
  position: relative;
  flex-shrink: 0;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/ObsidianPlanner.css
git commit -m "feat(obsidian-planner): add CSS layout shell"
```

---

## Task 3: Component shell + Plan.tsx early return

**Files:**
- Create: `src/pages/ObsidianPlanner.tsx` (shell, no views yet)
- Modify: `src/pages/Plan.tsx`

- [ ] **Step 1: Add early return to Plan.tsx**

In `Plan.tsx`, add this import at the top of the imports:

```ts
import ObsidianPlanner from './ObsidianPlanner'
```

Then, after all hook calls (right before the first non-hook statement, typically after the `useEffect` blocks), add:

```tsx
if (theme === 'obsidian') {
    return <ObsidianPlanner />
}
```

The exact location in Plan.tsx: place it immediately after the last `useEffect` and before the `const startSession = () => {` function definition (around line 492 based on current file). The `theme` variable is already in scope from `const { theme, isTerminal } = useSettings()`.

- [ ] **Step 2: Create ObsidianPlanner.tsx shell**

```tsx
// src/pages/ObsidianPlanner.tsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, AlignJustify, Columns2, Wand2, Undo2, Redo2, Bell, BellOff, Plus, Zap, MoreVertical, Check, ArrowLeft, ArrowRight } from 'lucide-react'
import { getSubjects, getAllTags, getAllSubjectTagsMap } from '../lib/db'
import type { Subject, Tag } from '../lib/db'
import { getChaptersForSubject } from '../lib/chapters'
import type { Chapter } from '../lib/chapters'
import { TECHNIQUES, CATEGORY_LABELS, CATEGORY_COLORS, getTierColor } from '../lib/techniques'
import { useUndoRedo } from '../lib/undo'
import TechniquePickerModal from '../components/TechniquePickerModal'
import {
  generateBlocks,
  formatSessionSummary,
  PLANNER_SHAPES,
  type PlannerBlock,
  type PlannerView,
  type PlannerShapeName,
  type ShapeConfig,
} from '../lib/obsidian-planner-utils'
import './ObsidianPlanner.css'

const LS_VIEW_KEY = 'obsidian-planner-view'
const LS_SHAPE_KEY = 'obsidian-planner-shape'
const LS_REPEATS_KEY = 'obsidian-planner-repeats'
const LS_ALERT_KEY = 'obsidian-planner-alert'

const SHAPE_NAMES: PlannerShapeName[] = ['25/5', '50/10', '90/15', 'Custom']

export default function ObsidianPlanner() {
  const navigate = useNavigate()

  // ── Persisted UI state ──
  const [view, setView] = useState<PlannerView>(() =>
    (localStorage.getItem(LS_VIEW_KEY) as PlannerView | null) ?? 'timeline'
  )
  const [shapeName, setShapeName] = useState<PlannerShapeName>(() =>
    (localStorage.getItem(LS_SHAPE_KEY) as PlannerShapeName | null) ?? '25/5'
  )
  const [customShape, setCustomShape] = useState<ShapeConfig>({ work: 25, break: 5, prep: 5 })
  const [repeats, setRepeats] = useState(() => {
    const saved = parseInt(localStorage.getItem(LS_REPEATS_KEY) ?? '2', 10)
    return isNaN(saved) ? 2 : saved
  })
  const [fiveMinAlert, setFiveMinAlert] = useState(() =>
    localStorage.getItem(LS_ALERT_KEY) !== 'false'
  )

  // ── Block history ──
  const { present: blocks, set: setBlocks, undo, canUndo, redo, canRedo } = useUndoRedo<PlannerBlock[]>([])

  // ── Data ──
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [subjectTagsMap, setSubjectTagsMap] = useState<Map<string, string[]>>(new Map())

  useEffect(() => {
    let mounted = true
    Promise.all([getSubjects(), getAllTags(), getAllSubjectTagsMap()]).then(([subs, tags, tagsMap]) => {
      if (!mounted) return
      setSubjects(subs.filter(s => !s.deleted_at && !s.archived))
      setAllTags(tags)
      setSubjectTagsMap(tagsMap)
    })
    return () => { mounted = false }
  }, [])

  // ── Derived shape ──
  const activeShape = shapeName === 'Custom' ? customShape : PLANNER_SHAPES[shapeName]

  // ── Initialize blocks on first mount (empty → generate from default shape) ──
  useEffect(() => {
    if (blocks.length === 0) {
      setBlocks(generateBlocks(activeShape, repeats))
    }
    // Only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function changeShape(name: PlannerShapeName) {
    setShapeName(name)
    localStorage.setItem(LS_SHAPE_KEY, name)
    const shape = name === 'Custom' ? customShape : PLANNER_SHAPES[name]
    setBlocks(generateBlocks(shape, repeats, blocks))
  }

  function changeRepeats(delta: number) {
    const next = Math.max(1, Math.min(10, repeats + delta))
    setRepeats(next)
    localStorage.setItem(LS_REPEATS_KEY, String(next))
    setBlocks(generateBlocks(activeShape, next, blocks))
  }

  function changeView(v: PlannerView) {
    setView(v)
    localStorage.setItem(LS_VIEW_KEY, v)
  }

  function toggleAlert() {
    const next = !fiveMinAlert
    setFiveMinAlert(next)
    localStorage.setItem(LS_ALERT_KEY, String(next))
  }

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z') {
        if (e.shiftKey && canRedo) redo()
        else if (!e.shiftKey && canUndo) undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo, canUndo, canRedo])

  // ── Start session ──
  const canStart = blocks.some(b => b.type === 'WORK' && b.subject_id)

  function startSession() {
    if (!canStart) return
    const planned = blocks.reduce((acc, b) => acc + b.minutes, 0)
    const session = {
      sessionId: crypto.randomUUID(),
      startedAt: new Date().toISOString(),
      nowBlockIdx: 0,
      remainingSeconds: blocks[0]?.minutes * 60 ?? 0,
      paused: false,
      draft: blocks,
      template: shapeName === 'Custom' ? 'Custom' : shapeName,
      repeats,
      plannedMinutes: planned,
      fiveMinAlert,
    }
    localStorage.setItem('activeSession', JSON.stringify(session))
    navigate('/session')
  }

  // ── Wizard state ──
  const [wizardStep, setWizardStep] = useState<1 | 2>(1)
  const [wizardSelected, setWizardSelected] = useState<string[]>([])
  const [wizardTagFilter, setWizardTagFilter] = useState<string>('')

  function buildWizardPlan() {
    const shape = activeShape
    const draft: PlannerBlock[] = []
    if (shape.prep > 0) {
      draft.push({ id: crypto.randomUUID(), type: 'PREP', minutes: shape.prep, subject_id: null, technique_id: null, chapter_name: null, objective: '' })
    }
    for (const subId of wizardSelected) {
      draft.push({ id: crypto.randomUUID(), type: 'WORK', minutes: shape.work, subject_id: subId, technique_id: null, chapter_name: null, objective: '' })
      draft.push({ id: crypto.randomUUID(), type: 'BREAK', minutes: shape.break, subject_id: null, technique_id: null, chapter_name: null, objective: '' })
    }
    setBlocks(draft)
    setWizardStep(2)
  }

  // Props passed down to child views
  const sharedProps = {
    blocks, setBlocks,
    subjects, allTags, subjectTagsMap,
    activeShape, shapeName,
  }

  return (
    <div className="op-root">
      <TopBar
        view={view}
        onViewChange={changeView}
        canStart={canStart}
        onStart={startSession}
      />
      <ConfigStrip
        shapeName={shapeName}
        customShape={customShape}
        onCustomShapeChange={setCustomShape}
        onShapeChange={changeShape}
        repeats={repeats}
        onRepeatsChange={changeRepeats}
        summary={formatSessionSummary(blocks)}
        canUndo={canUndo}
        onUndo={undo}
        canRedo={canRedo}
        onRedo={redo}
        fiveMinAlert={fiveMinAlert}
        onToggleAlert={toggleAlert}
      />
      <div className="op-content">
        {view === 'timeline' && (
          <TimelineView {...sharedProps} />
        )}
        {view === 'split' && (
          <SplitView {...sharedProps} />
        )}
        {view === 'wizard' && (
          <WizardView
            {...sharedProps}
            step={wizardStep}
            selected={wizardSelected}
            tagFilter={wizardTagFilter}
            onTagFilterChange={setWizardTagFilter}
            onToggleSubject={(id) => {
              setWizardSelected(prev =>
                prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
              )
            }}
            onBuild={buildWizardPlan}
            onBack={() => { setWizardStep(1); setWizardSelected([]) }}
          />
        )}
      </div>
    </div>
  )
}

// ── Placeholder stubs (replaced in later tasks) ──

function TopBar({ view, onViewChange, canStart, onStart }: {
  view: PlannerView
  onViewChange: (v: PlannerView) => void
  canStart: boolean
  onStart: () => void
}) {
  return (
    <div className="op-topbar">
      <div className="op-view-pills">
        <button className={`op-view-pill${view === 'timeline' ? ' op-view-pill-active' : ''}`} onClick={() => onViewChange('timeline')}>
          <AlignJustify size={14} /> Timeline
        </button>
        <button className={`op-view-pill${view === 'split' ? ' op-view-pill-active' : ''}`} onClick={() => onViewChange('split')}>
          <Columns2 size={14} /> Split
        </button>
        <button className={`op-view-pill${view === 'wizard' ? ' op-view-pill-active' : ''}`} onClick={() => onViewChange('wizard')}>
          <Wand2 size={14} /> Wizard
        </button>
      </div>
      <button
        className="op-start-btn"
        onClick={onStart}
        disabled={!canStart}
        title={!canStart ? 'Add at least one subject to start' : undefined}
      >
        <Play size={14} fill="currentColor" /> Start Session
      </button>
    </div>
  )
}

function ConfigStrip(_props: any) {
  return <div className="op-config"><span style={{color:'var(--text-muted)'}}>Config strip — coming next task</span></div>
}

function TimelineView(_props: any) {
  return <div className="op-timeline"><span style={{color:'var(--text-muted)'}}>Timeline — coming next task</span></div>
}

function SplitView(_props: any) {
  return <div className="op-split"><div style={{color:'var(--text-muted)', padding:16}}>Split — coming next task</div></div>
}

function WizardView(_props: any) {
  return <div className="op-wizard"><span style={{color:'var(--text-muted)'}}>Wizard — coming next task</span></div>
}
```

- [ ] **Step 3: Verify dev server compiles without errors**

```bash
npm run dev
```

Open the app, navigate to Planner. Expected: renders "coming next task" stubs inside the obsidian layout — no TypeScript errors, no crashes.

- [ ] **Step 4: Commit**

```bash
git add src/pages/ObsidianPlanner.tsx src/pages/Plan.tsx
git commit -m "feat(obsidian-planner): add component shell and Plan.tsx early return"
```

---

## Task 4: ConfigStrip component

**Files:**
- Modify: `src/pages/ObsidianPlanner.tsx` — replace ConfigStrip stub

- [ ] **Step 1: Replace ConfigStrip stub with real implementation**

Replace the `function ConfigStrip(_props: any)` stub entirely:

```tsx
interface ConfigStripProps {
  shapeName: PlannerShapeName
  customShape: ShapeConfig
  onCustomShapeChange: (s: ShapeConfig) => void
  onShapeChange: (name: PlannerShapeName) => void
  repeats: number
  onRepeatsChange: (delta: number) => void
  summary: string
  canUndo: boolean
  onUndo: () => void
  canRedo: boolean
  onRedo: () => void
  fiveMinAlert: boolean
  onToggleAlert: () => void
}

function ConfigStrip({
  shapeName, customShape, onCustomShapeChange, onShapeChange,
  repeats, onRepeatsChange, summary,
  canUndo, onUndo, canRedo, onRedo,
  fiveMinAlert, onToggleAlert,
}: ConfigStripProps) {
  return (
    <div className="op-config">
      <div className="op-config-section">
        <span className="op-config-label">Shape</span>
        <div className="op-shape-pills">
          {SHAPE_NAMES.map(name => (
            <button
              key={name}
              className={`op-shape-pill${shapeName === name ? ' op-shape-pill-active' : ''}`}
              onClick={() => onShapeChange(name)}
            >
              {name}
            </button>
          ))}
        </div>
        {shapeName === 'Custom' && (
          <div className="op-custom-fields">
            <input
              className="op-custom-input"
              type="number"
              min={1}
              max={240}
              value={customShape.work}
              onChange={e => {
                const v = Math.max(1, parseInt(e.target.value) || 1)
                onCustomShapeChange({ ...customShape, work: v })
                onShapeChange('Custom')
              }}
              title="Work minutes"
            />
            <span className="op-custom-sep">/</span>
            <input
              className="op-custom-input"
              type="number"
              min={1}
              max={60}
              value={customShape.break}
              onChange={e => {
                const v = Math.max(1, parseInt(e.target.value) || 1)
                onCustomShapeChange({ ...customShape, break: v })
                onShapeChange('Custom')
              }}
              title="Break minutes"
            />
            <span className="op-custom-sep">/</span>
            <input
              className="op-custom-input"
              type="number"
              min={0}
              max={30}
              value={customShape.prep}
              onChange={e => {
                const v = Math.max(0, parseInt(e.target.value) || 0)
                onCustomShapeChange({ ...customShape, prep: v })
                onShapeChange('Custom')
              }}
              title="Prep minutes"
            />
          </div>
        )}
      </div>
      <div className="op-config-section">
        <span className="op-config-label">Repeats</span>
        <div className="op-stepper">
          <button className="op-stepper-btn" onClick={() => onRepeatsChange(-1)} disabled={repeats <= 1}>−</button>
          <span className="op-stepper-val">{repeats}</span>
          <button className="op-stepper-btn" onClick={() => onRepeatsChange(1)} disabled={repeats >= 10}>+</button>
        </div>
      </div>
      <span className="op-summary">{summary}</span>
      <div className="op-config-actions">
        <button className="op-icon-btn" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
          <Undo2 size={15} />
        </button>
        <button className="op-icon-btn" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
          <Redo2 size={15} />
        </button>
        <button
          className={`op-icon-btn${fiveMinAlert ? ' op-icon-btn-active' : ''}`}
          onClick={onToggleAlert}
          title={fiveMinAlert ? '5-min alert on' : '5-min alert off'}
        >
          {fiveMinAlert ? <Bell size={15} /> : <BellOff size={15} />}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify in app**

Run `npm run dev`. Go to Planner. Verify:
- Shape pills [25/5] [50/10] [90/15] [Custom] visible
- Clicking Custom shows 3 number inputs inline
- Repeats stepper increments/decrements
- Summary string shows time and end time
- Undo/Redo/Bell icons present and functional

- [ ] **Step 3: Commit**

```bash
git add src/pages/ObsidianPlanner.tsx
git commit -m "feat(obsidian-planner): implement ConfigStrip"
```

---

## Task 5: PlanBlock card — collapsed + menu

**Files:**
- Modify: `src/pages/ObsidianPlanner.tsx` — add PlanBlock component

- [ ] **Step 1: Add PlanBlock component (collapsed view + menu)**

Add this component to `ObsidianPlanner.tsx` above the `ObsidianPlanner` export:

```tsx
interface PlanBlockProps {
  block: PlannerBlock
  subjects: Subject[]
  isExpanded: boolean
  isMenuOpen: boolean
  isPulsing: boolean
  onToggleExpand: () => void
  onMenuToggle: (e: React.MouseEvent) => void
  onUpdate: (updated: PlannerBlock) => void
  onDuplicate: () => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
}

function PlanBlock({
  block, subjects, isExpanded, isMenuOpen, isPulsing,
  onToggleExpand, onMenuToggle, onUpdate,
  onDuplicate, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown,
}: PlanBlockProps) {
  const subject = subjects.find(s => s.id === block.subject_id)
  const tech = TECHNIQUES.find(t => t.id === block.technique_id)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [subjectQuery, setSubjectQuery] = useState(subject?.name ?? '')
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false)
  const subjectInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setSubjectQuery(subject?.name ?? '')
  }, [subject?.name])

  useEffect(() => {
    if (block.subject_id) {
      setChapters(getChaptersForSubject(block.subject_id))
    } else {
      setChapters([])
    }
  }, [block.subject_id])

  const filteredSubjects = subjects.filter(s =>
    s.name.toLowerCase().includes(subjectQuery.toLowerCase())
  )

  function selectSubject(s: Subject) {
    setSubjectQuery(s.name)
    setShowSubjectDropdown(false)
    onUpdate({ ...block, subject_id: s.id, chapter_name: null })
  }

  function clearSubject() {
    setSubjectQuery('')
    onUpdate({ ...block, subject_id: null, technique_id: null, chapter_name: null })
  }

  const typeLabel = { PREP: 'Prep', WORK: 'Work', BREAK: 'Break' }[block.type]
  const typeIcon = { PREP: '⏱', WORK: '▶', BREAK: '☕' }[block.type]
  const typeClass = { PREP: 'op-block-prep', WORK: 'op-block-work', BREAK: 'op-block-break' }[block.type]

  return (
    <div className={`op-block ${typeClass}${isPulsing ? ' op-block-pulsing' : ''}`}>
      <div className="op-block-collapsed" onClick={onToggleExpand}>
        <span className="op-block-type-icon">{typeIcon}</span>
        <span className="op-block-type-label">{typeLabel}</span>
        <span className="op-block-mins">{block.minutes}m</span>
        {block.type === 'WORK' && (
          subject
            ? <span className="op-block-subject">{subject.name}</span>
            : <span className="op-block-subject op-block-subject-empty">+ Assign subject</span>
        )}
        {block.type !== 'WORK' && <span className="op-block-spacer" />}
        {block.type === 'WORK' && subject && (tech || block.chapter_name) && (
          <span className="op-block-meta">
            {[tech?.name, block.chapter_name].filter(Boolean).join(' · ')}
          </span>
        )}
        <div className="op-block-menu-wrap">
          <button
            className="op-block-menu-btn"
            onClick={e => { e.stopPropagation(); onMenuToggle(e) }}
            aria-label="Block options"
          >
            <MoreVertical size={14} />
          </button>
          {isMenuOpen && (
            <div className="op-block-menu" onClick={e => e.stopPropagation()}>
              <button className="op-menu-item" onClick={onDuplicate}>Duplicate</button>
              <button className="op-menu-item" onClick={onMoveUp} disabled={!canMoveUp}>Move up</button>
              <button className="op-menu-item" onClick={onMoveDown} disabled={!canMoveDown}>Move down</button>
              <button className="op-menu-item op-menu-item-danger" onClick={onDelete}>Delete</button>
            </div>
          )}
        </div>
      </div>

      {isExpanded && block.type === 'WORK' && (
        <div className="op-block-expand">
          {/* Subject combobox */}
          <div className="op-expand-field">
            <label className="op-expand-label">Subject</label>
            <div className="op-subject-combo">
              <input
                ref={subjectInputRef}
                className="op-subject-input"
                value={subjectQuery}
                onChange={e => { setSubjectQuery(e.target.value); setShowSubjectDropdown(true) }}
                onFocus={() => setShowSubjectDropdown(true)}
                onBlur={() => setTimeout(() => setShowSubjectDropdown(false), 150)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && filteredSubjects.length > 0) {
                    selectSubject(filteredSubjects[0])
                  }
                  if (e.key === 'Escape') {
                    setShowSubjectDropdown(false)
                    if (!block.subject_id) clearSubject()
                  }
                }}
                placeholder="Search subjects..."
              />
              {showSubjectDropdown && filteredSubjects.length > 0 && (
                <div className="op-subject-dropdown">
                  {filteredSubjects.map(s => (
                    <div
                      key={s.id}
                      className="op-subject-option"
                      onMouseDown={() => selectSubject(s)}
                    >
                      {s.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Chapter */}
          <div className="op-expand-field">
            <label className="op-expand-label">Chapter</label>
            <select
              className="op-expand-select"
              value={block.chapter_name ?? ''}
              onChange={e => onUpdate({ ...block, chapter_name: e.target.value || null })}
              disabled={!block.subject_id}
            >
              <option value="">— none —</option>
              {chapters.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Technique */}
          <div className="op-expand-field">
            <label className="op-expand-label">Technique</label>
            <button
              className="op-technique-card"
              onClick={() => setPickerOpen(true)}
              aria-label="Open technique picker"
            >
              {tech ? (
                <div className="op-tech-info">
                  <span className="op-tech-name">{tech.name}</span>
                  <div className="op-tech-meta">
                    <span className="op-tech-tier" style={{ color: getTierColor(tech.tier) }}>Tier {tech.tier}</span>
                    {tech.category && (
                      <span style={{ color: CATEGORY_COLORS[tech.category] }}>
                        {CATEGORY_LABELS[tech.category]}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <span className="op-tech-none">No technique selected</span>
              )}
              <span className="op-tech-browse"><Zap size={11} /> Browse</span>
            </button>
          </div>

          {/* Objective */}
          <div className="op-expand-field">
            <label className="op-expand-label">Objective <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
            <input
              className="op-expand-input"
              value={block.objective}
              onChange={e => onUpdate({ ...block, objective: e.target.value })}
              placeholder="What do you want to achieve?"
            />
          </div>
        </div>
      )}

      {pickerOpen && (
        <TechniquePickerModal
          onClose={() => setPickerOpen(false)}
          onSelect={id => {
            onUpdate({ ...block, technique_id: id })
            setPickerOpen(false)
          }}
          currentSelection={block.technique_id ?? undefined}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/ObsidianPlanner.tsx
git commit -m "feat(obsidian-planner): add PlanBlock card component"
```

---

## Task 6: Timeline view

**Files:**
- Modify: `src/pages/ObsidianPlanner.tsx` — replace TimelineView stub

- [ ] **Step 1: Define shared view props interface**

Add this interface near the top of the file (after the imports, before the component):

```tsx
interface ViewProps {
  blocks: PlannerBlock[]
  setBlocks: (blocks: PlannerBlock[]) => void
  subjects: Subject[]
  allTags: Tag[]
  subjectTagsMap: Map<string, string[]>
  activeShape: ShapeConfig
  shapeName: PlannerShapeName
}
```

- [ ] **Step 2: Add shared block-edit helpers as standalone functions**

These handle block state mutations used by all three views. Add them as standalone functions (not hooks) near the ViewProps interface:

```tsx
function updateBlock(blocks: PlannerBlock[], id: string, updates: Partial<PlannerBlock>): PlannerBlock[] {
  return blocks.map(b => b.id === id ? { ...b, ...updates } : b)
}

function duplicateBlock(blocks: PlannerBlock[], id: string): PlannerBlock[] {
  const idx = blocks.findIndex(b => b.id === id)
  if (idx === -1) return blocks
  const copy = { ...blocks[idx], id: crypto.randomUUID() }
  return [...blocks.slice(0, idx + 1), copy, ...blocks.slice(idx + 1)]
}

function deleteBlock(blocks: PlannerBlock[], id: string): PlannerBlock[] {
  return blocks.filter(b => b.id !== id)
}

function moveBlock(blocks: PlannerBlock[], id: string, dir: -1 | 1): PlannerBlock[] {
  const idx = blocks.findIndex(b => b.id === id)
  if (idx === -1) return blocks
  const target = idx + dir
  if (target < 0 || target >= blocks.length) return blocks
  const next = [...blocks]
  ;[next[idx], next[target]] = [next[target], next[idx]]
  return next
}
```

- [ ] **Step 3: Replace TimelineView stub**

Replace `function TimelineView(_props: any)` with:

```tsx
function TimelineView({ blocks, setBlocks, subjects, activeShape }: ViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [pulsingId, setPulsingId] = useState<string | null>(null)

  useEffect(() => {
    const close = () => setMenuId(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpandedId(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function addWorkBlock() {
    const newBlocks: PlannerBlock[] = [
      ...blocks,
      { id: crypto.randomUUID(), type: 'WORK', minutes: activeShape.work, subject_id: null, technique_id: null, chapter_name: null, objective: '' },
      { id: crypto.randomUUID(), type: 'BREAK', minutes: activeShape.break, subject_id: null, technique_id: null, chapter_name: null, objective: '' },
    ]
    setBlocks(newBlocks)
  }

  return (
    <div className="op-timeline">
      {blocks.length === 0 && (
        <div className="op-empty">No blocks yet. Add a WORK block to get started.</div>
      )}
      {blocks.map((block, idx) => (
        <PlanBlock
          key={block.id}
          block={block}
          subjects={subjects}
          isExpanded={expandedId === block.id}
          isMenuOpen={menuId === block.id}
          isPulsing={pulsingId === block.id}
          onToggleExpand={() => setExpandedId(expandedId === block.id ? null : block.id)}
          onMenuToggle={e => { e.stopPropagation(); setMenuId(menuId === block.id ? null : block.id) }}
          onUpdate={updated => setBlocks(updateBlock(blocks, block.id, updated))}
          onDuplicate={() => { setBlocks(duplicateBlock(blocks, block.id)); setMenuId(null) }}
          onDelete={() => { setBlocks(deleteBlock(blocks, block.id)); setMenuId(null) }}
          onMoveUp={() => { setBlocks(moveBlock(blocks, block.id, -1)); setMenuId(null) }}
          onMoveDown={() => { setBlocks(moveBlock(blocks, block.id, 1)); setMenuId(null) }}
          canMoveUp={idx > 0}
          canMoveDown={idx < blocks.length - 1}
        />
      ))}
      <button className="op-add-block-btn" onClick={addWorkBlock}>
        <Plus size={14} /> Add WORK block
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Verify in app**

`npm run dev` → go to Planner → Timeline view. Verify:
- Blocks render with correct type labels and colors
- Clicking a WORK block expands it (subject/chapter/technique/objective fields visible)
- Only one block expanded at a time
- Escape collapses expanded block
- `⋯` menu shows Duplicate/Move up/Move down/Delete
- Delete removes block
- "Add WORK block" appends WORK + BREAK pair
- TechniquePickerModal opens from technique card

- [ ] **Step 5: Commit**

```bash
git add src/pages/ObsidianPlanner.tsx
git commit -m "feat(obsidian-planner): implement Timeline view"
```

---

## Task 7: Split view

**Files:**
- Modify: `src/pages/ObsidianPlanner.tsx` — replace SplitView stub

- [ ] **Step 1: Replace SplitView stub**

Replace `function SplitView(_props: any)` with:

```tsx
function SplitView({ blocks, setBlocks, subjects, allTags, subjectTagsMap, activeShape, shapeName }: ViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [pulsingId, setPulsingId] = useState<string | null>(null)
  const blockRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  useEffect(() => {
    const close = () => setMenuId(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpandedId(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const filteredSubjects = subjects.filter(s => {
    const matchesQuery = s.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTag = !tagFilter || (subjectTagsMap.get(s.id) ?? []).includes(tagFilter)
    return matchesQuery && matchesTag
  })

  function assignSubject(subject: Subject) {
    const nextEmptyWork = blocks.findIndex(b => b.type === 'WORK' && !b.subject_id)
    if (nextEmptyWork === -1) return
    const targetId = blocks[nextEmptyWork].id
    setBlocks(updateBlock(blocks, targetId, { subject_id: subject.id }))
    setPulsingId(targetId)
    setTimeout(() => setPulsingId(null), 800)
    const el = blockRefs.current.get(targetId)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  const tagOptions = Array.from(new Set(
    Array.from(subjectTagsMap.values()).flat()
  )).sort()

  return (
    <div className="op-split">
      <div className="op-subject-panel">
        <div className="op-subject-panel-header">
          <input
            className="op-subject-search"
            placeholder="Search subjects..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <select
            className="op-tag-filter"
            value={tagFilter}
            onChange={e => setTagFilter(e.target.value)}
          >
            <option value="">All tags</option>
            {tagOptions.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="op-subject-list">
          {filteredSubjects.length === 0 && (
            <div className="op-empty" style={{ padding: '20px 8px' }}>No subjects found</div>
          )}
          {filteredSubjects.map(s => (
            <div
              key={s.id}
              className="op-subject-item"
              onClick={() => assignSubject(s)}
            >
              {s.name}
            </div>
          ))}
        </div>
      </div>
      <div className="op-timeline" style={{ flex: 1 }}>
        {blocks.length === 0 && (
          <div className="op-empty">No blocks yet.</div>
        )}
        {blocks.map((block, idx) => (
          <div key={block.id} ref={el => { if (el) blockRefs.current.set(block.id, el) }}>
            <PlanBlock
              block={block}
              subjects={subjects}
              isExpanded={expandedId === block.id}
              isMenuOpen={menuId === block.id}
              isPulsing={pulsingId === block.id}
              onToggleExpand={() => setExpandedId(expandedId === block.id ? null : block.id)}
              onMenuToggle={e => { e.stopPropagation(); setMenuId(menuId === block.id ? null : block.id) }}
              onUpdate={updated => setBlocks(updateBlock(blocks, block.id, updated))}
              onDuplicate={() => { setBlocks(duplicateBlock(blocks, block.id)); setMenuId(null) }}
              onDelete={() => { setBlocks(deleteBlock(blocks, block.id)); setMenuId(null) }}
              onMoveUp={() => { setBlocks(moveBlock(blocks, block.id, -1)); setMenuId(null) }}
              onMoveDown={() => { setBlocks(moveBlock(blocks, block.id, 1)); setMenuId(null) }}
              canMoveUp={idx > 0}
              canMoveDown={idx < blocks.length - 1}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify in app**

`npm run dev` → switch to Split view. Verify:
- Left panel (280px) shows subject list with search + tag filter
- Clicking a subject assigns it to the next empty WORK block
- The assigned block pulses briefly
- The timeline scrolls to the assigned block
- All block expand/menu actions work same as Timeline view

- [ ] **Step 3: Commit**

```bash
git add src/pages/ObsidianPlanner.tsx
git commit -m "feat(obsidian-planner): implement Split view"
```

---

## Task 8: Wizard view

**Files:**
- Modify: `src/pages/ObsidianPlanner.tsx` — replace WizardView stub

- [ ] **Step 1: Replace WizardView stub**

Replace `function WizardView(_props: any)` with:

```tsx
interface WizardViewProps extends ViewProps {
  step: 1 | 2
  selected: string[]
  tagFilter: string
  onTagFilterChange: (t: string) => void
  onToggleSubject: (id: string) => void
  onBuild: () => void
  onBack: () => void
}

function WizardView({
  blocks, setBlocks, subjects, allTags, subjectTagsMap, activeShape,
  step, selected, tagFilter, onTagFilterChange, onToggleSubject, onBuild, onBack,
}: WizardViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)

  useEffect(() => {
    const close = () => setMenuId(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  const tagOptions = Array.from(new Set(
    Array.from(subjectTagsMap.values()).flat()
  )).sort()

  const filteredSubjects = subjects.filter(s => {
    if (!tagFilter) return true
    return (subjectTagsMap.get(s.id) ?? []).includes(tagFilter)
  })

  return (
    <div className="op-wizard">
      {/* Step indicator */}
      <div className="op-wizard-steps">
        <span className={`op-wizard-step${step === 1 ? ' op-wizard-step-active' : ''}`}>
          ● Build
        </span>
        <span className="op-wizard-sep">→</span>
        <span className={`op-wizard-step${step === 2 ? ' op-wizard-step-active' : ''}`}>
          ○ Review
        </span>
      </div>

      {step === 1 && (
        <>
          <div className="op-config-section">
            <select
              className="op-tag-filter"
              value={tagFilter}
              onChange={e => onTagFilterChange(e.target.value)}
            >
              <option value="">All tags</option>
              {tagOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="op-wizard-subject-grid">
            {filteredSubjects.map(s => {
              const isSelected = selected.includes(s.id)
              return (
                <button
                  key={s.id}
                  className={`op-wizard-subject-card${isSelected ? ' op-wizard-subject-selected' : ''}`}
                  onClick={() => onToggleSubject(s.id)}
                >
                  <span className="op-wizard-check">
                    {isSelected && <Check size={10} />}
                  </span>
                  {s.name}
                </button>
              )
            })}
          </div>
          <div className="op-wizard-actions">
            <button
              className="op-wizard-build-btn"
              onClick={onBuild}
              disabled={selected.length === 0}
            >
              Build Plan →
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="op-wizard-actions" style={{ justifyContent: 'flex-start' }}>
            <button className="op-wizard-back-btn" onClick={onBack}>
              ← Back
            </button>
          </div>
          {blocks.map((block, idx) => (
            <PlanBlock
              key={block.id}
              block={block}
              subjects={subjects}
              isExpanded={expandedId === block.id}
              isMenuOpen={menuId === block.id}
              isPulsing={false}
              onToggleExpand={() => setExpandedId(expandedId === block.id ? null : block.id)}
              onMenuToggle={e => { e.stopPropagation(); setMenuId(menuId === block.id ? null : block.id) }}
              onUpdate={updated => setBlocks(updateBlock(blocks, block.id, updated))}
              onDuplicate={() => { setBlocks(duplicateBlock(blocks, block.id)); setMenuId(null) }}
              onDelete={() => { setBlocks(deleteBlock(blocks, block.id)); setMenuId(null) }}
              onMoveUp={() => { setBlocks(moveBlock(blocks, block.id, -1)); setMenuId(null) }}
              onMoveDown={() => { setBlocks(moveBlock(blocks, block.id, 1)); setMenuId(null) }}
              canMoveUp={idx > 0}
              canMoveDown={idx < blocks.length - 1}
            />
          ))}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify in app**

`npm run dev` → switch to Wizard view. Verify:
- Step 1: subject cards shown as grid, click to select (checkmark appears)
- Tag filter works
- "Build Plan →" disabled when 0 selected
- Clicking "Build Plan →" generates timeline and advances to Step 2
- Step 2: shows "← Back" + block list with all assigned subjects
- Block expand works in Step 2
- "← Back" returns to step 1 and clears selections
- Start Session button in topbar enabled after wizard generates plan

- [ ] **Step 3: Commit**

```bash
git add src/pages/ObsidianPlanner.tsx
git commit -m "feat(obsidian-planner): implement Wizard view"
```

---

## Task 9: Final integration pass

**Files:**
- Modify: `src/pages/ObsidianPlanner.tsx` — remove stubs from ObsidianPlanner's sharedProps

- [ ] **Step 1: Fix sharedProps type**

In the `ObsidianPlanner` component, update the props passed to TimelineView and SplitView. Replace the `{...sharedProps}` spread with typed props:

```tsx
// In ObsidianPlanner return, replace the content area children with:
<div className="op-content">
  {view === 'timeline' && (
    <TimelineView
      blocks={blocks} setBlocks={setBlocks}
      subjects={subjects} allTags={allTags} subjectTagsMap={subjectTagsMap}
      activeShape={activeShape} shapeName={shapeName}
    />
  )}
  {view === 'split' && (
    <SplitView
      blocks={blocks} setBlocks={setBlocks}
      subjects={subjects} allTags={allTags} subjectTagsMap={subjectTagsMap}
      activeShape={activeShape} shapeName={shapeName}
    />
  )}
  {view === 'wizard' && (
    <WizardView
      blocks={blocks} setBlocks={setBlocks}
      subjects={subjects} allTags={allTags} subjectTagsMap={subjectTagsMap}
      activeShape={activeShape} shapeName={shapeName}
      step={wizardStep}
      selected={wizardSelected}
      tagFilter={wizardTagFilter}
      onTagFilterChange={setWizardTagFilter}
      onToggleSubject={(id) => {
        setWizardSelected(prev =>
          prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        )
      }}
      onBuild={buildWizardPlan}
      onBack={() => { setWizardStep(1); setWizardSelected([]) }}
    />
  )}
</div>
```

- [ ] **Step 2: Run full test suite**

```bash
npm test
```

Expected: all tests pass (including the new obsidian-planner-utils tests)

- [ ] **Step 3: Full integration smoke test**

```bash
npm run dev
```

Verify the following scenarios:
1. Navigate to Planner — Timeline view loads with default blocks
2. Expand a WORK block → fill subject, chapter, technique, objective → collapse → metadata shows in collapsed view
3. Block menu: duplicate, move up/down, delete all work
4. Add WORK block button adds a pair at bottom
5. Undo/redo in config strip reverts block changes
6. Change shape from 25/5 to 50/10 — blocks regenerate, existing subject assignments preserved
7. Change repeats — block count updates
8. Switch to Split view — subject panel visible, click subject → next empty WORK block fills, pulses, scrolls
9. Switch to Wizard — select 2 subjects → Build Plan → review timeline → Start Session button enabled
10. Start Session with all WORK blocks having a subject → navigates to /session

- [ ] **Step 4: Final commit**

```bash
git add src/pages/ObsidianPlanner.tsx
git commit -m "feat(obsidian-planner): final integration pass — wire props and smoke test"
```

---

## Spec Coverage Check

| Spec requirement | Task |
|---|---|
| Early return in Plan.tsx | Task 3 |
| Three views with persistent localStorage key | Task 3 |
| View toggle pills in topbar | Task 3 |
| Start Session button (disabled state + tooltip) | Task 3 |
| Shape presets [25/5] [50/10] [90/15] [Custom] | Task 4 |
| Custom shape inline inputs | Task 4 |
| Repeats stepper [−] N [+] | Task 4 |
| Live summary "Xh Ym · ends HH:MM" | Tasks 1 + 4 |
| Undo/redo buttons (Ctrl+Z / Ctrl+Shift+Z) | Task 4 |
| 5-min alert bell toggle | Task 4 |
| Block cards 72px with type + minutes + subject | Task 5 |
| PREP/WORK/BREAK left border accent colors | Task 2 |
| Block click expands inline (one at a time) | Tasks 5 + 6 |
| Subject combobox with search in expand | Task 5 |
| Technique card + TechniquePickerModal | Task 5 |
| Chapter native select | Task 5 |
| Objective text input | Task 5 |
| Block menu (duplicate/delete/move up/move down) | Task 5 |
| "Add WORK block" button at bottom | Task 6 |
| Escape closes expanded block | Task 6 |
| Enter in subject search adds first result | Task 5 |
| Split view 280px subject panel | Task 7 |
| Click subject → next empty WORK block | Task 7 |
| Pulse animation on filled block | Tasks 2 + 7 |
| Auto-scroll to assigned block | Task 7 |
| Tag filter in split panel | Task 7 |
| Wizard step 1: subject card grid + tag filter | Task 8 |
| Wizard "Build Plan →" disabled when 0 selected | Task 8 |
| Wizard step 2: review timeline | Task 8 |
| Wizard "← Back" preserves concept (clears) | Task 8 |
| generateBlocks + formatSessionSummary tested | Task 1 |
