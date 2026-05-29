# Obsidian Analytics Rework — Design Spec

## Goal

Replace the default Analytics page with a purpose-built Obsidian variant that prioritises grounding (time/streak) and deadline awareness — designed for a user with ADHD, time blindness, and a CBT practice on a 1080×2560 vertical monitor.

## Architecture

**Pattern:** Same early-return as ObsidianPlanner. `Analytics.tsx` adds:
```tsx
if (theme === 'obsidian') return <ObsidianAnalytics />
```

**Files:**
- `src/pages/ObsidianAnalytics.tsx` — main component; loads data, owns view state, renders active view
- `src/pages/ObsidianAnalytics.css` — all `.oa-*` scoped styles
- `src/lib/analytics-utils.ts` — pure computation functions (no React, fully testable). Also exports `ANALYTICS_CATEGORY_COLORS: Record<TechCategory, string>` (sky/rose/emerald) so both ObsidianAnalytics and ObsidianPlanner can import from one place instead of duplicating.
- `src/lib/__tests__/analytics-utils.test.ts` — unit tests for all utils

**Data loaded once** at component mount, passed via props to whichever view is active. View choice persisted in `localStorage` key `obsidian-analytics-view`.

---

## View Switcher

Three pill buttons at the top (same pattern as ObsidianPlanner's Timeline/Split/Wizard).

| View | `title` tooltip |
|------|----------------|
| **Command** | "Everything at once — grounding stats, deadline radar, full breakdown" |
| **Narrative** | "Story top to bottom — each section answers one question" |
| **Minimal** | "Just what matters — time, streak, subjects, techniques" |

View type: `'command' | 'narrative' | 'minimal'`

---

## Shared Data & Computations (`analytics-utils.ts`)

All functions are pure (accept raw data, return derived values). No DB calls inside.

### `computeStreaks(sessions)`
Returns `{ current: number, best: number }`. Counts consecutive calendar days with at least one session with `actual_minutes > 0`. If last session date is more than 1 day ago, current streak = 0.

### `computeWeeklyStats(sessions, weekStart)`
Returns `{ minutes, count, activeDays }` for the current week (Mon or Sun start per setting).

### `computeSubjectBreakdown(blocks, subjects, periodStart?)`
Returns `SubjectRow[]` sorted by minutes desc:
```ts
interface SubjectRow {
  subjectId: string
  name: string
  minutes: number
  pct: number          // share of total
  isHyperfocus: boolean // pct > 50
}
```
`periodStart` optional; if omitted, uses all-time.

### `computeDeadlineUrgency(subjects, blocks)`
Returns `DeadlineRow[]` for subjects that have a deadline set, sorted by urgency:
```ts
interface DeadlineRow {
  subjectId: string
  name: string
  deadline: string       // ISO date
  daysRemaining: number
  hoursStudied: number   // all-time
  urgency: 'red' | 'amber' | 'green'
  // red: daysRemaining <= 7
  // amber: daysRemaining <= 30
  // green: daysRemaining > 30
}
```
Subjects with no deadline are excluded. If a deadline has already passed, `urgency = 'red'` and `daysRemaining` is negative.

### `computeFocusTypeBreakdown(blocks, techniques)`
Returns `{ comprendre: number, memoriser: number, faire: number }` in minutes, counting only WORK blocks with a technique_id whose `category` is set. Blocks with no technique or no category are excluded.

### `computeTechTierBreakdown(blocks, sessions, techniques)`
Returns existing pie data: `TierSlice[]` sorted by tier order, filtered to minutes > 0. Also returns `dfRatio` (D+E+F percentage).

### `computeTimeOfDay(sessions)`
Returns `{ morning: number, afternoon: number, evening: number, night: number }` in minutes.
- morning: 06:00–11:59
- afternoon: 12:00–17:59
- evening: 18:00–23:59
- night: 00:00–05:59

### `computeTimeline(sessions, filterMonths)`
Same logic as current `timelineData`: returns `{ data: DayBar[], maxMins, studiedDays, totalPeriodMinutes }`.

### `computeCalibration(getRatings)`
Same logic as current `calibrationData`. Returns `CalibrationResult | null`.

### `computeTagBreakdown(blocks, sessions, subjectTagsMap)`
Same logic as current tag breakdown. Returns `{ data: TagRow[], maxMins }`.

### `computeWeekTrend(sessions, weeklyStats, weekStart)`
Returns `{ weekMinutesDelta: number | null, weekCountDelta: number | null }` — percentage change vs prior week.

---

## Views

### View: Command

```
┌─────────────────────────────────────┐
│  [Command] [Narrative] [Minimal]    │  ← view switcher
├─────────────────────────────────────┤
│  stat strip (single row, 4 pills)   │  week time · sessions · streak · avg
├─────────────────────────────────────┤
│  activity timeline (full width)     │  period filter dropdown top-right
│  taller than current (~200px)       │
├──────────────────┬──────────────────┤
│ Subject balance  │ Deadline urgency │  two-column
│ (bars)           │ (traffic lights) │
├──────────────────┬──────────────────┤
│ Technique tiers  │ Focus type split │  two-column
│ (pie/bars)       │ (3 bars)         │
├──────────────────┬──────────────────┤
│ Calibration      │ Tag breakdown    │  two-column, compact
└──────────────────┴──────────────────┘
```

### View: Narrative

Four full-width section cards, each with a question header:

1. **"How did your week go?"** — streak (big) + week time (big) + trend badge + time-of-day mini bars (morning/afternoon/evening/night)
2. **"What are you working on?"** — subject balance bars (top 8) + deadline urgency list merged below
3. **"How well are you studying?"** — technique tier breakdown + focus type split (3 bars) + calibration stats
4. **"What does your pattern look like?"** — full-width activity timeline

### View: Minimal

```
┌─────────────────────────────────────┐
│  Three big numbers (inline)         │  week time · streak · avg session
├─────────────────────────────────────┤
│  activity timeline (dominant)       │
├──────────────────┬──────────────────┤
│ Subject balance  │ Technique tiers  │
└──────────────────┴──────────────────┘
```

No calibration, no tags, no deadline panel, no focus type.

---

## Panel Specs

### Stat Strip
Four inline pills, monospace values, muted labels:
- Week Focus Time (with trend badge vs last week)
- Sessions This Week
- Current Streak (days)
- Avg Session Length (all-time)

### Activity Timeline
Same bar chart logic as today. Taller (200px graph area). Period filter dropdown (same options). Tooltip on hover showing date + time. Today's bar accented.

### Subject Balance
Horizontal bars sorted desc by minutes. Shows top 10 subjects (or all if ≤10). Bar width = `pct` of total. Red left-border accent if `isHyperfocus`. Label: subject name left, time right. Header shows selected period (default: this month; dropdown for all-time / last 3m / last month).

### Deadline Urgency
Only appears if at least one subject has a deadline. Rows sorted by `urgency` (red first), then `daysRemaining` asc. Each row: traffic light dot + subject name + "X days" + hours studied. If no subjects have deadlines: panel hidden entirely (not shown as empty state).

### Focus Type Split
Three horizontal bars: Savoir Faire / Savoir Comprendre / Savoir Mémoriser. Uses `PICKER_CATEGORY_COLORS` (same sky/rose/emerald from the planner picker). Shows minutes + percentage. Empty state if no blocks have categorised techniques.

### Technique Tier Breakdown
Same conic-gradient pie as today. Legend with tier letter + minutes + pct. Warning if D+E+F > 30%.

### Time-of-Day (Narrative view only)
Four mini bars (morning/afternoon/evening/night) showing relative study time distribution. No absolute numbers — just proportional heights. Label below each bar.

### Calibration
Same three stats as today: good% / avg gap / total ratings. No change.

### Tag Breakdown
Same horizontal bar list as today, compressed (smaller padding).

---

## New vs Kept vs Removed

| Item | Status |
|------|--------|
| 3-panel weekly/monthly/total stat wall | **Removed** — replaced by compact stat strip |
| Calendar panel (`CalendarPanel` component) | **Removed** — not in any view |
| Activity timeline | **Kept** — promoted to more prominent position |
| Technique tier pie | **Kept** |
| Tag breakdown | **Kept** (Command + Narrative only) |
| Calibration | **Kept** (Command + Narrative only) |
| Streaks | **Kept** |
| Subject balance breakdown | **New** |
| Deadline urgency panel | **New** |
| Focus type split | **New** |
| Time-of-day pattern | **New** (Narrative only) |
| View switcher with tooltips | **New** |

---

## Vertical Monitor Layout Notes

All two-column grids use `grid-template-columns: 1fr 1fr` — equal halves of 1080px → ~540px each. Comfortable for vertical portrait. Single-column panels are full-width. No horizontal scrolling anywhere.

---

## Testing

`analytics-utils.test.ts` covers:
- `computeStreaks`: empty input, single session, consecutive days, gap resets streak, today-vs-yesterday edge case
- `computeSubjectBreakdown`: empty, single subject, hyperfocus threshold (>50%), period filter
- `computeDeadlineUrgency`: no deadline subjects excluded, urgency thresholds, past deadline = red + negative days
- `computeFocusTypeBreakdown`: blocks with no technique excluded, blocks with no category excluded
- `computeTimeOfDay`: boundary times (midnight, noon, 6am, 6pm)
- `computeWeekTrend`: zero previous week, both weeks have data
