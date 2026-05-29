# Obsidian Analytics Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a purpose-built Obsidian Analytics page with three switchable views (Command / Narrative / Minimal), new panels (subject balance, deadline urgency, focus type split, time-of-day), and all computation logic extracted into a testable `analytics-utils.ts`.

**Architecture:** Early-return pattern in `Analytics.tsx` (`if (theme === 'obsidian') return <ObsidianAnalytics />`). Data loaded once in the root component, passed to the active view. All computation is pure functions in `analytics-utils.ts` (no React, fully testable). CSS scoped to `.oa-*` prefix.

**Tech Stack:** React 19 + TypeScript, Vitest, Lucide React icons, CSS custom properties (`--bg-color`, `--primary`, `--text-dark`, `--border-color`, `--card-bg`, `--surface-raised`, `--text-muted`, `--success`, `--danger`, `--accent`).

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/lib/analytics-utils.ts` | Create | All pure computation + `ANALYTICS_CATEGORY_COLORS` |
| `src/lib/__tests__/analytics-utils.test.ts` | Create | Unit tests for all utils |
| `src/pages/ObsidianAnalytics.tsx` | Create | Root component + all panel components + 3 views |
| `src/pages/ObsidianAnalytics.css` | Create | All `.oa-*` scoped styles |
| `src/pages/Analytics.tsx` | Modify | Add early-return for obsidian theme |
| `src/pages/ObsidianPlanner.tsx` | Modify | Import `ANALYTICS_CATEGORY_COLORS` from analytics-utils instead of local const |

---

## Task 1: analytics-utils.ts — pure computation functions + tests (TDD)

**Files:**
- Create: `src/lib/analytics-utils.ts`
- Create: `src/lib/__tests__/analytics-utils.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/__tests__/analytics-utils.test.ts
import { describe, it, expect } from 'vitest'
import {
  computeStreaks,
  computeWeeklyStats,
  computeSubjectBreakdown,
  computeDeadlineUrgency,
  computeFocusTypeBreakdown,
  computeTimeOfDay,
  computeWeekTrend,
  ANALYTICS_CATEGORY_COLORS,
} from '../analytics-utils'
import type { Session, Subject, SessionBlock } from '../db'
import type { Technique } from '../techniques'

// ── factories ──────────────────────────────────────────────────────────────

function makeSession(id: string, started_at: string, actual_minutes: number): Session {
  return { id, started_at, ended_at: null, template: 'Custom', repeats: 1, planned_minutes: actual_minutes, actual_minutes }
}

function makeSubject(id: string, name: string, deadline: string | null = null): Subject {
  return { id, name, deadline, cover_path: null, pinned: 0, created_at: '2024-01-01T00:00:00Z', last_studied_at: null, total_minutes: 0, archived: 0, focus_type: null, chapters: null, result: null, deleted_at: null, subject_type: null }
}

function makeBlock(sessionId: string, subjectId: string | null, minutes: number, techniqueId: string | null = null): SessionBlock {
  return { id: 'b-' + Math.random(), session_id: sessionId, idx: 0, type: 'WORK', minutes, subject_id: subjectId, technique_id: techniqueId, chapter_name: null, confidence_score: null, started_at: null, ended_at: null }
}

function makeTech(id: string, category: 'memoriser' | 'comprendre' | 'faire', tier: 'S' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' = 'A'): Technique {
  return { id, name: id, tier, hint: '', advantage: '', category }
}

// ── computeStreaks ──────────────────────────────────────────────────────────

describe('computeStreaks', () => {
  it('returns zeros for empty sessions', () => {
    expect(computeStreaks([])).toEqual({ current: 0, best: 0 })
  })

  it('returns 1/1 for a single session today', () => {
    const today = new Date().toISOString()
    const result = computeStreaks([makeSession('s1', today, 30)])
    expect(result.current).toBe(1)
    expect(result.best).toBe(1)
  })

  it('counts consecutive days correctly', () => {
    const sessions = [
      makeSession('s1', '2024-03-01T10:00:00Z', 30),
      makeSession('s2', '2024-03-02T10:00:00Z', 30),
      makeSession('s3', '2024-03-03T10:00:00Z', 30),
    ]
    const result = computeStreaks(sessions)
    expect(result.best).toBe(3)
  })

  it('resets streak on gap', () => {
    const sessions = [
      makeSession('s1', '2024-03-01T10:00:00Z', 30),
      makeSession('s2', '2024-03-02T10:00:00Z', 30),
      makeSession('s3', '2024-03-04T10:00:00Z', 30), // gap at 03
    ]
    const result = computeStreaks(sessions)
    expect(result.best).toBe(2)
  })

  it('sets current=0 when last session is more than 1 day ago', () => {
    const result = computeStreaks([makeSession('s1', '2020-01-01T10:00:00Z', 30)])
    expect(result.current).toBe(0)
    expect(result.best).toBe(1)
  })

  it('ignores sessions with actual_minutes=0', () => {
    const today = new Date().toISOString()
    expect(computeStreaks([makeSession('s1', today, 0)])).toEqual({ current: 0, best: 0 })
  })
})

// ── computeSubjectBreakdown ────────────────────────────────────────────────

describe('computeSubjectBreakdown', () => {
  it('returns empty for no WORK blocks', () => {
    expect(computeSubjectBreakdown([], [], [])).toEqual([])
  })

  it('single subject gets pct=100 and isHyperfocus=true', () => {
    const s = makeSession('s1', '2024-01-01T10:00:00Z', 60)
    const sub = makeSubject('sub1', 'Math')
    const block = makeBlock('s1', 'sub1', 60)
    const rows = computeSubjectBreakdown([block], [sub], [s])
    expect(rows).toHaveLength(1)
    expect(rows[0].pct).toBe(100)
    expect(rows[0].isHyperfocus).toBe(true)
  })

  it('two equal subjects each get pct=50 and isHyperfocus=false', () => {
    const s = makeSession('s1', '2024-01-01T10:00:00Z', 60)
    const sub1 = makeSubject('sub1', 'Math')
    const sub2 = makeSubject('sub2', 'Physics')
    const blocks = [makeBlock('s1', 'sub1', 30), makeBlock('s1', 'sub2', 30)]
    const rows = computeSubjectBreakdown(blocks, [sub1, sub2], [s])
    expect(rows).toHaveLength(2)
    rows.forEach(r => {
      expect(r.pct).toBe(50)
      expect(r.isHyperfocus).toBe(false)
    })
  })

  it('flags isHyperfocus when pct > 50', () => {
    const s = makeSession('s1', '2024-01-01T10:00:00Z', 100)
    const sub1 = makeSubject('sub1', 'Math')
    const sub2 = makeSubject('sub2', 'Physics')
    const blocks = [makeBlock('s1', 'sub1', 51), makeBlock('s1', 'sub2', 49)]
    const rows = computeSubjectBreakdown(blocks, [sub1, sub2], [s])
    const math = rows.find(r => r.subjectId === 'sub1')!
    expect(math.isHyperfocus).toBe(true)
  })

  it('filters by periodStart using session started_at', () => {
    const old = makeSession('s1', '2020-01-01T10:00:00Z', 30)
    const recent = makeSession('s2', '2024-06-01T10:00:00Z', 30)
    const sub = makeSubject('sub1', 'Math')
    const blocks = [makeBlock('s1', 'sub1', 30), makeBlock('s2', 'sub1', 30)]
    const periodStart = new Date('2024-01-01T00:00:00Z')
    const rows = computeSubjectBreakdown(blocks, [sub], [old, recent], periodStart)
    expect(rows[0].minutes).toBe(30) // only recent block counts
  })
})

// ── computeDeadlineUrgency ────────────────────────────────────────────────

describe('computeDeadlineUrgency', () => {
  it('excludes subjects with no deadline', () => {
    const sub = makeSubject('s1', 'Math', null)
    expect(computeDeadlineUrgency([sub], [])).toEqual([])
  })

  it('marks red when daysRemaining <= 7', () => {
    const soon = new Date()
    soon.setDate(soon.getDate() + 5)
    const sub = makeSubject('s1', 'Math', soon.toISOString().slice(0, 10))
    const rows = computeDeadlineUrgency([sub], [])
    expect(rows[0].urgency).toBe('red')
    expect(rows[0].daysRemaining).toBeGreaterThanOrEqual(4)
    expect(rows[0].daysRemaining).toBeLessThanOrEqual(5)
  })

  it('marks amber when 7 < daysRemaining <= 30', () => {
    const soon = new Date()
    soon.setDate(soon.getDate() + 15)
    const sub = makeSubject('s1', 'Math', soon.toISOString().slice(0, 10))
    expect(computeDeadlineUrgency([sub], [])[0].urgency).toBe('amber')
  })

  it('marks green when daysRemaining > 30', () => {
    const far = new Date()
    far.setDate(far.getDate() + 60)
    const sub = makeSubject('s1', 'Math', far.toISOString().slice(0, 10))
    expect(computeDeadlineUrgency([sub], [])[0].urgency).toBe('green')
  })

  it('marks red with negative daysRemaining for past deadlines', () => {
    const past = makeSubject('s1', 'Math', '2020-01-01')
    const rows = computeDeadlineUrgency([past], [])
    expect(rows[0].urgency).toBe('red')
    expect(rows[0].daysRemaining).toBeLessThan(0)
  })

  it('calculates hoursStudied from all-time WORK blocks for that subject', () => {
    const sub = makeSubject('s1', 'Math', '2099-01-01')
    const block = makeBlock('sess1', 's1', 120)
    const rows = computeDeadlineUrgency([sub], [block])
    expect(rows[0].hoursStudied).toBeCloseTo(2)
  })
})

