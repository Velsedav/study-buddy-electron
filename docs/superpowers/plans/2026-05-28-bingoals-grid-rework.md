# Bingoals Grid Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Bingo grid cards surface progress counts, stored links, and memory thumbnails at a glance — removing the 2+ click barrier to action and recording.

**Architecture:** Add `listDashboardMediaSummaries` to `db.ts` to fetch links and last image per objective; wire it into `BingoDashboard.load()`; update `DashboardCard` to replace the `cardMeta` date row with a progress-count + status-dot line, add a link chip at rest, and enrich the hover panel with thumbnail + all links. CSS additions for new classes.

**Tech Stack:** React 19, TypeScript, CSS custom properties, SQLite (via Electron IPC). Vitest for unit tests.

---

## File Map

| File | Change |
|------|--------|
| `src/lib/bingoals/progress.ts` | Add `progressLabel()` export |
| `src/lib/__tests__/bingoals-progress.test.ts` | Create: unit tests for `progressLabel` |
| `src/lib/bingoals/db.ts` | Add `ObjectiveMediaSummary` type + `listDashboardMediaSummaries()` |
| `src/pages/bingoals/BingoDashboard.tsx` | Load media summaries, update `DashboardCard` props + rendering |
| `src/styles/bingoals.css` | Add CSS for new card elements |

---

## Task 1: `progressLabel` pure function + tests

**Files:**
- Modify: `src/lib/bingoals/progress.ts`
- Create: `src/lib/__tests__/bingoals-progress.test.ts`

The function derives a human-readable progress string from existing `Cell` data — no new DB calls.

- [ ] **Step 1: Write failing tests**

Create `src/lib/__tests__/bingoals-progress.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd /home/html5ishard/.gemini/antigravity/scratch/study-buddy-electron
npx vitest run src/lib/__tests__/bingoals-progress.test.ts
```

Expected: `progressLabel` not found.

- [ ] **Step 3: Implement `progressLabel` in `progress.ts`**

Open `src/lib/bingoals/progress.ts` (currently 26 lines — has `computeObjectivePercent`). Append after the last line:

```ts
export function progressLabel(
  percent: number | null,
  goalKind: string,
  goalTarget: number | null,
  goalUnit: string | null
): string {
  if (percent === null) return '—'
  if (goalKind === 'manual' || !goalTarget) {
    return `${Math.round(percent * 100)}%`
  }
  const done = Math.round(percent * goalTarget)
  const unit = goalUnit ? ` ${goalUnit}` : ''
  return `${done} / ${goalTarget}${unit}`
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/lib/__tests__/bingoals-progress.test.ts
```

Expected: 8 passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/bingoals/progress.ts src/lib/__tests__/bingoals-progress.test.ts
git commit -m "feat(bingoals): add progressLabel helper with tests"
```

---

## Task 2: `listDashboardMediaSummaries` DB function

**Files:**
- Modify: `src/lib/bingoals/db.ts`

Fetches links and last memory image for a batch of objectives. No tests (DB functions go through Electron IPC — not unit-testable).

- [ ] **Step 1: Add type and function to `db.ts`**

Open `src/lib/bingoals/db.ts`. Add after the `deleteAllBingoData` / `importBingoBackupFrom` functions at the end of the file:

```ts
export type ObjectiveMediaSummary = {
  objectiveId: string
  links: Array<{ url: string; label: string }>
  lastImageDataUrl: string | null
}

export async function listDashboardMediaSummaries(
  objectiveIds: string[]
): Promise<ObjectiveMediaSummary[]> {
  if (objectiveIds.length === 0) return []
  const db = await getBingoDb()
  const rows = await db.select<{ objective_id: string; kind: string; data: string; created_at: number }[]>(
    `SELECT so.objective_id, mi.kind, mi.data, mi.created_at
     FROM subobjectives so
     JOIN media_items mi ON mi.subobjective_id = so.id
     WHERE so.objective_id IN (${objectiveIds.map(() => '?').join(',')})
     AND mi.kind IN ('link', 'image')
     ORDER BY mi.created_at ASC`,
    objectiveIds
  )

  const map = new Map<string, { links: Array<{ url: string; label: string }>; lastImageDataUrl: string | null }>()
  for (const id of objectiveIds) map.set(id, { links: [], lastImageDataUrl: null })

  for (const r of rows) {
    const entry = map.get(r.objective_id)
    if (!entry) continue
    if (r.kind === 'link') {
      const parsed = (() => { try { return JSON.parse(r.data) } catch { return { url: r.data, label: '' } } })()
      entry.links.push({ url: String(parsed.url ?? r.data), label: String(parsed.label ?? '') })
    } else {
      // images are ordered ASC so last one wins
      entry.lastImageDataUrl = r.data
    }
  }

  return objectiveIds.map(id => {
    const entry = map.get(id)!
    return { objectiveId: id, links: entry.links, lastImageDataUrl: entry.lastImageDataUrl }
  })
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/bingoals/db.ts
git commit -m "feat(bingoals): add listDashboardMediaSummaries DB function"
```

---

## Task 3: Wire media loading into `BingoDashboard`

**Files:**
- Modify: `src/pages/bingoals/BingoDashboard.tsx`

Add `openExternal`, import new types/functions, load media summaries in `load()`, pass to `DashboardCard`.

- [ ] **Step 1: Update imports at top of `BingoDashboard.tsx`**

Current lucide import line (line 2):
```ts
import { Target, Pencil, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
```

Replace with:
```ts
import { Target, Pencil, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
```

Current db import (lines 5–12):
```ts
import type { DashboardRow, Objective, Subobjective } from "../../lib/bingoals/db";
import {
  createObjectiveAndAssignSlot,
  ensureYearSlots,
  getBingoDb,
  listDashboardRows,
  updateObjective
} from "../../lib/bingoals/db";
```

Replace with:
```ts
import type { DashboardRow, Objective, ObjectiveMediaSummary, Subobjective } from "../../lib/bingoals/db";
import {
  createObjectiveAndAssignSlot,
  ensureYearSlots,
  getBingoDb,
  listDashboardMediaSummaries,
  listDashboardRows,
  updateObjective
} from "../../lib/bingoals/db";
```

Add `progressLabel` import after the existing `format` import (line 13):
```ts
import { daysAgo, formatDuration } from "../../lib/bingoals/format";
import { progressLabel } from "../../lib/bingoals/progress";
```

Add `openExternal` constant after the imports, before the `type Cell` definition:
```ts
const openExternal = (url: string) => (window as any).electronAPI.shell.openExternal(url)
```

- [ ] **Step 2: Add `mediaMap` state to `BingoDashboard`**

Inside `BingoDashboard()`, after the existing `useState` calls (after `const [editObj, setEditObj] = useState<Objective | null>(null)`), add:

```ts
const [mediaMap, setMediaMap] = useState<Map<string, ObjectiveMediaSummary>>(new Map())
```

- [ ] **Step 3: Update `load()` to fetch media**

Current `load()` ends with:
```ts
    DASH_CACHE[year] = out;
    setCells(out);
  }
```

Replace those last two lines with:
```ts
    DASH_CACHE[year] = out
    setCells(out)

    const mediaSummaries = await listDashboardMediaSummaries(objectiveIds)
    const newMediaMap = new Map<string, ObjectiveMediaSummary>()
    for (const s of mediaSummaries) newMediaMap.set(s.objectiveId, s)
    setMediaMap(newMediaMap)
  }
```

- [ ] **Step 4: Pass `mediaSummary` to `DashboardCard`**

In the `viewCells.map(...)` JSX block, find the `<DashboardCard` render:
```tsx
            return (
              <DashboardCard
                key={c.slot_index}
                c={c}
                nav={nav}
                setEditObj={setEditObj}
                load={load}
                t={t}
              />
            );
```

Replace with:
```tsx
            return (
              <DashboardCard
                key={c.slot_index}
                c={c}
                nav={nav}
                setEditObj={setEditObj}
                load={load}
                t={t}
                mediaSummary={c.objective_id ? mediaMap.get(c.objective_id) : undefined}
              />
            );
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: errors about `DashboardCard` not accepting `mediaSummary` prop (Task 4 will fix) and `progressLabel`/`ExternalLink` unused. That's fine — these will be used in Task 4.

- [ ] **Step 6: Commit**

```bash
git add src/pages/bingoals/BingoDashboard.tsx
git commit -m "feat(bingoals): wire media summary loading into dashboard"
```

---

## Task 4: Update `DashboardCard` rendering

**Files:**
- Modify: `src/pages/bingoals/BingoDashboard.tsx` (the `DashboardCard` component at line 411)

Replace `cardMeta` with progress count + status dot line. Add first link chip at rest. Enrich hover panel with thumbnail and all links.

- [ ] **Step 1: Update `DashboardCard` props signature**

Find the `DashboardCard` memo function signature (around line 411):
```ts
const DashboardCard = memo(function DashboardCard({
  c, nav, setEditObj, load, t
}: {
  c: Cell;
  nav: (path: string) => void;
  setEditObj: (o: Objective) => void;
  load: () => Promise<void>;
  t: (key: string) => string;
}) {
```

Replace with:
```ts
const DashboardCard = memo(function DashboardCard({
  c, nav, setEditObj, load, t, mediaSummary
}: {
  c: Cell;
  nav: (path: string) => void;
  setEditObj: (o: Objective) => void;
  load: () => Promise<void>;
  t: (key: string) => string;
  mediaSummary: ObjectiveMediaSummary | undefined;
}) {
```

- [ ] **Step 2: Add derived values inside `DashboardCard`**

After the existing `const cover = c.objective!.cover_data` line, add:

```ts
  const firstLink = mediaSummary?.links[0] ?? null
  const label = progressLabel(c.percent, c.objective!.goal_kind, c.objective!.goal_target ?? null, c.objective!.goal_unit ?? null)
```

- [ ] **Step 3: Replace `cardMeta` JSX with `cardProgressLine`**

Find and remove this entire block in the `DashboardCard` JSX:
```tsx
        <div className="cardMeta">
          <div>
            <span className="muted">{t('bingoals.last_label')}:</span>{" "}
            <span className={`lastAge ${status}`} title={statusTitle(status)}>{lastLabel(d)}</span>
          </div>
          <div><span className="muted">{t('bingoals.time_label')}:</span> {formatDuration(c.total_ms)}</div>
        </div>
```

Replace with:
```tsx
        <div className="cardProgressLine">
          <span className={`cardStatusDot cardStatusDot--${status}`} />
          <span className="cardProgressCount">{label}</span>
          <span className="cardTimeBadge">· {formatDuration(c.total_ms)}</span>
        </div>
        {firstLink && (
          <button
            className="cardLinkChip"
            onClick={(e) => { e.stopPropagation(); openExternal(firstLink.url); }}
            title={firstLink.url}
          >
            <ExternalLink size={10} />
            <span>{firstLink.label || firstLink.url}</span>
          </button>
        )}
```

- [ ] **Step 4: Replace `hoverProgress` JSX content**

Find the existing `hoverProgress` div:
```tsx
        <div className="hoverProgress">
          <div className="hoverRow">
            <div className="muted">{t('bingoals.progress_label')}</div>
            <div className="pill">{percentText}</div>
          </div>
        </div>
```

Replace with:
```tsx
        <div className="hoverProgress">
          {mediaSummary?.lastImageDataUrl && (
            <img className="hoverThumb" src={mediaSummary.lastImageDataUrl} alt="" />
          )}
          {mediaSummary && mediaSummary.links.length > 0 && (
            <div className="hoverLinks">
              {mediaSummary.links.map((link, i) => (
                <button
                  key={i}
                  className="hoverLinkChip"
                  onClick={(e) => { e.stopPropagation(); openExternal(link.url); }}
                  title={link.url}
                >
                  <ExternalLink size={10} />
                  <span>{link.label || link.url}</span>
                </button>
              ))}
            </div>
          )}
          <div className="hoverProgressLine">
            <span className={`cardStatusDot cardStatusDot--${status}`} />
            <span>{label}</span>
            <span className="cardTimeBadge">· {formatDuration(c.total_ms)}</span>
          </div>
        </div>
```

- [ ] **Step 5: Remove now-unused variables**

Inside `DashboardCard`, remove these lines that are no longer used:
- `const percentText = c.percent === null ? "—" : ...` (was used by the old `pill`)
- `function lastLabel(days: number | null) { ... }` (was used by `cardMeta`)

Also remove the `statusTitle` function at the top of the file (lines 31–36) — it was only used in the old `<span title={statusTitle(status)}>`.

- [ ] **Step 6: Update memo comparator**

Find the memo comparator at the bottom of `DashboardCard` (the second argument to `memo()`):
```ts
}, (prev, next) => {
  return prev.c.objective?.updated_at === next.c.objective?.updated_at &&
    prev.c.percent === next.c.percent &&
    prev.c.total_ms === next.c.total_ms &&
    prev.c.last_progress_at === next.c.last_progress_at &&
    prev.c.objective?.pin_bottom === next.c.objective?.pin_bottom &&
    prev.c.objective?.frequency_days === next.c.objective?.frequency_days &&
    prev.c.objective_id === next.c.objective_id &&
    prev.c.slot_index === next.c.slot_index;
});
```

Replace with:
```ts
}, (prev, next) => {
  return prev.c.objective?.updated_at === next.c.objective?.updated_at &&
    prev.c.percent === next.c.percent &&
    prev.c.total_ms === next.c.total_ms &&
    prev.c.last_progress_at === next.c.last_progress_at &&
    prev.c.objective?.pin_bottom === next.c.objective?.pin_bottom &&
    prev.c.objective?.frequency_days === next.c.objective?.frequency_days &&
    prev.c.objective_id === next.c.objective_id &&
    prev.c.slot_index === next.c.slot_index &&
    prev.mediaSummary === next.mediaSummary;
});
```

- [ ] **Step 7: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 8: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass (including the 8 new `progressLabel` tests from Task 1).

- [ ] **Step 9: Commit**

```bash
git add src/pages/bingoals/BingoDashboard.tsx
git commit -m "feat(bingoals): update DashboardCard with progress line, link chips, hover thumbnail"
```

---

## Task 5: CSS for new card elements

**Files:**
- Modify: `src/styles/bingoals.css`

Add CSS for `.cardProgressLine`, `.cardStatusDot`, `.cardLinkChip`, `.hoverThumb`, `.hoverLinks`, `.hoverLinkChip`, `.hoverProgressLine`. Update the z-index group rule to include new classes.

- [ ] **Step 1: Update the z-index group rule**

Find (around line 451):
```css
.bingoals-root .cardTitle,
.bingoals-root .cardMeta,
.bingoals-root .cardProgressBar,
.bingoals-root .hoverProgress {
  position: relative;
  z-index: 2;
}
```

Replace with:
```css
.bingoals-root .cardTitle,
.bingoals-root .cardProgressLine,
.bingoals-root .cardLinkChip,
.bingoals-root .cardProgressBar,
.bingoals-root .hoverProgress {
  position: relative;
  z-index: 2;
}
```

- [ ] **Step 2: Remove the old `cardMeta` rule**

Find and delete this block (around line 481):
```css
.bingoals-root .cardMeta {
  display: grid;
  gap: 6px;
  font-size: 12px;
  opacity: .9;
}
```

- [ ] **Step 3: Add new card element CSS**

After the `hoverRow` rule (around line 518, after `.bingoals-root .hoverRow { ... }`), add:

```css
/* ── Card progress line (replaces cardMeta) ── */

.bingoals-root .cardProgressLine {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  opacity: .9;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.bingoals-root .cardProgressCount {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bingoals-root .cardTimeBadge {
  font-size: 11px;
  opacity: 0.7;
  white-space: nowrap;
}

/* ── Status dot ── */

.bingoals-root .cardStatusDot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.bingoals-root .cardStatusDot--green  { background: var(--success); }
.bingoals-root .cardStatusDot--orange { background: var(--accent); }
.bingoals-root .cardStatusDot--red    { background: var(--danger); }
.bingoals-root .cardStatusDot--neutral { background: transparent; }

/* ── At-rest link chip ── */

.bingoals-root .cardLinkChip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 20px;
  border: 1px solid var(--glass-border);
  background: rgba(var(--primary-rgb), 0.1);
  color: inherit;
  cursor: pointer;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
  transition: background 100ms;
}
.bingoals-root .cardLinkChip:hover {
  background: rgba(var(--primary-rgb), 0.22);
}
.bingoals-root .cardLinkChip span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Hover panel: thumbnail + links + progress ── */

.bingoals-root .hoverThumb {
  display: block;
  width: 100%;
  height: 72px;
  object-fit: cover;
  border-radius: 4px;
  margin-bottom: 6px;
}

.bingoals-root .hoverLinks {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 6px;
}

.bingoals-root .hoverLinkChip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 20px;
  border: 1px solid var(--glass-border);
  background: rgba(var(--primary-rgb), 0.1);
  color: inherit;
  cursor: pointer;
  max-width: 160px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: background 100ms;
}
.bingoals-root .hoverLinkChip:hover {
  background: rgba(var(--primary-rgb), 0.22);
}
.bingoals-root .hoverLinkChip span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bingoals-root .hoverProgressLine {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
}
```

- [ ] **Step 4: Add cover-card overrides for new elements**

Find the cover image overrides section (around line 1040, after `.bingoals-root .card--has-cover .pill { ... }`). Add after that block:

```css
.bingoals-root .card--has-cover .cardLinkChip,
.bingoals-root .card--has-cover .hoverLinkChip {
  border-color: rgba(255,255,255,0.3);
  background: rgba(255,255,255,0.15);
  color: #fff;
}
.bingoals-root .card--has-cover .cardLinkChip:hover,
.bingoals-root .card--has-cover .hoverLinkChip:hover {
  background: rgba(255,255,255,0.25);
}
```

- [ ] **Step 5: TypeScript check + full test suite**

```bash
npx tsc --noEmit 2>&1 | head -30 && npx vitest run
```

Expected: no errors, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/styles/bingoals.css
git commit -m "feat(bingoals): add CSS for grid card progress line, link chips, hover thumbnail"
```

---

## Manual Verification Checklist

After all tasks, launch the app and verify:

- [ ] **Progress count visible at rest:** Card shows e.g. "3 / 12 Films · 8h 9m" (not last-studied date)
- [ ] **Status dot correct:** Green/orange/red dot for objectives with `frequency_days` set; invisible dot for neutral
- [ ] **Link chip at rest:** Objectives with stored links show first link chip; click opens external without navigating to detail
- [ ] **No link chip for no-links objectives:** Cards without links show no chip
- [ ] **Hover: thumbnail appears:** Objectives with stored images show thumbnail at top of hover panel
- [ ] **Hover: all links appear:** All stored links shown as chips in hover panel; each opens external
- [ ] **Hover: progress line shown:** Progress count + time repeated in hover panel
- [ ] **Cover card text readable:** Link chips and status dot look correct on white-text cover cards
- [ ] **Card click still navigates:** Clicking card (not on chip) goes to objective detail page
- [ ] **Objectives with no media/no links:** Hover panel shows only progress line; no thumbnail or links section