// ── computeFocusTypeBreakdown ─────────────────────────────────────────────

describe('computeFocusTypeBreakdown', () => {
  it('returns zeros when no blocks', () => {
    expect(computeFocusTypeBreakdown([], [])).toEqual({ comprendre: 0, memoriser: 0, faire: 0 })
  })

  it('excludes blocks with no technique_id', () => {
    const block = makeBlock('s1', 'sub1', 30, null)
    expect(computeFocusTypeBreakdown([block], [])).toEqual({ comprendre: 0, memoriser: 0, faire: 0 })
  })

  it('excludes techniques with no category', () => {
    const tech: Technique = { id: 't1', name: 'T1', tier: 'A', hint: '', advantage: '' }
    const block = makeBlock('s1', 'sub1', 30, 't1')
    expect(computeFocusTypeBreakdown([block], [tech])).toEqual({ comprendre: 0, memoriser: 0, faire: 0 })
  })

  it('correctly adds minutes to matching category', () => {
    const tech = makeTech('t1', 'memoriser')
    const block = makeBlock('s1', 'sub1', 45, 't1')
    const result = computeFocusTypeBreakdown([block], [tech])
    expect(result.memoriser).toBe(45)
    expect(result.comprendre).toBe(0)
    expect(result.faire).toBe(0)
  })

  it('distributes minutes across all three categories', () => {
    const t1 = makeTech('t1', 'comprendre')
    const t2 = makeTech('t2', 'memoriser')
    const t3 = makeTech('t3', 'faire')
    const blocks = [makeBlock('s1', null, 10, 't1'), makeBlock('s1', null, 20, 't2'), makeBlock('s1', null, 30, 't3')]
    const result = computeFocusTypeBreakdown(blocks, [t1, t2, t3])
    expect(result.comprendre).toBe(10)
    expect(result.memoriser).toBe(20)
    expect(result.faire).toBe(30)
  })
})

// ── computeTimeOfDay ──────────────────────────────────────────────────────

describe('computeTimeOfDay', () => {
  const makeSess = (hour: number, mins: number) => {
    const d = new Date(2024, 0, 15, hour, 0, 0)
    return makeSession('s' + hour, d.toISOString(), mins)
  }

  it('assigns 06:00 session to morning', () => {
    expect(computeTimeOfDay([makeSess(6, 30)]).morning).toBe(30)
  })

  it('assigns 12:00 session to afternoon', () => {
    expect(computeTimeOfDay([makeSess(12, 30)]).afternoon).toBe(30)
  })

  it('assigns 18:00 session to evening', () => {
    expect(computeTimeOfDay([makeSess(18, 30)]).evening).toBe(30)
  })

  it('assigns 00:00 session to night', () => {
    expect(computeTimeOfDay([makeSess(0, 30)]).night).toBe(30)
  })

  it('assigns 05:59 to night', () => {
    const d = new Date(2024, 0, 15, 5, 59, 0)
    const s = makeSession('sx', d.toISOString(), 30)
    expect(computeTimeOfDay([s]).night).toBe(30)
  })
})

// ── computeWeekTrend ──────────────────────────────────────────────────────

describe('computeWeekTrend', () => {
  it('returns null when both weeks are zero', () => {
    const result = computeWeekTrend([], { minutes: 0, count: 0, activeDays: 0 }, 'monday')
    expect(result.weekMinutesDelta).toBeNull()
    expect(result.weekCountDelta).toBeNull()
  })

  it('returns 100 when previous week was zero and current is positive', () => {
    const result = computeWeekTrend([], { minutes: 60, count: 1, activeDays: 1 }, 'monday')
    expect(result.weekMinutesDelta).toBe(100)
  })

  it('calculates correct percentage change', () => {
    // Previous week: 60 mins. Current week: 90 mins → +50%
    const prevWeekDate = new Date()
    prevWeekDate.setDate(prevWeekDate.getDate() - 10)
    const sessions = [makeSession('old', prevWeekDate.toISOString(), 60)]
    const result = computeWeekTrend(sessions, { minutes: 90, count: 2, activeDays: 2 }, 'monday')
    expect(result.weekMinutesDelta).toBe(50)
  })
})

// ── ANALYTICS_CATEGORY_COLORS ─────────────────────────────────────────────

describe('ANALYTICS_CATEGORY_COLORS', () => {
  it('has entries for all three categories', () => {
    expect(ANALYTICS_CATEGORY_COLORS.comprendre).toBeDefined()
    expect(ANALYTICS_CATEGORY_COLORS.memoriser).toBeDefined()
    expect(ANALYTICS_CATEGORY_COLORS.faire).toBeDefined()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/lib/__tests__/analytics-utils.test.ts
```

Expected: FAIL — `Cannot find module '../analytics-utils'`

- [ ] **Step 3: Implement `analytics-utils.ts`**

```ts
// src/lib/analytics-utils.ts
import type { Session, Subject, SessionBlock } from './db'
import type { Technique, TechCategory } from './techniques'
import type { RatingEntry } from './chapters'

export const ANALYTICS_CATEGORY_COLORS: Record<TechCategory, string> = {
  comprendre: '#38bdf8',
  memoriser:  '#f472b6',
  faire:      '#34d399',
}

export interface SubjectRow {
  subjectId: string
  name: string
  minutes: number
  pct: number
  isHyperfocus: boolean
}

export interface DeadlineRow {
  subjectId: string
  name: string
  deadline: string
  daysRemaining: number
  hoursStudied: number
  urgency: 'red' | 'amber' | 'green'
}

export interface TierSlice {
  tier: string
  mins: number
  pct: number
  color: string
}

export interface TierBreakdown {
  data: TierSlice[]
  total: number
  dfRatio: number
}

export interface DayBar {
  dateStr: string
  date: Date
  minutes: number
}

export interface TimelineResult {
  data: DayBar[]
  maxMins: number
  studiedDays: number
  totalPeriodMinutes: number
}

export interface CalibrationResult {
  totalCount: number
  goodPct: number
  avgGap: number | null
  countWithPreRecall: number
}

export interface TagRow {
  tag: string
  mins: number
}

export interface TagBreakdown {
  data: TagRow[]
  maxMins: number
}

export interface FocusBreakdown {
  comprendre: number
  memoriser: number
  faire: number
}

export interface WeeklyStats {
  minutes: number
  count: number
  activeDays: number
}

export interface WeekTrend {
  weekMinutesDelta: number | null
  weekCountDelta: number | null
}

export interface TimeOfDay {
  morning: number
  afternoon: number
  evening: number
  night: number
}

export interface Streaks {
  current: number
  best: number
}

// ── helpers ─────────────────────────────────────────────────────────────────

function toLocalDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function utcDayDiff(a: Date, b: Date): number {
  return Math.round(
    (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
     Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000
  )
}

// ── computeStreaks ────────────────────────────────────────────────────────────

export function computeStreaks(sessions: Session[]): Streaks {
  const dates = new Set<string>()
  sessions.forEach(s => {
    if (s.actual_minutes > 0) dates.add(toLocalDateStr(new Date(s.started_at)))
  })
  const sorted = Array.from(dates).sort()
  if (sorted.length === 0) return { current: 0, best: 0 }

  let best = 1, run = 1
  let lastDate = new Date(sorted[0] + 'T12:00:00')
  for (let i = 1; i < sorted.length; i++) {
    const d = new Date(sorted[i] + 'T12:00:00')
    const diff = utcDayDiff(lastDate, d)
    if (diff === 1) { run++; if (run > best) best = run }
    else if (diff > 1) run = 1
    lastDate = d
  }

  const today = new Date()
  const diffToToday = utcDayDiff(lastDate, today)
  const current = diffToToday > 1 ? 0 : run

  return { current, best: Math.max(current, best) }
}

// ── computeWeeklyStats ────────────────────────────────────────────────────────

export function computeWeeklyStats(sessions: Session[], weekStart: 'monday' | 'sunday'): WeeklyStats {
  const today = new Date()
  const day = today.getDay()
  const diff = weekStart === 'monday'
    ? today.getDate() - day + (day === 0 ? -6 : 1)
    : today.getDate() - day
  const startOfWeek = new Date(today)
  startOfWeek.setDate(diff)
  startOfWeek.setHours(0, 0, 0, 0)

  let minutes = 0, count = 0
  const days = new Set<string>()
  sessions.forEach(s => {
    const sd = new Date(s.started_at)
    if (sd >= startOfWeek) {
      minutes += s.actual_minutes
      count++
      days.add(toLocalDateStr(sd))
    }
  })
  return { minutes, count, activeDays: days.size }
}

// ── computeSubjectBreakdown ───────────────────────────────────────────────────

export function computeSubjectBreakdown(
  blocks: SessionBlock[],
  subjects: Subject[],
  sessions: Session[],
  periodStart?: Date
): SubjectRow[] {
  const validSessionIds = periodStart
    ? new Set(sessions.filter(s => new Date(s.started_at) >= periodStart).map(s => s.id))
    : new Set(sessions.map(s => s.id))

  const minuteMap: Record<string, number> = {}
  blocks.forEach(b => {
    if (b.type !== 'WORK' || !b.subject_id) return
    if (periodStart && !validSessionIds.has(b.session_id)) return
    minuteMap[b.subject_id] = (minuteMap[b.subject_id] ?? 0) + b.minutes
  })

  const total = Object.values(minuteMap).reduce((a, v) => a + v, 0)
  if (total === 0) return []

  return subjects
    .filter(s => (minuteMap[s.id] ?? 0) > 0)
    .map(s => {
      const minutes = minuteMap[s.id]
      const pct = Math.round((minutes / total) * 100)
      return { subjectId: s.id, name: s.name, minutes, pct, isHyperfocus: pct > 50 }
    })
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 10)
}

// ── computeDeadlineUrgency ────────────────────────────────────────────────────

export function computeDeadlineUrgency(subjects: Subject[], blocks: SessionBlock[]): DeadlineRow[] {
  const today = new Date()

  const hoursMap: Record<string, number> = {}
  blocks.forEach(b => {
    if (b.type === 'WORK' && b.subject_id) {
      hoursMap[b.subject_id] = (hoursMap[b.subject_id] ?? 0) + b.minutes / 60
    }
  })

  return subjects
    .filter(s => s.deadline)
    .map(s => {
      const deadlineDate = new Date(s.deadline! + 'T12:00:00')
      const daysRemaining = utcDayDiff(today, deadlineDate)
      const urgency: 'red' | 'amber' | 'green' =
        daysRemaining <= 7 ? 'red' : daysRemaining <= 30 ? 'amber' : 'green'
      return {
        subjectId: s.id,
        name: s.name,
        deadline: s.deadline!,
        daysRemaining,
        hoursStudied: Math.round((hoursMap[s.id] ?? 0) * 10) / 10,
        urgency,
      }
    })
    .sort((a, b) => {
      const order = { red: 0, amber: 1, green: 2 }
      if (order[a.urgency] !== order[b.urgency]) return order[a.urgency] - order[b.urgency]
      return a.daysRemaining - b.daysRemaining
    })
}

// ── computeFocusTypeBreakdown ─────────────────────────────────────────────────

export function computeFocusTypeBreakdown(blocks: SessionBlock[], techniques: Technique[]): FocusBreakdown {
  const result: FocusBreakdown = { comprendre: 0, memoriser: 0, faire: 0 }
  const techMap = new Map(techniques.map(t => [t.id, t]))
  blocks.forEach(b => {
    if (b.type !== 'WORK' || !b.technique_id) return
    const tech = techMap.get(b.technique_id)
    if (!tech?.category) return
    result[tech.category] += b.minutes
  })
  return result
}

// ── computeTechTierBreakdown ──────────────────────────────────────────────────

export function computeTechTierBreakdown(
  blocks: SessionBlock[],
  sessions: Session[],
  techniques: Technique[],
): TierBreakdown {
  const TIER_ORDER = ['S', 'A', 'B', 'C', 'D', 'E', 'F'] as const
  const TIER_COLORS: Record<string, string> = {
    S: '#58a6ff', A: 'var(--success)', B: '#3b82f6',
    C: '#22d3ee', D: '#f59e0b', E: 'var(--danger)', F: '#9ca3af',
  }
  const validSessionIds = new Set(sessions.map(s => s.id))
  const tierMap: Record<string, number> = { S: 0, A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 }
  let total = 0

  blocks.forEach(b => {
    if (!validSessionIds.has(b.session_id) || b.type !== 'WORK' || !b.technique_id) return
    const tech = techniques.find(t => t.id === b.technique_id)
    if (!tech?.tier) return
    tierMap[tech.tier] += b.minutes
    total += b.minutes
  })

  if (total === 0) return { data: [], total: 0, dfRatio: 0 }

  const data: TierSlice[] = TIER_ORDER
    .map(t => ({ tier: t, mins: tierMap[t], pct: Math.round((tierMap[t] / total) * 100), color: TIER_COLORS[t] }))
    .filter(d => d.mins > 0)

  const dfRatio = Math.round(((tierMap.D + tierMap.E + tierMap.F) / total) * 100)
  return { data, total, dfRatio }
}

// ── computeTimeOfDay ──────────────────────────────────────────────────────────

export function computeTimeOfDay(sessions: Session[]): TimeOfDay {
  const result: TimeOfDay = { morning: 0, afternoon: 0, evening: 0, night: 0 }
  sessions.forEach(s => {
    const hour = new Date(s.started_at).getHours()
    const mins = s.actual_minutes
    if (hour >= 6 && hour < 12) result.morning += mins
    else if (hour >= 12 && hour < 18) result.afternoon += mins
    else if (hour >= 18) result.evening += mins
    else result.night += mins
  })
  return result
}

// ── computeTimeline ───────────────────────────────────────────────────────────

export function computeTimeline(sessions: Session[], filterMonths: number): TimelineResult {
  const now = new Date()
  now.setHours(23, 59, 59, 999)
  const startPeriod = new Date(now)
  if (filterMonths === 0.25) startPeriod.setDate(now.getDate() - 7)
  else if (filterMonths === 0.5) startPeriod.setDate(now.getDate() - 14)
  else startPeriod.setMonth(now.getMonth() - filterMonths)
  startPeriod.setHours(0, 0, 0, 0)

  const dailyTotals: Record<string, number> = {}
  let itr = new Date(startPeriod)
  while (itr <= now) {
    dailyTotals[toLocalDateStr(itr)] = 0
    itr.setDate(itr.getDate() + 1)
  }

  sessions.forEach(s => {
    const sd = new Date(s.started_at)
    if (sd >= startPeriod && sd <= now) {
      const key = toLocalDateStr(sd)
      if (key in dailyTotals) dailyTotals[key] += s.actual_minutes
    }
  })

  const sortedDays = Object.keys(dailyTotals).sort()
  const data: DayBar[] = sortedDays.map(dateStr => ({
    dateStr,
    date: new Date(dateStr + 'T12:00:00'),
    minutes: dailyTotals[dateStr],
  }))

  const maxMins = Math.max(...data.map(d => d.minutes), 60)
  const studiedDays = data.filter(d => d.minutes > 0).length
  const totalPeriodMinutes = data.reduce((acc, d) => acc + d.minutes, 0)
  return { data, maxMins, studiedDays, totalPeriodMinutes }
}

// ── computeCalibration ────────────────────────────────────────────────────────

export function computeCalibration(ratings: RatingEntry[]): CalibrationResult | null {
  if (ratings.length === 0) return null
  const RECALL: Record<string, number> = { nothing: 0, some: 0.33, most: 0.67, all: 1 }
  const RATING: Record<string, number> = { forgot: 0, hard: 0.33, good: 0.67, easy: 1 }

  let totalGap = 0, countWithPreRecall = 0, goodCount = 0
  for (const r of ratings) {
    if (r.preRecall != null) {
      totalGap += (RATING[r.rating] ?? 0) - (RECALL[r.preRecall] ?? 0)
      countWithPreRecall++
    }
    if (r.rating === 'good' || r.rating === 'easy') goodCount++
  }

  return {
    totalCount: ratings.length,
    goodPct: Math.round((goodCount / ratings.length) * 100),
    avgGap: countWithPreRecall > 0 ? totalGap / countWithPreRecall : null,
    countWithPreRecall,
  }
}

// ── computeTagBreakdown ───────────────────────────────────────────────────────

export function computeTagBreakdown(
  blocks: SessionBlock[],
  sessions: Session[],
  subjectTagsMap: Map<string, string[]>
): TagBreakdown {
  const validSessionIds = new Set(sessions.map(s => s.id))
  const tagMinutes: Record<string, number> = {}

  blocks.forEach(b => {
    if (!validSessionIds.has(b.session_id) || b.type !== 'WORK' || !b.subject_id) return
    const tags = subjectTagsMap.get(b.subject_id)
    if (!tags || tags.length === 0) return
    tags.forEach(tag => { tagMinutes[tag] = (tagMinutes[tag] ?? 0) + b.minutes })
  })

  const data: TagRow[] = Object.entries(tagMinutes)
    .map(([tag, mins]) => ({ tag, mins }))
    .sort((a, b) => b.mins - a.mins)

  return { data, maxMins: data[0]?.mins ?? 0 }
}

// ── computeWeekTrend ──────────────────────────────────────────────────────────

export function computeWeekTrend(
  sessions: Session[],
  currentWeek: WeeklyStats,
  weekStart: 'monday' | 'sunday'
): WeekTrend {
  const today = new Date()
  const day = today.getDay()
  const diff = weekStart === 'monday'
    ? today.getDate() - day + (day === 0 ? -6 : 1)
    : today.getDate() - day
  const thisWeekStart = new Date(today)
  thisWeekStart.setDate(diff)
  thisWeekStart.setHours(0, 0, 0, 0)
  const lastWeekStart = new Date(thisWeekStart)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)

  let lastMins = 0, lastCount = 0
  sessions.forEach(s => {
    const sd = new Date(s.started_at)
    if (sd >= lastWeekStart && sd < thisWeekStart) {
      lastMins += s.actual_minutes
      lastCount++
    }
  })

  const pct = (current: number, prev: number): number | null => {
    if (prev === 0) return current > 0 ? 100 : null
    return Math.round(((current - prev) / prev) * 100)
  }

  return {
    weekMinutesDelta: pct(currentWeek.minutes, lastMins),
    weekCountDelta: pct(currentWeek.count, lastCount),
  }
}
```

- [ ] **Step 4: Run tests — all must pass**

```bash
npx vitest run src/lib/__tests__/analytics-utils.test.ts
```

Expected: all tests PASS

- [ ] **Step 5: Run full suite — no regressions**

```bash
npx vitest run
```

Expected: 87 tests pass (existing) + new tests pass

- [ ] **Step 6: Commit**

```bash
git add src/lib/analytics-utils.ts src/lib/__tests__/analytics-utils.test.ts
git commit -m "feat(analytics): add analytics-utils.ts with pure computation functions and tests"
```

---

## Task 2: Move PICKER_CATEGORY_COLORS → import ANALYTICS_CATEGORY_COLORS in ObsidianPlanner.tsx

**Files:**
- Modify: `src/pages/ObsidianPlanner.tsx`

- [ ] **Step 1: Add import to ObsidianPlanner.tsx**

In `src/pages/ObsidianPlanner.tsx`, add to the import block:

```ts
import { ANALYTICS_CATEGORY_COLORS } from '../lib/analytics-utils'
```

- [ ] **Step 2: Remove the local const and rename all usages**

Remove these lines from ObsidianPlanner.tsx (around line 393):

```ts
const PICKER_CATEGORY_COLORS: Record<TechCategory, string> = {
  comprendre: '#38bdf8',
  memoriser:  '#f472b6',
  faire:      '#34d399',
}
```

Then replace every occurrence of `PICKER_CATEGORY_COLORS` with `ANALYTICS_CATEGORY_COLORS` in ObsidianPlanner.tsx. There are 3 occurrences (lines ~459, ~477, ~479).

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/pages/ObsidianPlanner.tsx
git commit -m "refactor(planner): import ANALYTICS_CATEGORY_COLORS from analytics-utils instead of local copy"
```

---

## Task 3: Analytics.tsx early-return + ObsidianAnalytics.tsx skeleton + root CSS

**Files:**
- Modify: `src/pages/Analytics.tsx`
- Create: `src/pages/ObsidianAnalytics.tsx`
- Create: `src/pages/ObsidianAnalytics.css`

- [ ] **Step 1: Add early-return to Analytics.tsx**

In `src/pages/Analytics.tsx`, add to imports:

```tsx
import { useSettings } from '../lib/settings';
import ObsidianAnalytics from './ObsidianAnalytics';
```

Then add this as the FIRST statement inside `AnalyticsTab()`, right after the `useSettings()` call (which you now need to add):

```tsx
const { weekStart, theme } = useSettings();
if (theme === 'obsidian') return <ObsidianAnalytics />;
```

Note: `weekStart` is already used later in the function. Remove the existing `const { weekStart } = useSettings()` line and replace it with the one above.

- [ ] **Step 2: Create ObsidianAnalytics.tsx skeleton**

```tsx
// src/pages/ObsidianAnalytics.tsx
import { useState, useEffect, useMemo } from 'react'
import { AlignJustify, Columns2, Minimize2 } from 'lucide-react'
import { getSessions, getSubjects, getAllSessionBlocks, getAllSubjectTagsMap } from '../lib/db'
import type { Session, Subject, SessionBlock } from '../lib/db'
import { getRatings } from '../lib/chapters'
import { TECHNIQUES } from '../lib/techniques'
import { useSettings } from '../lib/settings'
import {
  computeStreaks, computeWeeklyStats, computeSubjectBreakdown,
  computeDeadlineUrgency, computeFocusTypeBreakdown, computeTechTierBreakdown,
  computeTimeOfDay, computeTimeline, computeCalibration, computeTagBreakdown,
  computeWeekTrend,
  type SubjectRow, type DeadlineRow, type TierBreakdown, type FocusBreakdown,
  type TimelineResult, type CalibrationResult, type TagBreakdown as TagBreakdownData,
  type TimeOfDay, type Streaks, type WeeklyStats, type WeekTrend,
} from '../lib/analytics-utils'
import './ObsidianAnalytics.css'

type AnalyticsView = 'command' | 'narrative' | 'minimal'
const LS_VIEW_KEY = 'obsidian-analytics-view'
const LS_TIMELINE_KEY = 'obsidian-analytics-timeline'

export interface DerivedAnalytics {
  streaks: Streaks
  weekly: WeeklyStats
  trend: WeekTrend
  avgSession: number
  subjectRows: SubjectRow[]
  deadlineRows: DeadlineRow[]
  focusBreakdown: FocusBreakdown
  techTiers: TierBreakdown
  timeOfDay: TimeOfDay
  timeline: TimelineResult
  calibration: CalibrationResult | null
  tags: TagBreakdownData
  subjects: Subject[]
  sessions: Session[]
  blocks: SessionBlock[]
  subjectTagsMap: Map<string, string[]>
}

export default function ObsidianAnalytics() {
  const { weekStart } = useSettings()
  const [view, setView] = useState<AnalyticsView>(
    () => (localStorage.getItem(LS_VIEW_KEY) as AnalyticsView | null) ?? 'command'
  )
  const [timelineFilter, setTimelineFilter] = useState(
    () => parseFloat(localStorage.getItem(LS_TIMELINE_KEY) ?? '1')
  )
  const [sessions, setSessions] = useState<Session[]>([])
  const [blocks, setBlocks] = useState<SessionBlock[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [subjectTagsMap, setSubjectTagsMap] = useState<Map<string, string[]>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    Promise.all([getSessions(), getSubjects(), getAllSessionBlocks(), getAllSubjectTagsMap()]).then(
      ([sess, subs, blks, tagsMap]) => {
        if (!mounted) return
        setSessions(sess)
        setSubjects(subs.filter(s => !s.deleted_at && !s.archived))
        setBlocks(blks)
        setSubjectTagsMap(tagsMap)
        setLoading(false)
      }
    )
    return () => { mounted = false }
  }, [])

  function changeView(v: AnalyticsView) {
    setView(v)
    localStorage.setItem(LS_VIEW_KEY, v)
  }

  function changeTimeline(v: number) {
    setTimelineFilter(v)
    localStorage.setItem(LS_TIMELINE_KEY, String(v))
  }

  const derived = useMemo<DerivedAnalytics | null>(() => {
    if (loading) return null
    const weekly = computeWeeklyStats(sessions, weekStart)
    return {
      streaks: computeStreaks(sessions),
      weekly,
      trend: computeWeekTrend(sessions, weekly, weekStart),
      avgSession: sessions.length > 0
        ? Math.round(sessions.reduce((a, s) => a + s.actual_minutes, 0) / sessions.length)
        : 0,
      subjectRows: computeSubjectBreakdown(blocks, subjects, sessions),
      deadlineRows: computeDeadlineUrgency(subjects, blocks),
      focusBreakdown: computeFocusTypeBreakdown(blocks, TECHNIQUES),
      techTiers: computeTechTierBreakdown(blocks, sessions, TECHNIQUES),
      timeOfDay: computeTimeOfDay(sessions),
      timeline: computeTimeline(sessions, timelineFilter),
      calibration: computeCalibration(getRatings()),
      tags: computeTagBreakdown(blocks, sessions, subjectTagsMap),
      subjects,
      sessions,
      blocks,
      subjectTagsMap,
    }
  }, [sessions, blocks, subjects, subjectTagsMap, weekStart, timelineFilter, loading])

  if (loading || !derived) {
    return (
      <div className="oa-root">
        <div className="oa-loading">Loading analytics…</div>
      </div>
    )
  }

  return (
    <div className="oa-root">
      <div className="oa-topbar">
        <div className="oa-view-pills">
          <button
            className={`oa-view-pill${view === 'command' ? ' oa-view-pill-active' : ''}`}
            onClick={() => changeView('command')}
            title="Everything at once — grounding stats, deadline radar, full breakdown"
          >
            <AlignJustify size={14} /> Command
          </button>
          <button
            className={`oa-view-pill${view === 'narrative' ? ' oa-view-pill-active' : ''}`}
            onClick={() => changeView('narrative')}
            title="Story top to bottom — each section answers one question"
          >
            <Columns2 size={14} /> Narrative
          </button>
          <button
            className={`oa-view-pill${view === 'minimal' ? ' oa-view-pill-active' : ''}`}
            onClick={() => changeView('minimal')}
            title="Just what matters — time, streak, subjects, techniques"
          >
            <Minimize2 size={14} /> Minimal
          </button>
        </div>
      </div>
      <div className="oa-content">
        {view === 'command' && (
          <CommandView derived={derived} timelineFilter={timelineFilter} onTimelineChange={changeTimeline} />
        )}
        {view === 'narrative' && (
          <NarrativeView derived={derived} timelineFilter={timelineFilter} onTimelineChange={changeTimeline} />
        )}
        {view === 'minimal' && (
          <MinimalView derived={derived} timelineFilter={timelineFilter} onTimelineChange={changeTimeline} />
        )}
      </div>
    </div>
  )
}

// Placeholder view stubs — replaced in later tasks
function CommandView(_p: { derived: DerivedAnalytics; timelineFilter: number; onTimelineChange: (v: number) => void }) {
  return <div className="oa-view-placeholder">Command view coming soon</div>
}
function NarrativeView(_p: { derived: DerivedAnalytics; timelineFilter: number; onTimelineChange: (v: number) => void }) {
  return <div className="oa-view-placeholder">Narrative view coming soon</div>
}
function MinimalView(_p: { derived: DerivedAnalytics; timelineFilter: number; onTimelineChange: (v: number) => void }) {
  return <div className="oa-view-placeholder">Minimal view coming soon</div>
}
```

- [ ] **Step 3: Create ObsidianAnalytics.css root layout**

```css
/* src/pages/ObsidianAnalytics.css */

/* ── Root ── */
.oa-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-color, #0d1117);
  color: var(--text-dark, #e6edf3);
  font-family: var(--font-body, system-ui, sans-serif);
  overflow: hidden;
}

.oa-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted, #7d8590);
  font-size: 14px;
}

/* ── Top bar ── */
.oa-topbar {
  display: flex;
  align-items: center;
  height: 48px;
  padding: 0 16px;
  border-bottom: 1px solid var(--border-color, #30363d);
  flex-shrink: 0;
}

.oa-view-pills {
  display: flex;
  gap: 4px;
  background: var(--surface-raised, #21262d);
  padding: 3px;
  border-radius: 8px;
}

.oa-view-pill {
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

.oa-view-pill:hover {
  color: var(--text-dark, #e6edf3);
  background: rgba(255,255,255,0.05);
}

.oa-view-pill-active {
  background: var(--primary, #58a6ff);
  color: #0d1117;
}

.oa-view-pill-active:hover {
  background: var(--primary, #58a6ff);
  color: #0d1117;
}

/* ── Content area ── */
.oa-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

/* ── Shared panel card ── */
.oa-panel {
  background: var(--card-bg, #161b22);
  border: 1px solid var(--border-color, #30363d);
  border-radius: 8px;
  padding: 16px;
}

.oa-panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted, #7d8590);
  margin-bottom: 12px;
}

/* ── Two-column grid ── */
.oa-two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

/* ── Empty state ── */
.oa-empty {
  color: var(--text-muted, #7d8590);
  font-size: 13px;
  font-style: italic;
  text-align: center;
  padding: 24px 0;
}

/* ── Placeholder (removed after Task 11-13) ── */
.oa-view-placeholder {
  padding: 32px;
  color: var(--text-muted, #7d8590);
  font-size: 14px;
}
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/pages/Analytics.tsx src/pages/ObsidianAnalytics.tsx src/pages/ObsidianAnalytics.css
git commit -m "feat(analytics): wire obsidian early-return and ObsidianAnalytics skeleton with view switcher"
```

---

## Task 4: StatStrip + ActivityTimeline panel components + CSS

**Files:**
- Modify: `src/pages/ObsidianAnalytics.tsx` (add components at bottom, before placeholder stubs)
- Modify: `src/pages/ObsidianAnalytics.css`

- [ ] **Step 1: Add `formatTime` helper and `StatStrip` component**

Add these to `src/pages/ObsidianAnalytics.tsx`, after the `DerivedAnalytics` interface:

```tsx
function formatTime(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

const TIMELINE_OPTIONS = [
  { value: 0.25, label: 'Last week' },
  { value: 0.5,  label: 'Last 2 weeks' },
  { value: 1,    label: 'Last month' },
  { value: 2,    label: 'Last 2 months' },
  { value: 3,    label: 'Last 3 months' },
  { value: 6,    label: 'Last 6 months' },
  { value: 12,   label: 'Last 12 months' },
]

function StatStrip({ derived }: { derived: DerivedAnalytics }) {
  const { weekly, trend, streaks, avgSession } = derived
  return (
    <div className="oa-stat-strip">
      <div className="oa-stat-pill">
        <span className="oa-stat-value">
          {formatTime(weekly.minutes)}
          {trend.weekMinutesDelta !== null && (
            <span className={`oa-trend-badge ${trend.weekMinutesDelta >= 0 ? 'oa-trend-up' : 'oa-trend-down'}`}>
              {trend.weekMinutesDelta >= 0 ? '▲' : '▼'}{Math.abs(trend.weekMinutesDelta)}%
            </span>
          )}
        </span>
        <span className="oa-stat-label">This week</span>
      </div>
      <div className="oa-stat-pill">
        <span className="oa-stat-value">{weekly.count}</span>
        <span className="oa-stat-label">Sessions</span>
      </div>
      <div className="oa-stat-pill">
        <span className="oa-stat-value">{streaks.current} <span className="oa-stat-suffix">days</span></span>
        <span className="oa-stat-label">Streak</span>
      </div>
      <div className="oa-stat-pill">
        <span className="oa-stat-value">{formatTime(avgSession)}</span>
        <span className="oa-stat-label">Avg session</span>
      </div>
    </div>
  )
}

function ActivityTimeline({
  derived,
  timelineFilter,
  onTimelineChange,
  tall = false,
}: {
  derived: DerivedAnalytics
  timelineFilter: number
  onTimelineChange: (v: number) => void
  tall?: boolean
}) {
  const { timeline } = derived
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const todayStr = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  })()

  return (
    <div className={`oa-panel oa-timeline-panel${tall ? ' oa-timeline-panel--tall' : ''}`}>
      <div className="oa-timeline-header">
        <span className="oa-panel-header" style={{ marginBottom: 0 }}>Activity</span>
        <div className="oa-timeline-meta">
          <span className="oa-timeline-summary">
            {timeline.studiedDays} days · {formatTime(timeline.totalPeriodMinutes)}
          </span>
          <select
            className="oa-timeline-select"
            value={String(timelineFilter)}
            onChange={e => onTimelineChange(parseFloat(e.target.value))}
          >
            {TIMELINE_OPTIONS.map(o => (
              <option key={o.value} value={String(o.value)}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="oa-bars-wrap">
        {timeline.data.map((day, i) => {
          const heightPct = Math.max((day.minutes / timeline.maxMins) * 100, day.minutes > 0 ? 2 : 0)
          const isToday = day.dateStr === todayStr
          const isHovered = hoveredIdx === i
          const label = day.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
          return (
            <div
              key={i}
              className="oa-bar-col"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {isHovered && day.minutes > 0 && (
                <div className="oa-bar-tooltip">
                  {formatTime(day.minutes)}
                  <div className="oa-bar-tooltip-date">{label}</div>
                </div>
              )}
              <div
                className={`oa-bar${isToday ? ' oa-bar--today' : ''}${isHovered ? ' oa-bar--hovered' : ''}${day.minutes === 0 ? ' oa-bar--empty' : ''}`}
                style={{ height: `${heightPct}%` }}
              />
              {timeline.data.length <= 14 && (
                <div className="oa-bar-xlabel">{day.date.getDate()}</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add CSS for StatStrip and ActivityTimeline**

Append to `src/pages/ObsidianAnalytics.css`:

```css
/* ── StatStrip ── */
.oa-stat-strip {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.oa-stat-pill {
  flex: 1;
  min-width: 120px;
  background: var(--card-bg, #161b22);
  border: 1px solid var(--border-color, #30363d);
  border-radius: 8px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.oa-stat-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 20px;
  font-weight: 700;
  color: var(--text-dark, #e6edf3);
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.oa-stat-suffix {
  font-size: 12px;
  font-weight: 400;
  color: var(--text-muted, #7d8590);
}

.oa-stat-label {
  font-size: 11px;
  color: var(--text-muted, #7d8590);
}

.oa-trend-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
}

.oa-trend-up {
  color: var(--success, #3fb950);
  background: rgba(63, 185, 80, 0.1);
}

.oa-trend-down {
  color: var(--danger, #f85149);
  background: rgba(248, 81, 73, 0.1);
}

/* ── ActivityTimeline ── */
.oa-timeline-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.oa-timeline-panel--tall .oa-bars-wrap {
  height: 200px;
}

.oa-timeline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.oa-timeline-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.oa-timeline-summary {
  font-size: 11px;
  color: var(--text-muted, #7d8590);
}

.oa-timeline-select {
  padding: 4px 8px;
  border: 1px solid var(--border-color, #30363d);
  background: var(--surface-raised, #21262d);
  color: var(--text-dark, #e6edf3);
  border-radius: 4px;
  font-size: 12px;
  outline: none;
  cursor: pointer;
}

.oa-bars-wrap {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 140px;
  width: 100%;
  position: relative;
}

.oa-bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
  position: relative;
  cursor: default;
}

.oa-bar {
  width: 100%;
  background: var(--primary, #58a6ff);
  border-radius: 2px 2px 0 0;
  opacity: 0.6;
  transition: opacity 0.1s, background 0.1s;
  min-height: 0;
}

.oa-bar--empty {
  background: var(--surface-raised, #21262d);
  opacity: 0.4;
  height: 2px !important;
}

.oa-bar--today {
  opacity: 1;
  background: var(--primary, #58a6ff);
}

.oa-bar--hovered {
  opacity: 1;
}

.oa-bar-tooltip {
  position: absolute;
  bottom: calc(100% + 4px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--card-bg, #161b22);
  border: 1px solid var(--border-color, #30363d);
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 11px;
  white-space: nowrap;
  z-index: 10;
  pointer-events: none;
}

.oa-bar-tooltip-date {
  color: var(--text-muted, #7d8590);
  font-size: 10px;
}

.oa-bar-xlabel {
  font-size: 9px;
  color: var(--text-muted, #7d8590);
  margin-top: 2px;
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/ObsidianAnalytics.tsx src/pages/ObsidianAnalytics.css
git commit -m "feat(analytics): add StatStrip and ActivityTimeline panel components"
```

---

## Task 5: SubjectBalance panel + CSS

**Files:**
- Modify: `src/pages/ObsidianAnalytics.tsx`
- Modify: `src/pages/ObsidianAnalytics.css`

- [ ] **Step 1: Add SubjectBalance component**

Add to `src/pages/ObsidianAnalytics.tsx` (before the stub functions):

```tsx
type SubjectPeriod = 'month' | '3months' | 'alltime'

function SubjectBalance({ derived, sessions }: { derived: DerivedAnalytics; sessions: Session[] }) {
  const [period, setPeriod] = useState<SubjectPeriod>('month')

  const periodStart = useMemo(() => {
    const d = new Date()
    if (period === 'month') { d.setMonth(d.getMonth() - 1) }
    else if (period === '3months') { d.setMonth(d.getMonth() - 3) }
    else { return undefined }
    d.setHours(0, 0, 0, 0)
    return d
  }, [period])

  const rows = useMemo(
    () => computeSubjectBreakdown(derived.blocks, derived.subjects, sessions, periodStart),
    [derived.blocks, derived.subjects, sessions, periodStart]
  )

  return (
    <div className="oa-panel">
      <div className="oa-subject-balance-header">
        <span className="oa-panel-header" style={{ marginBottom: 0 }}>Subject balance</span>
        <select
          className="oa-timeline-select"
          value={period}
          onChange={e => setPeriod(e.target.value as SubjectPeriod)}
        >
          <option value="month">This month</option>
          <option value="3months">Last 3 months</option>
          <option value="alltime">All time</option>
        </select>
      </div>
      {rows.length === 0 ? (
        <div className="oa-empty">No study data for this period</div>
      ) : (
        <div className="oa-subject-list">
          {rows.map(row => (
            <div key={row.subjectId} className={`oa-subject-row${row.isHyperfocus ? ' oa-subject-row--hyperfocus' : ''}`}>
              <div className="oa-subject-name" title={row.name}>{row.name}</div>
              <div className="oa-subject-bar-track">
                <div className="oa-subject-bar" style={{ width: `${row.pct}%` }} />
              </div>
              <div className="oa-subject-time">{formatTime(row.minutes)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add SubjectBalance CSS**

```css
/* ── SubjectBalance ── */
.oa-subject-balance-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.oa-subject-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.oa-subject-row {
  display: grid;
  grid-template-columns: 1fr 2fr auto;
  align-items: center;
  gap: 8px;
}

.oa-subject-row--hyperfocus .oa-subject-name {
  color: var(--danger, #f85149);
}

.oa-subject-row--hyperfocus .oa-subject-bar {
  background: var(--danger, #f85149);
}

.oa-subject-name {
  font-size: 12px;
  color: var(--text-dark, #e6edf3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.oa-subject-bar-track {
  height: 6px;
  background: var(--surface-raised, #21262d);
  border-radius: 3px;
  overflow: hidden;
}

.oa-subject-bar {
  height: 100%;
  background: var(--primary, #58a6ff);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.oa-subject-time {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-muted, #7d8590);
  white-space: nowrap;
}
```

- [ ] **Step 3: TypeScript check + commit**

```bash
npx tsc --noEmit
git add src/pages/ObsidianAnalytics.tsx src/pages/ObsidianAnalytics.css
git commit -m "feat(analytics): add SubjectBalance panel with period filter and hyperfocus indicator"
```

---

## Task 6: DeadlineUrgency panel + CSS

**Files:**
- Modify: `src/pages/ObsidianAnalytics.tsx`
- Modify: `src/pages/ObsidianAnalytics.css`

- [ ] **Step 1: Add DeadlineUrgency component**

```tsx
function DeadlineUrgency({ derived }: { derived: DerivedAnalytics }) {
  const { deadlineRows } = derived
  if (deadlineRows.length === 0) return null

  const URGENCY_COLORS = { red: 'var(--danger, #f85149)', amber: '#f59e0b', green: 'var(--success, #3fb950)' }

  return (
    <div className="oa-panel">
      <div className="oa-panel-header">Deadlines</div>
      <div className="oa-deadline-list">
        {deadlineRows.map(row => (
          <div key={row.subjectId} className="oa-deadline-row">
            <span className="oa-deadline-dot" style={{ background: URGENCY_COLORS[row.urgency] }} />
            <span className="oa-deadline-name" title={row.name}>{row.name}</span>
            <span className="oa-deadline-days" style={{ color: URGENCY_COLORS[row.urgency] }}>
              {row.daysRemaining < 0
                ? `${Math.abs(row.daysRemaining)}d overdue`
                : `${row.daysRemaining}d`}
            </span>
            <span className="oa-deadline-studied">{row.hoursStudied}h</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add DeadlineUrgency CSS**

```css
/* ── DeadlineUrgency ── */
.oa-deadline-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.oa-deadline-row {
  display: grid;
  grid-template-columns: 10px 1fr auto auto;
  align-items: center;
  gap: 8px;
}

.oa-deadline-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.oa-deadline-name {
  font-size: 12px;
  color: var(--text-dark, #e6edf3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.oa-deadline-days {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.oa-deadline-studied {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-muted, #7d8590);
  white-space: nowrap;
}
```

- [ ] **Step 3: TypeScript check + commit**

```bash
npx tsc --noEmit
git add src/pages/ObsidianAnalytics.tsx src/pages/ObsidianAnalytics.css
git commit -m "feat(analytics): add DeadlineUrgency panel with traffic-light urgency indicators"
```

---

## Task 7: TechTierBreakdown panel + CSS

**Files:**
- Modify: `src/pages/ObsidianAnalytics.tsx`
- Modify: `src/pages/ObsidianAnalytics.css`

- [ ] **Step 1: Add TechTierBreakdown component**

```tsx
function TechTierBreakdown({ derived }: { derived: DerivedAnalytics }) {
  const { techTiers } = derived
  if (techTiers.total === 0) {
    return (
      <div className="oa-panel">
        <div className="oa-panel-header">Technique tiers</div>
        <div className="oa-empty">No technique data yet</div>
      </div>
    )
  }

  const gradient = techTiers.data.reduce((acc, slice, idx) => {
    const prev = idx === 0 ? 0 : techTiers.data.slice(0, idx).reduce((s, d) => s + d.pct, 0)
    const end = prev + slice.pct
    const color = slice.color.startsWith('linear-gradient') ? slice.color.split(',')[1].trim() : slice.color
    return acc + (idx > 0 ? ', ' : '') + `${color} ${prev}% ${end}%`
  }, '')

  return (
    <div className="oa-panel">
      <div className="oa-panel-header">Technique tiers</div>
      <div className="oa-tier-container">
        <div className="oa-tier-pie" style={{ background: `conic-gradient(${gradient})` }}>
          <div className="oa-tier-pie-center">
            {techTiers.data[0]?.tier}
            <span className="oa-tier-pie-sub">top tier</span>
          </div>
        </div>
        <div className="oa-tier-legend">
          {techTiers.data.map(slice => {
            const color = slice.color.startsWith('linear-gradient') ? slice.color.split(',')[1].trim() : slice.color
            return (
              <div key={slice.tier} className="oa-tier-legend-row">
                <div className="oa-tier-dot" style={{ background: color }} />
                <span className="oa-tier-label">Tier {slice.tier}</span>
                <span className="oa-tier-pct">{slice.pct}%</span>
              </div>
            )
          })}
        </div>
      </div>
      {techTiers.dfRatio >= 30 && (
        <div className="oa-tier-warning">
          ⚠ {techTiers.dfRatio}% low-quality technique time (D/E/F)
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add TechTierBreakdown CSS**

```css
/* ── TechTierBreakdown ── */
.oa-tier-container {
  display: flex;
  gap: 16px;
  align-items: center;
}

.oa-tier-pie {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.oa-tier-pie-center {
  width: 52px;
  height: 52px;
  background: var(--card-bg, #161b22);
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-dark, #e6edf3);
  line-height: 1;
}

.oa-tier-pie-sub {
  font-size: 7px;
  color: var(--text-muted, #7d8590);
  font-family: inherit;
}

.oa-tier-legend {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.oa-tier-legend-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.oa-tier-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
}

.oa-tier-label {
  flex: 1;
  color: var(--text-dark, #e6edf3);
}

.oa-tier-pct {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-muted, #7d8590);
}

.oa-tier-warning {
  margin-top: 10px;
  font-size: 11px;
  color: var(--danger, #f85149);
  background: rgba(248, 81, 73, 0.08);
  border-radius: 4px;
  padding: 6px 8px;
}
```

- [ ] **Step 3: TypeScript check + commit**

```bash
npx tsc --noEmit
git add src/pages/ObsidianAnalytics.tsx src/pages/ObsidianAnalytics.css
git commit -m "feat(analytics): add TechTierBreakdown panel with pie chart and D/E/F warning"
```

---

## Task 8: FocusTypeSplit panel + CSS

**Files:**
- Modify: `src/pages/ObsidianAnalytics.tsx`
- Modify: `src/pages/ObsidianAnalytics.css`

- [ ] **Step 1: Add FocusTypeSplit component**

```tsx
function FocusTypeSplit({ derived }: { derived: DerivedAnalytics }) {
  const { focusBreakdown } = derived
  const total = focusBreakdown.comprendre + focusBreakdown.memoriser + focusBreakdown.faire

  if (total === 0) {
    return (
      <div className="oa-panel">
        <div className="oa-panel-header">Focus type split</div>
        <div className="oa-empty">No categorised techniques yet</div>
      </div>
    )
  }

  const rows: { key: keyof FocusBreakdown; label: string }[] = [
    { key: 'comprendre', label: 'Savoir Comprendre' },
    { key: 'memoriser',  label: 'Savoir Mémoriser' },
    { key: 'faire',      label: 'Savoir Faire' },
  ]

  return (
    <div className="oa-panel">
      <div className="oa-panel-header">Focus type split</div>
      <div className="oa-focus-list">
        {rows.map(({ key, label }) => {
          const mins = focusBreakdown[key]
          const pct = total > 0 ? Math.round((mins / total) * 100) : 0
          return (
            <div key={key} className="oa-focus-row">
              <div className="oa-focus-label-row">
                <span className="oa-focus-name" style={{ color: ANALYTICS_CATEGORY_COLORS[key] }}>{label}</span>
                <span className="oa-focus-time">{formatTime(mins)} · {pct}%</span>
              </div>
              <div className="oa-focus-bar-track">
                <div
                  className="oa-focus-bar"
                  style={{ width: `${pct}%`, background: ANALYTICS_CATEGORY_COLORS[key] }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

Note: `ANALYTICS_CATEGORY_COLORS` is imported from `../lib/analytics-utils` (added in Task 2).

- [ ] **Step 2: Add FocusTypeSplit CSS**

```css
/* ── FocusTypeSplit ── */
.oa-focus-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.oa-focus-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.oa-focus-label-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.oa-focus-name {
  font-size: 12px;
  font-weight: 600;
}

.oa-focus-time {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-muted, #7d8590);
}

.oa-focus-bar-track {
  height: 6px;
  background: var(--surface-raised, #21262d);
  border-radius: 3px;
  overflow: hidden;
}

.oa-focus-bar {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}
```

- [ ] **Step 3: Add `FocusBreakdown` to imports**

In the import from `../lib/analytics-utils`, ensure `FocusBreakdown` is imported (it should already be there from Task 3, but verify).

- [ ] **Step 4: TypeScript check + commit**

```bash
npx tsc --noEmit
git add src/pages/ObsidianAnalytics.tsx src/pages/ObsidianAnalytics.css
git commit -m "feat(analytics): add FocusTypeSplit panel with sky/rose/emerald category colors"
```

---

## Task 9: CalibrationPanel + TagBreakdown panels + CSS

**Files:**
- Modify: `src/pages/ObsidianAnalytics.tsx`
- Modify: `src/pages/ObsidianAnalytics.css`

- [ ] **Step 1: Add CalibrationPanel component**

```tsx
function CalibrationPanel({ derived }: { derived: DerivedAnalytics }) {
  const { calibration } = derived
  return (
    <div className="oa-panel">
      <div className="oa-panel-header">Calibration</div>
      {!calibration ? (
        <div className="oa-empty">No ratings yet</div>
      ) : (
        <div className="oa-calibration-stats">
          <div className="oa-cal-stat">
            <span className="oa-cal-value">{calibration.goodPct}%</span>
            <span className="oa-cal-label">Post-session good/easy</span>
          </div>
          {calibration.avgGap !== null && (
            <div className="oa-cal-stat">
              <span className={`oa-cal-value ${calibration.avgGap > 0.1 ? 'oa-cal-positive' : calibration.avgGap < -0.1 ? 'oa-cal-negative' : 'oa-cal-neutral'}`}>
                {calibration.avgGap > 0 ? '+' : ''}{Math.round(calibration.avgGap * 100)}%
              </span>
              <span className="oa-cal-label">Pre→post recall gap</span>
            </div>
          )}
          <div className="oa-cal-stat">
            <span className="oa-cal-value">{calibration.totalCount}</span>
            <span className="oa-cal-label">Total ratings</span>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add TagBreakdown component**

```tsx
function TagBreakdown({ derived }: { derived: DerivedAnalytics }) {
  const { tags } = derived
  return (
    <div className="oa-panel">
      <div className="oa-panel-header">By tag</div>
      {tags.data.length === 0 ? (
        <div className="oa-empty">No tagged subjects yet</div>
      ) : (
        <div className="oa-tag-list">
          {tags.data.map(row => (
            <div key={row.tag} className="oa-tag-row">
              <span className="oa-tag-label">{row.tag}</span>
              <div className="oa-subject-bar-track">
                <div
                  className="oa-subject-bar"
                  style={{ width: `${Math.round((row.mins / tags.maxMins) * 100)}%` }}
                />
              </div>
              <span className="oa-subject-time">{formatTime(row.mins)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Add CSS for both panels**

```css
/* ── CalibrationPanel ── */
.oa-calibration-stats {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.oa-cal-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.oa-cal-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-dark, #e6edf3);
}

.oa-cal-positive { color: var(--success, #3fb950); }
.oa-cal-negative { color: var(--danger, #f85149); }
.oa-cal-neutral  { color: var(--text-muted, #7d8590); }

.oa-cal-label {
  font-size: 11px;
  color: var(--text-muted, #7d8590);
}

/* ── TagBreakdown ── */
.oa-tag-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.oa-tag-row {
  display: grid;
  grid-template-columns: 1fr 2fr auto;
  align-items: center;
  gap: 8px;
}

.oa-tag-label {
  font-size: 12px;
  color: var(--text-dark, #e6edf3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

- [ ] **Step 4: TypeScript check + commit**

```bash
npx tsc --noEmit
git add src/pages/ObsidianAnalytics.tsx src/pages/ObsidianAnalytics.css
git commit -m "feat(analytics): add CalibrationPanel and TagBreakdown panel components"
```

---

## Task 10: TimeOfDay panel + CSS (Narrative view only)

**Files:**
- Modify: `src/pages/ObsidianAnalytics.tsx`
- Modify: `src/pages/ObsidianAnalytics.css`

- [ ] **Step 1: Add TimeOfDayPanel component**

```tsx
function TimeOfDayPanel({ derived }: { derived: DerivedAnalytics }) {
  const { timeOfDay } = derived
  const total = timeOfDay.morning + timeOfDay.afternoon + timeOfDay.evening + timeOfDay.night
  const bars: { key: keyof TimeOfDay; label: string; emoji: string }[] = [
    { key: 'morning',   label: 'Morning',   emoji: '🌅' },
    { key: 'afternoon', label: 'Afternoon', emoji: '☀️' },
    { key: 'evening',   label: 'Evening',   emoji: '🌆' },
    { key: 'night',     label: 'Night',     emoji: '🌙' },
  ]
  const max = Math.max(...bars.map(b => timeOfDay[b.key]), 1)

  return (
    <div className="oa-panel">
      <div className="oa-panel-header">Study pattern</div>
      {total === 0 ? (
        <div className="oa-empty">No session data yet</div>
      ) : (
        <div className="oa-tod-bars">
          {bars.map(({ key, label, emoji }) => {
            const mins = timeOfDay[key]
            const heightPct = Math.round((mins / max) * 100)
            return (
              <div key={key} className="oa-tod-col">
                <div className="oa-tod-bar-track">
                  <div className="oa-tod-bar" style={{ height: `${heightPct}%` }} />
                </div>
                <div className="oa-tod-label">
                  <span>{emoji}</span>
                  <span>{label}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add TimeOfDay import**

Ensure `TimeOfDay` type is in the import from `../lib/analytics-utils` (should be already, verify).

- [ ] **Step 3: Add TimeOfDayPanel CSS**

```css
/* ── TimeOfDayPanel ── */
.oa-tod-bars {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  height: 80px;
}

.oa-tod-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  height: 100%;
}

.oa-tod-bar-track {
  flex: 1;
  width: 100%;
  background: var(--surface-raised, #21262d);
  border-radius: 4px;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
}

.oa-tod-bar {
  width: 100%;
  background: var(--primary, #58a6ff);
  border-radius: 4px 4px 0 0;
  opacity: 0.7;
  transition: height 0.3s ease;
  min-height: 2px;
}

.oa-tod-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  font-size: 9px;
  color: var(--text-muted, #7d8590);
  text-align: center;
}
```

- [ ] **Step 4: TypeScript check + commit**

```bash
npx tsc --noEmit
git add src/pages/ObsidianAnalytics.tsx src/pages/ObsidianAnalytics.css
git commit -m "feat(analytics): add TimeOfDayPanel component (morning/afternoon/evening/night)"
```

---

## Task 11: Assemble CommandView

**Files:**
- Modify: `src/pages/ObsidianAnalytics.tsx`

- [ ] **Step 1: Replace CommandView stub with full layout**

Find the `function CommandView` stub and replace it entirely:

```tsx
function CommandView({
  derived,
  timelineFilter,
  onTimelineChange,
}: {
  derived: DerivedAnalytics
  timelineFilter: number
  onTimelineChange: (v: number) => void
}) {
  return (
    <div className="oa-command-view">
      <StatStrip derived={derived} />
      <ActivityTimeline derived={derived} timelineFilter={timelineFilter} onTimelineChange={onTimelineChange} tall />
      <div className="oa-two-col">
        <SubjectBalance derived={derived} sessions={derived.sessions} />
        <DeadlineUrgency derived={derived} />
      </div>
      <div className="oa-two-col">
        <TechTierBreakdown derived={derived} />
        <FocusTypeSplit derived={derived} />
      </div>
      <div className="oa-two-col">
        <CalibrationPanel derived={derived} />
        <TagBreakdown derived={derived} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add CommandView CSS**

```css
/* ── CommandView ── */
.oa-command-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/ObsidianAnalytics.tsx src/pages/ObsidianAnalytics.css
git commit -m "feat(analytics): assemble CommandView layout"
```

---

## Task 12: Assemble NarrativeView

**Files:**
- Modify: `src/pages/ObsidianAnalytics.tsx`
- Modify: `src/pages/ObsidianAnalytics.css`

- [ ] **Step 1: Replace NarrativeView stub**

```tsx
function NarrativeView({
  derived,
  timelineFilter,
  onTimelineChange,
}: {
  derived: DerivedAnalytics
  timelineFilter: number
  onTimelineChange: (v: number) => void
}) {
  return (
    <div className="oa-narrative-view">
      {/* Section 1: Your week */}
      <div className="oa-narrative-section">
        <div className="oa-narrative-question">How did your week go?</div>
        <div className="oa-narrative-week">
          <div className="oa-narrative-big-numbers">
            <div className="oa-narrative-hero">
              <span className="oa-narrative-hero-value">{formatTime(derived.weekly.minutes)}</span>
              <span className="oa-narrative-hero-label">Focus time</span>
              {derived.trend.weekMinutesDelta !== null && (
                <span className={`oa-trend-badge ${derived.trend.weekMinutesDelta >= 0 ? 'oa-trend-up' : 'oa-trend-down'}`}>
                  {derived.trend.weekMinutesDelta >= 0 ? '▲' : '▼'}{Math.abs(derived.trend.weekMinutesDelta)}% vs last week
                </span>
              )}
            </div>
            <div className="oa-narrative-hero">
              <span className="oa-narrative-hero-value">{derived.streaks.current} <span className="oa-stat-suffix">days</span></span>
              <span className="oa-narrative-hero-label">Current streak</span>
            </div>
          </div>
          <TimeOfDayPanel derived={derived} />
        </div>
      </div>

      {/* Section 2: Your subjects */}
      <div className="oa-narrative-section">
        <div className="oa-narrative-question">What are you working on?</div>
        <SubjectBalance derived={derived} sessions={derived.sessions} />
        {derived.deadlineRows.length > 0 && <DeadlineUrgency derived={derived} />}
      </div>

      {/* Section 3: Your methods */}
      <div className="oa-narrative-section">
        <div className="oa-narrative-question">How well are you studying?</div>
        <div className="oa-two-col">
          <TechTierBreakdown derived={derived} />
          <FocusTypeSplit derived={derived} />
        </div>
        <CalibrationPanel derived={derived} />
      </div>

      {/* Section 4: Your pattern */}
      <div className="oa-narrative-section">
        <div className="oa-narrative-question">What does your pattern look like?</div>
        <ActivityTimeline derived={derived} timelineFilter={timelineFilter} onTimelineChange={onTimelineChange} tall />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add NarrativeView CSS**

```css
/* ── NarrativeView ── */
.oa-narrative-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 16px;
}

.oa-narrative-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.oa-narrative-question {
  font-size: 14px;
  font-weight: 700;
  color: var(--primary, #58a6ff);
  letter-spacing: 0.01em;
}

.oa-narrative-week {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.oa-narrative-big-numbers {
  display: flex;
  gap: 12px;
}

.oa-narrative-hero {
  flex: 1;
  background: var(--card-bg, #161b22);
  border: 1px solid var(--border-color, #30363d);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.oa-narrative-hero-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 28px;
  font-weight: 700;
  color: var(--text-dark, #e6edf3);
  line-height: 1;
}

.oa-narrative-hero-label {
  font-size: 12px;
  color: var(--text-muted, #7d8590);
}
```

- [ ] **Step 3: TypeScript check + commit**

```bash
npx tsc --noEmit
git add src/pages/ObsidianAnalytics.tsx src/pages/ObsidianAnalytics.css
git commit -m "feat(analytics): assemble NarrativeView with four story sections"
```

---

## Task 13: Assemble MinimalView + remove placeholder CSS + final test pass

**Files:**
- Modify: `src/pages/ObsidianAnalytics.tsx`
- Modify: `src/pages/ObsidianAnalytics.css`

- [ ] **Step 1: Replace MinimalView stub**

```tsx
function MinimalView({
  derived,
  timelineFilter,
  onTimelineChange,
}: {
  derived: DerivedAnalytics
  timelineFilter: number
  onTimelineChange: (v: number) => void
}) {
  return (
    <div className="oa-minimal-view">
      <div className="oa-minimal-numbers">
        <div className="oa-minimal-hero">
          <span className="oa-narrative-hero-value">{formatTime(derived.weekly.minutes)}</span>
          <span className="oa-narrative-hero-label">This week</span>
        </div>
        <div className="oa-minimal-hero">
          <span className="oa-narrative-hero-value">{derived.streaks.current} <span className="oa-stat-suffix">days</span></span>
          <span className="oa-narrative-hero-label">Streak</span>
        </div>
        <div className="oa-minimal-hero">
          <span className="oa-narrative-hero-value">{formatTime(derived.avgSession)}</span>
          <span className="oa-narrative-hero-label">Avg session</span>
        </div>
      </div>
      <ActivityTimeline derived={derived} timelineFilter={timelineFilter} onTimelineChange={onTimelineChange} tall />
      <div className="oa-two-col">
        <SubjectBalance derived={derived} sessions={derived.sessions} />
        <TechTierBreakdown derived={derived} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add MinimalView CSS + remove placeholder rule**

Remove the `.oa-view-placeholder` rule from `ObsidianAnalytics.css`.

Append:

```css
/* ── MinimalView ── */
.oa-minimal-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.oa-minimal-numbers {
  display: flex;
  gap: 12px;
}

.oa-minimal-hero {
  flex: 1;
  background: var(--card-bg, #161b22);
  border: 1px solid var(--border-color, #30363d);
  border-radius: 8px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
```

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass (no regressions)

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Final commit**

```bash
git add src/pages/ObsidianAnalytics.tsx src/pages/ObsidianAnalytics.css
git commit -m "feat(analytics): assemble MinimalView, complete Obsidian Analytics rework"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| Early-return in Analytics.tsx | Task 3 |
| analytics-utils.ts pure functions | Task 1 |
| ANALYTICS_CATEGORY_COLORS shared | Task 1, 2 |
| View switcher with tooltips | Task 3 |
| View persisted in localStorage | Task 3 |
| StatStrip (4 pills) | Task 4 |
| ActivityTimeline (taller, period filter) | Task 4 |
| SubjectBalance (bars, period filter, hyperfocus) | Task 5 |
| DeadlineUrgency (traffic lights, sorted, hidden if empty) | Task 6 |
| TechTierBreakdown (pie, legend, warning) | Task 7 |
| FocusTypeSplit (3 bars, sky/rose/emerald) | Task 8 |
| CalibrationPanel | Task 9 |
| TagBreakdown | Task 9 |
| TimeOfDay (Narrative only) | Task 10 |
| CommandView layout | Task 11 |
| NarrativeView layout | Task 12 |
| MinimalView layout | Task 13 |
| Two-column grid (1fr 1fr) for vertical monitor | Tasks 11–13 CSS |
| CalendarPanel removed | Analytics.tsx not rendering it |
| 3-panel stat wall removed | Not present in any view |
| All tests (analytics-utils) | Task 1 |
| No regressions | Task 13 step 3 |

**No placeholders found.** All steps contain complete code.

**Type consistency:** `DerivedAnalytics` interface defined in Task 3 and all panels receive `derived: DerivedAnalytics` — consistent throughout. `ANALYTICS_CATEGORY_COLORS` imported from `analytics-utils` in Tasks 8 and 2. `computeSubjectBreakdown` signature `(blocks, subjects, sessions, periodStart?)` consistent across Task 1 test helpers and Task 5 SubjectBalance component.
