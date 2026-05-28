# Bingoals Detail Page Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform `BingoObjectivePage` into a 3-breakpoint responsive launchpad — subobjective list with links visible, view toggle (compact/grid/full), and a focused timer panel per breakpoint.

**Architecture:** Extract `SubobjectivePanel` into `SubobjectiveTimerPanel` + `SubobjectiveMemories` + `SubobjectiveCompactRow` + `SubobjectiveTile`. Wire new `activeSubId` state: overlay on portrait (< 900px), 2-col on mid (900–1400px), 3-col on 4K (≥ 1400px). CSS handles all breakpoint switching — no JS `matchMedia`. New page-level state: `activeSubId`, `listView` (persisted to localStorage), `pendingAddLinkSubId`.

**Tech Stack:** React 19, TypeScript, Vitest, electron-vite, CSS custom properties (`--primary`, `--card-bg`, `--success`, `--danger`)

---

## File Map

| File | Change |
|---|---|
| `src/lib/bingoals/progress.ts` | Add `computeTotalMs`, `computeLastStudiedTs` exports |
| `src/lib/bingoals/color.ts` | Create — export `titleToHue` |
| `src/lib/__tests__/bingoals-detail-utils.test.ts` | Create — tests for above |
| `src/styles/bingoals.css` | Append new CSS classes (append after last line) |
| `src/pages/bingoals/BingoObjectivePage.tsx` | Major refactor — new components + page layout |

---

### Task 1: Pure utility functions + tests

**Files:**
- Modify: `src/lib/bingoals/progress.ts`
- Create: `src/lib/bingoals/color.ts`
- Create: `src/lib/__tests__/bingoals-detail-utils.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/bingoals-detail-utils.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests — expect failures**

```bash
npm test -- --reporter=verbose 2>&1 | grep -E "PASS|FAIL|✓|✗|computeTotalMs|computeLastStudiedTs|titleToHue"
```

Expected: FAIL — `computeTotalMs`, `computeLastStudiedTs`, `titleToHue` not found.

- [ ] **Step 3: Implement `computeTotalMs` and `computeLastStudiedTs`**

Append to `src/lib/bingoals/progress.ts` (after the `progressLabel` export):

```ts
export function computeTotalMs(
  timeMap: Map<string, { total_ms: number; last_end: number | null }>
): number {
  let total = 0
  for (const { total_ms } of timeMap.values()) total += total_ms
  return total
}

export function computeLastStudiedTs(
  timeMap: Map<string, { total_ms: number; last_end: number | null }>,
  subs: ReadonlyArray<{ updated_at: number }>
): number | null {
  let max: number | null = null
  for (const { last_end } of timeMap.values()) {
    if (last_end !== null && (max === null || last_end > max)) max = last_end
  }
  for (const s of subs) {
    if (max === null || s.updated_at > max) max = s.updated_at
  }
  return max
}
```

- [ ] **Step 4: Create `src/lib/bingoals/color.ts`**

```ts
export function titleToHue(title: string): number {
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = (hash << 5) - hash + title.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) % 360
}
```

- [ ] **Step 5: Run tests — expect all pass**

```bash
npm test -- --reporter=verbose 2>&1 | grep -E "PASS|FAIL|✓|✗|bingoals-detail"
```

Expected: all `bingoals-detail-utils` tests PASS. Total tests ≥ 126.

- [ ] **Step 6: Commit**

```bash
git add src/lib/bingoals/progress.ts src/lib/bingoals/color.ts src/lib/__tests__/bingoals-detail-utils.test.ts
git commit -m "feat(bingoals): add computeTotalMs, computeLastStudiedTs, titleToHue utilities"
```

---

### Task 2: New CSS classes

**Files:**
- Modify: `src/styles/bingoals.css` — append after last line (1973)

Note: all new rules are scoped under `.bingoals-root` for theme isolation.

- [ ] **Step 1: Append all new CSS**

Open `src/styles/bingoals.css` and append after the final line:

```css

/* ════════════════════════════════════════════════════════════════
   DETAIL PAGE (BingoObjectivePage) — layout, compact, grid, active
   ════════════════════════════════════════════════════════════════ */

/* ── Objective page header ── */

.bingoals-root .objPage-header { margin-bottom: 16px; }

.bingoals-root .objPage-headerTitleRow {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.bingoals-root .objPage-headerTitleText {
  flex: 1;
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bingoals-root .objPage-headerProgressRow {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
}

.bingoals-root .objPage-headerProgressLabel {
  font-size: 0.82rem;
  font-weight: 700;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.bingoals-root .objPage-headerBar {
  flex: 1;
  height: 3px;
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
  overflow: hidden;
}

.bingoals-root .objPage-headerBarFill {
  height: 100%;
  background: var(--primary);
  border-radius: 2px;
  transition: width 300ms ease;
}

.bingoals-root .objPage-headerMeta {
  font-size: 0.75rem;
  opacity: 0.5;
  display: flex;
  gap: 12px;
  margin-bottom: 10px;
}

.bingoals-root .objPage-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.bingoals-root .objPage-viewToggle { display: flex; gap: 2px; }

.bingoals-root .objPage-viewBtn {
  padding: 4px 10px;
  font-size: 0.72rem;
  font-weight: 600;
  border-radius: 4px;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.12);
  color: inherit;
  cursor: pointer;
  opacity: 0.45;
  transition: opacity 100ms ease, background 100ms ease;
}

.bingoals-root .objPage-viewBtn:hover { opacity: 0.85; }

.bingoals-root .objPage-viewBtn--active {
  background: rgba(255,255,255,0.1);
  border-color: rgba(255,255,255,0.25);
  opacity: 1;
}

/* ── Page layout grid ── */

.bingoals-root .objPage-layout {
  display: flex;
  flex-direction: column;
  position: relative;
  gap: 0;
}

.bingoals-root .objPage-listCol { min-width: 0; }

.bingoals-root .objPage-activeCol { display: none; }
.bingoals-root .objPage-memoriesCol { display: none; }

@media (min-width: 900px) {
  .bingoals-root .objPage-layout {
    flex-direction: row;
    align-items: flex-start;
    gap: 20px;
  }
  .bingoals-root .objPage-listCol { flex: 0 0 300px; min-width: 0; }
  .bingoals-root .objPage-activeCol { display: block; flex: 1; min-width: 0; }
}

@media (min-width: 1400px) {
  .bingoals-root .objPage-listCol { flex-basis: 320px; }
  .bingoals-root .objPage-activeCol { flex: 1; max-width: 600px; min-width: 0; }
  .bingoals-root .objPage-memoriesCol { display: block; flex: 1; min-width: 0; }
  /* At 4K memoriesCol takes over — hide inline memories in activeCol */
  .bingoals-root .objPage-activeCol .subTimerMemories { display: none; }
}

/* Larger timer in active col context */
@media (min-width: 900px) {
  .bingoals-root .objPage-activeCol .bingo-instrument-timer { font-size: 4rem; }
}
@media (min-width: 1400px) {
  .bingoals-root .objPage-activeCol .bingo-instrument-timer { font-size: 5rem; }
  .bingoals-root .objPage-activeCol .bingo-instrument-face { padding: 20px 16px 14px; }
}

/* ── Narrow overlay ── */

.bingoals-root .objPage-overlay {
  position: fixed;
  left: 0; right: 0; bottom: 0;
  height: 95dvh;
  background: var(--card-bg, rgba(20,20,35,0.97));
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -4px 40px rgba(0,0,0,0.45);
  transform: translateY(100%);
  transition: transform 300ms cubic-bezier(0.32, 0.72, 0, 1);
  z-index: 200;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.bingoals-root .objPage-overlay--open { transform: translateY(0); }

.bingoals-root .objPage-overlay-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px 12px 10px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  flex-shrink: 0;
}

.bingoals-root .objPage-overlay-title {
  flex: 1;
  font-weight: 700;
  font-size: 0.88rem;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bingoals-root .objPage-overlay-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  overscroll-behavior: contain;
}

/* Hide overlay on mid/wide — columns handle it */
@media (min-width: 900px) {
  .bingoals-root .objPage-overlay { display: none; }
}

/* Larger timer inside overlay */
.bingoals-root .objPage-overlay-body .bingo-instrument-timer { font-size: 5rem; }
.bingoals-root .objPage-overlay-body .bingo-instrument-face { padding: 20px 16px 14px; }

/* Slightly taller start/stop in active contexts */
.bingoals-root .objPage-activeCol .bingo-start-btn,
.bingoals-root .objPage-overlay-body .bingo-start-btn {
  padding: 14px;
  font-size: 1rem;
}

/* ── Compact row ── */

.bingoals-root .subCompactRow {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  border-radius: 6px;
  cursor: pointer;
  min-height: 48px;
  border: 1px solid transparent;
  transition: background 80ms ease;
}

.bingoals-root .subCompactRow:hover { background: rgba(255,255,255,0.05); }

.bingoals-root .subCompactRow--active {
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.14);
}

.bingoals-root .subCompactRow--done { opacity: 0.42; }

.bingoals-root .subCompactDot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: rgba(255,255,255,0.2);
  transition: background 200ms ease;
}

.bingoals-root .subCompactDot--done { background: var(--success, #4caf50); }
.bingoals-root .subCompactDot--active { background: var(--primary); }
.bingoals-root .subCompactDot--running {
  background: var(--danger, #e53935);
  animation: subDotPulse 1s ease-in-out infinite;
}

@keyframes subDotPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.35; transform: scale(0.7); }
}

.bingoals-root .subCompactTitle {
  flex: 1;
  font-size: 0.87rem;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bingoals-root .subCompactRow--done .subCompactTitle { text-decoration: line-through; }

.bingoals-root .subCompactLinks {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  scrollbar-width: none;
  flex-shrink: 0;
  max-width: 44%;
  align-items: center;
}

.bingoals-root .subCompactLinks::-webkit-scrollbar { display: none; }

.bingoals-root .subCompactChip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 600;
  white-space: nowrap;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.16);
  color: inherit;
  cursor: pointer;
  transition: background 80ms ease;
  flex-shrink: 0;
}

.bingoals-root .subCompactChip:hover { background: rgba(255,255,255,0.18); }

.bingoals-root .subCompactAddLink {
  padding: 2px 6px;
  font-size: 0.68rem;
  font-weight: 600;
  opacity: 0;
  border-radius: 4px;
  border: 1px dashed rgba(255,255,255,0.2);
  background: transparent;
  color: inherit;
  cursor: pointer;
  flex-shrink: 0;
  transition: opacity 100ms ease;
}

.bingoals-root .subCompactRow:hover .subCompactAddLink { opacity: 0.7; }
.bingoals-root .subCompactAddLink:hover { opacity: 1 !important; }

.bingoals-root .subCompactProgress {
  font-size: 0.7rem;
  font-variant-numeric: tabular-nums;
  opacity: 0.5;
  white-space: nowrap;
  flex-shrink: 0;
}

/* ── Grid view ── */

.bingoals-root .subGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

@media (min-width: 1400px) {
  .bingoals-root .subGrid { grid-template-columns: repeat(3, 1fr); }
}

.bingoals-root .subGridTile {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  min-height: 120px;
  cursor: pointer;
  background-size: cover;
  background-position: center;
  border: 2px solid transparent;
  transition: transform 100ms ease, box-shadow 100ms ease;
}

.bingoals-root .subGridTile:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
}

.bingoals-root .subGridTile--active { border-color: var(--primary); }

.bingoals-root .subGridDoneOverlay {
  display: none;
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.55);
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  z-index: 2;
}

.bingoals-root .subGridTile--done .subGridDoneOverlay { display: flex; }

.bingoals-root .subGridProgress {
  position: absolute;
  top: 6px; left: 6px;
  font-size: 0.65rem;
  font-weight: 700;
  background: rgba(0,0,0,0.45);
  border-radius: 10px;
  padding: 1px 7px;
  color: #fff;
  z-index: 3;
}

.bingoals-root .subGridAddLink {
  position: absolute;
  top: 6px; right: 6px;
  padding: 2px 6px;
  font-size: 0.65rem;
  font-weight: 600;
  background: rgba(0,0,0,0.4);
  border: 1px dashed rgba(255,255,255,0.3);
  border-radius: 4px;
  color: #fff;
  cursor: pointer;
  opacity: 0;
  transition: opacity 100ms ease;
  z-index: 3;
}

.bingoals-root .subGridTile:hover .subGridAddLink { opacity: 1; }

.bingoals-root .subGridScrim {
  position: absolute;
  left: 0; right: 0; bottom: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 100%);
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 1;
}

.bingoals-root .subGridTitle {
  font-size: 0.77rem;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0,0,0,0.6);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bingoals-root .subGridLinks { display: flex; gap: 3px; flex-wrap: wrap; }

.bingoals-root .subGridChip {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 1px 6px;
  border-radius: 10px;
  font-size: 0.62rem;
  font-weight: 600;
  background: rgba(0,0,0,0.5);
  border: 1px solid rgba(255,255,255,0.2);
  color: #fff;
  cursor: pointer;
  transition: background 80ms ease;
  white-space: nowrap;
}

.bingoals-root .subGridChip:hover { background: rgba(0,0,0,0.7); }

/* ── Active panel — link chips above timer ── */

.bingoals-root .subTimerLinks {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.bingoals-root .subTimerLinkChip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.82rem;
  font-weight: 600;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  color: inherit;
  cursor: pointer;
  transition: background 100ms ease;
}

.bingoals-root .subTimerLinkChip:hover { background: rgba(255,255,255,0.2); }

/* ── Memories divider in active panel ── */

.bingoals-root .subMemoriesDivider {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 20px 0 12px;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  opacity: 0.4;
}

.bingoals-root .subMemoriesDivider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: currentColor;
  opacity: 0.4;
}
```

- [ ] **Step 2: Verify no syntax errors**

```bash
npm run dev -- --mode development 2>&1 | head -20
```

Expected: no CSS parse errors. Ctrl-C after seeing "ready".

- [ ] **Step 3: Commit**

```bash
git add src/styles/bingoals.css
git commit -m "feat(bingoals): add detail page layout, compact row, grid tile, overlay CSS"
```

---

### Task 3: SubobjectiveCompactRow component

**Files:**
- Modify: `src/pages/bingoals/BingoObjectivePage.tsx`

Add this component **after the `AddLinkModal` function** (around line 303). It needs these imports already present at the top of the file: `ExternalLink` (from lucide-react), `openExternal` (top of file), `computeAutoDone` (already defined), `clamp01` (from format), `useTranslation`. Import `titleToHue` is NOT needed here — it's for tiles.

- [ ] **Step 1: Add the component**

In `src/pages/bingoals/BingoObjectivePage.tsx`, after the closing `}` of `AddLinkModal` (after line ~302), insert:

```tsx
function subProgressText(s: Subobjective): string {
  if ((s.target_total ?? 0) > 0) {
    const unit = s.unit ? ` ${s.unit}` : ''
    return `${s.progress_current} / ${s.target_total}${unit}`
  }
  const { autoDone } = computeAutoDone(s)
  return autoDone ? '✓' : '—'
}

function SubobjectiveCompactRow(props: {
  s: Subobjective
  subMedia: MediaItem[]
  running: { subId: string; startedAt: number } | null
  activeSubId: string | null
  setActiveSubId: (id: string | null) => void
  onAddLink: () => void
}) {
  const { s, subMedia, running, activeSubId, setActiveSubId, onAddLink } = props
  const { t } = useTranslation()
  const { autoDone, hasTarget } = computeAutoDone(s)
  const isDone = autoDone || (!hasTarget && !!s.is_done)
  const isActive = activeSubId === s.id
  const isRunning = running?.subId === s.id

  const links = subMedia
    .filter(m => m.kind === 'link')
    .map(item => {
      try { return JSON.parse(item.data) as { url: string; label: string } }
      catch { return { url: item.data, label: '' } }
    })

  const dotClass = [
    'subCompactDot',
    isRunning ? 'subCompactDot--running' : isDone ? 'subCompactDot--done' : isActive ? 'subCompactDot--active' : '',
  ].filter(Boolean).join(' ')

  return (
    <div
      className={['subCompactRow', isActive && 'subCompactRow--active', isDone && 'subCompactRow--done'].filter(Boolean).join(' ')}
      onClick={() => setActiveSubId(s.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveSubId(s.id) }}
    >
      <span className={dotClass} aria-hidden="true" />
      <span className="subCompactTitle">{s.title}</span>
      {links.length > 0 && (
        <div className="subCompactLinks" onClick={e => e.stopPropagation()}>
          {links.map(link => (
            <button
              key={link.url}
              className="subCompactChip"
              onClick={() => openExternal(link.url)}
              title={link.url}
            >
              <ExternalLink size={10} />
              {link.label || link.url}
            </button>
          ))}
        </div>
      )}
      <button
        className="subCompactAddLink"
        onClick={(e) => { e.stopPropagation(); onAddLink() }}
        title={t('bingoals.add_link')}
        aria-label={t('bingoals.add_link')}
      >+ link</button>
      <span className="subCompactProgress">{subProgressText(s)}</span>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to `SubobjectiveCompactRow`. Fix any type errors before continuing.

- [ ] **Step 3: Commit**

```bash
git add src/pages/bingoals/BingoObjectivePage.tsx
git commit -m "feat(bingoals): add SubobjectiveCompactRow component"
```

---

### Task 4: SubobjectiveTile component

**Files:**
- Modify: `src/pages/bingoals/BingoObjectivePage.tsx`

Add import for `titleToHue` at top of file. Then add `SubobjectiveTile` after `SubobjectiveCompactRow`.

- [ ] **Step 1: Add import**

In `src/pages/bingoals/BingoObjectivePage.tsx`, add to the existing imports at the top:

```tsx
import { titleToHue } from "../../lib/bingoals/color";
```

- [ ] **Step 2: Add the component**

After `SubobjectiveCompactRow`, insert:

```tsx
function SubobjectiveTile(props: {
  s: Subobjective
  subMedia: MediaItem[]
  running: { subId: string; startedAt: number } | null
  activeSubId: string | null
  setActiveSubId: (id: string | null) => void
  onAddLink: () => void
}) {
  const { s, subMedia, running, activeSubId, setActiveSubId, onAddLink } = props
  const { t } = useTranslation()
  const { autoDone, hasTarget } = computeAutoDone(s)
  const isDone = autoDone || (!hasTarget && !!s.is_done)
  const isActive = activeSubId === s.id

  const links = subMedia
    .filter(m => m.kind === 'link')
    .map(item => {
      try { return JSON.parse(item.data) as { url: string; label: string } }
      catch { return { url: item.data, label: '' } }
    })

  const lastImage = subMedia.filter(m => m.kind === 'image').at(-1)
  const hue = titleToHue(s.title)

  const tileStyle: React.CSSProperties = lastImage
    ? { backgroundImage: `url(${lastImage.data})` }
    : { background: `hsl(${hue}, 35%, 28%)` }

  const progressText = (s.target_total ?? 0) > 0
    ? `${s.progress_current}/${s.target_total}`
    : isDone ? '✓' : null

  return (
    <div
      className={['subGridTile', isActive && 'subGridTile--active', isDone && 'subGridTile--done'].filter(Boolean).join(' ')}
      style={tileStyle}
      onClick={() => setActiveSubId(s.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveSubId(s.id) }}
    >
      <div className="subGridDoneOverlay">✓</div>
      {progressText && <div className="subGridProgress">{progressText}</div>}
      <button
        className="subGridAddLink"
        onClick={(e) => { e.stopPropagation(); onAddLink() }}
        title={t('bingoals.add_link')}
        aria-label={t('bingoals.add_link')}
      >+ link</button>
      <div className="subGridScrim">
        <div className="subGridTitle">{s.title}</div>
        {links.length > 0 && (
          <div className="subGridLinks" onClick={e => e.stopPropagation()}>
            {links.map(link => (
              <button
                key={link.url}
                className="subGridChip"
                onClick={() => openExternal(link.url)}
                title={link.url}
              >
                <ExternalLink size={8} />
                {link.label || link.url}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/bingoals/BingoObjectivePage.tsx
git commit -m "feat(bingoals): add SubobjectiveTile grid component"
```

---

### Task 5: Extract SubobjectiveTimerPanel

**Files:**
- Modify: `src/pages/bingoals/BingoObjectivePage.tsx`

Extract the content of `.bingo-panel-left` from `SubobjectivePanel` into a new `SubobjectiveTimerPanel` component. `SubobjectivePanel` will delegate to it. State that moves into `SubobjectiveTimerPanel`: `isEditingCount`, `timeEditOpen`, `timeEditMs`, `quickAddOpen`, `deleteConfirm`.

- [ ] **Step 1: Add `SubobjectiveTimerPanel`**

Add after `SubobjectiveTile`. This component contains exactly what's currently inside `.bingo-panel-left` plus its modal dependencies `TimeEditModal` and `QuickAddTimeModal`. `isEditingTitle` stays in `SubobjectivePanel` since the title header is at the panel level.

```tsx
const SubobjectiveTimerPanel = memo(function SubobjectiveTimerPanel(props: {
  s: Subobjective
  timeStats: { total_ms: number; last_end: number | null }
  subs: Subobjective[]
  setSubs: React.Dispatch<React.SetStateAction<Subobjective[]>>
  running: { subId: string; startedAt: number } | null
  playingSubId: string | null
  setPlayingSubId: React.Dispatch<React.SetStateAction<string | null>>
  reload: () => Promise<void>
  stopTimerIfRunning: () => Promise<void>
  setRunning: React.Dispatch<React.SetStateAction<{ subId: string; startedAt: number } | null>>
}) {
  const { s, timeStats, subs, setSubs, running, playingSubId, setPlayingSubId, reload, stopTimerIfRunning, setRunning } = props
  const { t } = useTranslation()
  const [timeEditOpen, setTimeEditOpen] = useState(false)
  const [timeEditMs, setTimeEditMs] = useState(0)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [isEditingCount, setIsEditingCount] = useState(false)

  const last = Math.max(timeStats.last_end ?? 0, s.updated_at ?? 0) || null
  const d = daysAgo(last)
  const initRunningExtra = running?.subId === s.id ? Math.max(0, Date.now() - running.startedAt) : 0
  const initialTotalMs = (timeStats.total_ms ?? 0) + initRunningExtra
  const { hasTarget, autoDone } = computeAutoDone(s)
  const ratio = hasTarget && (s.target_total ?? 0) > 0
    ? clamp01((s.progress_current ?? 0) / (s.target_total ?? 0))
    : autoDone ? 1 : 0
  const isRunning = running?.subId === s.id

  const tickCount = (() => {
    const target = s.target_total ?? 0
    if (target <= 0) return 10
    const steps = [1, 2, 5, 10, 20, 25, 50, 100, 250, 500, 1000]
    for (const step of steps) {
      const ticks = Math.ceil(target / step)
      if (ticks <= 20) return ticks
    }
    return Math.ceil(target / 20)
  })()

  return (
    <div className="bingo-panel-left">
      <div className="bingo-instrument-face">
        <TimerDisplay
          totalMs={initialTotalMs}
          isRunning={isRunning}
          startedAt={isRunning ? running!.startedAt : null}
          className="bingo-instrument-timer"
        />
        <button
          className="btn btn-icon bingo-instrument-edit"
          onMouseEnter={() => playSFX(SFX.HOVER)}
          onClick={async (e) => {
            e.stopPropagation()
            await stopTimerIfRunning()
            const ms = (timeStats.total_ms ?? 0) + (running?.subId === s.id ? Math.max(0, Date.now() - running.startedAt) : 0)
            setTimeEditMs(ms)
            setTimeEditOpen(true)
          }}
          title={t('bingoals.time_edit_title')}
          aria-label={t('bingoals.time_edit_title')}
        >
          <Pencil size={12} />
        </button>
        <button
          className="btn btn-icon bingo-instrument-quick-add"
          onMouseEnter={() => playSFX(SFX.HOVER)}
          onClick={(e) => { e.stopPropagation(); setQuickAddOpen(true) }}
          title={t('bingoals.quick_add_title')}
          aria-label={t('bingoals.quick_add_title')}
        >
          <Plus size={12} />
        </button>
      </div>

      {isRunning ? (
        <button className="btn btn-danger bingo-start-btn" onClick={() => { playSFX(SFX.CANCEL); stopTimerIfRunning() }} onMouseEnter={() => playSFX(SFX.HOVER)} title={t('bingoals.stop')}>
          <span className="bingo-stop-square" aria-hidden="true" />
          {t('bingoals.stop')}
        </button>
      ) : (
        <button className="btn btn-primary bingo-start-btn" onClick={async () => { playSFX(SFX.SESSION_START); await stopTimerIfRunning(); setRunning({ subId: s.id, startedAt: Date.now() }) }} onMouseEnter={() => playSFX(SFX.HOVER)}>
          <span className="bingo-rec-dot" aria-hidden="true" />
          {t('bingoals.start')}
        </button>
      )}

      <div className="bingo-count-block">
        {isEditingCount ? (
          <input
            className="numInput bingo-count-input"
            type="number"
            autoFocus
            aria-label={t('bingoals.aria_current')}
            value={s.progress_current ?? 0}
            onChange={(e) => { const v = Number(e.target.value); setSubs((prev) => prev.map((x) => (x.id === s.id ? { ...x, progress_current: v } : x))) }}
            onBlur={async () => {
              setIsEditingCount(false)
              const fresh = subs.find((x) => x.id === s.id)
              if (!fresh) return
              const { hasTarget, autoDone } = computeAutoDone(fresh)
              await updateSubobjective(s.id, { progress_current: fresh.progress_current, is_done: hasTarget ? (autoDone ? 1 : 0) : fresh.is_done })
              await reload()
            }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur() }}
          />
        ) : (
          <div
            className="bingo-count-value"
            onClick={() => setIsEditingCount(true)}
            role="button"
            tabIndex={0}
            aria-label={t('bingoals.aria_current')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsEditingCount(true) }}
          >
            {s.progress_current ?? 0}
          </div>
        )}
        <div className="bingo-count-caption">
          <span>/</span>
          <input
            className="numInput bingo-target-caption"
            type="number"
            aria-label={t('bingoals.aria_target')}
            value={s.target_total ?? 0}
            onChange={(e) => { const v = Number(e.target.value); setSubs((prev) => prev.map((x) => (x.id === s.id ? { ...x, target_total: v } : x))) }}
            onBlur={async () => {
              const fresh = subs.find((x) => x.id === s.id)
              if (!fresh) return
              const { hasTarget, autoDone } = computeAutoDone(fresh)
              await updateSubobjective(s.id, { target_total: fresh.target_total, is_done: hasTarget ? (autoDone ? 1 : 0) : fresh.is_done })
              await reload()
            }}
          />
          <input
            className="unitInput bingo-unit-caption"
            aria-label={t('bingoals.unit_label')}
            value={s.unit ?? ''}
            placeholder={t('bingoals.unit_placeholder')}
            onChange={(e) => setSubs((prev) => prev.map((x) => (x.id === s.id ? { ...x, unit: e.target.value } : x)))}
            onBlur={async () => {
              const fresh = subs.find((x) => x.id === s.id)
              if (fresh) await updateSubobjective(s.id, { unit: fresh.unit?.trim() || null })
              await reload()
            }}
          />
        </div>
      </div>

      <div className="bingo-tap-strip">
        <button
          className="bingo-tap-btn"
          aria-label={t('bingoals.decrement')}
          onMouseEnter={() => playSFX(SFX.HOVER)}
          onClick={async () => {
            const fresh = subs.find((x) => x.id === s.id)
            if (!fresh) return
            const next = Math.max(0, (fresh.progress_current ?? 0) - 1)
            playSFX(SFX.CANCEL)
            setSubs((prev) => prev.map((x) => (x.id === s.id ? { ...x, progress_current: next } : x)))
            const { hasTarget: ht, autoDone: ad } = computeAutoDone({ ...fresh, progress_current: next })
            await updateSubobjective(s.id, { progress_current: next, is_done: ht ? (ad ? 1 : 0) : fresh.is_done })
            await reload()
          }}
        >−</button>
        <button
          className="bingo-tap-btn"
          aria-label={t('bingoals.increment')}
          onMouseEnter={() => playSFX(SFX.HOVER)}
          onClick={async () => {
            const fresh = subs.find((x) => x.id === s.id)
            if (!fresh) return
            const next = (fresh.progress_current ?? 0) + 1
            const { hasTarget: ht, autoDone: ad } = computeAutoDone({ ...fresh, progress_current: next })
            playSFX(ad ? SFX.BINGO_COMPLETE : SFX.BINGO_CHECK)
            setSubs((prev) => prev.map((x) => (x.id === s.id ? { ...x, progress_current: next } : x)))
            await updateSubobjective(s.id, { progress_current: next, is_done: ht ? (ad ? 1 : 0) : fresh.is_done })
            await reload()
          }}
        >+</button>
      </div>

      <div className="bingo-tick-bar" style={{ '--bingo-ticks': tickCount } as React.CSSProperties}>
        <div className="bingo-tick-fill" style={{ '--bingo-fill': `${ratio * 100}%` } as React.CSSProperties} />
      </div>

      <div className="bingo-instrument-footer">
        <span className="muted">{formatDaysAgo(d, t)}</span>
        <div className="row bingo-sub-actions">
          <button className="btn bingo-mark-done-btn" onMouseEnter={() => playSFX(SFX.HOVER)} onClick={async () => {
            if (hasTarget) {
              const next = autoDone ? Math.max(0, (s.target_total ?? 1) - 1) : (s.target_total ?? 1)
              const { autoDone: ad } = computeAutoDone({ ...s, progress_current: next })
              playSFX(ad ? SFX.BINGO_COMPLETE : SFX.BINGO_CHECK)
              setSubs((prev) => prev.map((x) => (x.id === s.id ? { ...x, progress_current: next } : x)))
              await updateSubobjective(s.id, { progress_current: next, is_done: ad ? 1 : 0 })
            } else {
              playSFX(s.is_done ? SFX.CANCEL : SFX.BINGO_COMPLETE)
              await updateSubobjective(s.id, { is_done: s.is_done ? 0 : 1 })
            }
            await reload()
          }}>
            {(autoDone || (!hasTarget && s.is_done)) ? t('bingoals.undone') : t('bingoals.done')}
          </button>
          {deleteConfirm ? (
            <>
              <button className="btn btn-danger" onClick={async () => {
                if (running?.subId === s.id) await stopTimerIfRunning()
                if (playingSubId === s.id) setPlayingSubId(null)
                await deleteSubobjective(s.id)
                await reload()
              }}>{t('bingoals.yes_delete')}</button>
              <button className="btn" onClick={() => setDeleteConfirm(false)}>{t('bingoals.cancel')}</button>
            </>
          ) : (
            <button className="btn-icon bingo-delete-btn" onMouseEnter={() => playSFX(SFX.HOVER)} onClick={() => setDeleteConfirm(true)} aria-label={t('bingoals.delete')}>
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <TimeEditModal
        open={timeEditOpen}
        initialMs={timeEditMs}
        onSave={async (ms) => { setTimeEditOpen(false); await setSubobjectiveTotalTime(s.id, ms); await reload() }}
        onClose={() => setTimeEditOpen(false)}
      />
      <QuickAddTimeModal
        open={quickAddOpen}
        onSave={async (deltaMs) => { setQuickAddOpen(false); if (deltaMs > 0) { await addManualTimeDelta(s.id, deltaMs); await reload() } }}
        onClose={() => setQuickAddOpen(false)}
      />
    </div>
  )
}, (prev, next) =>
  prev.s === next.s && prev.timeStats === next.timeStats && prev.running === next.running &&
  prev.playingSubId === next.playingSubId
)
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/bingoals/BingoObjectivePage.tsx
git commit -m "feat(bingoals): extract SubobjectiveTimerPanel component"
```

---

### Task 6: Extract SubobjectiveMemories + update SubobjectivePanel

**Files:**
- Modify: `src/pages/bingoals/BingoObjectivePage.tsx`

Extract the `.bingo-panel-right` content into `SubobjectiveMemories`. Then rewrite `SubobjectivePanel` to be a thin wrapper using `SubobjectiveTimerPanel` + `SubobjectiveMemories`.

- [ ] **Step 1: Add `SubobjectiveMemories`**

After `SubobjectiveTimerPanel`, add:

```tsx
const SubobjectiveMemories = memo(function SubobjectiveMemories(props: {
  s: Subobjective
  subs: Subobjective[]
  subMedia: MediaItem[]
  playingSubId: string | null
  setPlayingSubId: React.Dispatch<React.SetStateAction<string | null>>
  reload: () => Promise<void>
  stopTimerIfRunning: () => Promise<void>
}) {
  const { s, subs, subMedia, playingSubId, setPlayingSubId, reload, stopTimerIfRunning } = props
  const { t } = useTranslation()
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const isPlaying = playingSubId === s.id
  const linkItems = subMedia.filter(m => m.kind === 'link')
  const slideItems = subMedia.filter(m => m.kind !== 'link')

  return (
    <div className="memories">
      <div className="row bingo-panel-header-row">
        <div className="muted bingo-section-label">{t('bingoals.memories_label')}</div>
        <div className="memories-actions">
          <button className="btn bingo-memory-action-btn" onMouseEnter={() => playSFX(SFX.HOVER)} onClick={() => setQuoteOpen(true)}>{t('bingoals.add_quote')}</button>
          <button className="btn bingo-memory-action-btn" onMouseEnter={() => playSFX(SFX.HOVER)} onClick={() => setLinkOpen(true)}>{t('bingoals.add_link')}</button>
          <label className="btn bingo-memory-action-btn" onMouseEnter={() => playSFX(SFX.HOVER)}>
            {t('bingoals.add_images')}
            <input
              type="file"
              accept="image/*"
              multiple
              className="bingo-file-input"
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? [])
                if (files.length === 0) return
                await stopTimerIfRunning()
                for (const file of files) {
                  const dataUrl = await fileToCompressedDataUrl(file)
                  await addImage(s.id, dataUrl)
                  await new Promise((r) => setTimeout(r, 0))
                }
                e.currentTarget.value = ''
                await reload()
              }}
            />
          </label>
          {(() => {
            const slideCount = slideItems.length
            return (
              <button
                className="btn bingo-memories-play"
                disabled={slideCount < 2}
                title={slideCount < 2 ? t('bingoals.play_requires_two') : undefined}
                onMouseEnter={() => playSFX(SFX.HOVER)}
                onClick={() => setPlayingSubId((prev) => (prev === s.id ? null : s.id))}
              >
                {isPlaying ? t('bingoals.pause') : t('bingoals.play')}
              </button>
            )
          })()}
        </div>
      </div>
      {linkItems.length > 0 && (
        <div className="bingo-links-row">
          {linkItems.map(item => {
            const parsed = (() => { try { return JSON.parse(item.data) } catch { return { url: item.data, label: '' } } })()
            return (
              <div key={item.id} className="bingo-link-pill">
                <button className="bingo-link-pill-btn" onClick={() => openExternal(parsed.url)} title={parsed.url}>
                  <ExternalLink size={12} />
                  {parsed.label || parsed.url}
                </button>
                <button className="bingo-link-pill-delete" onClick={async () => { await deleteMediaItem(item.id); await reload() }} aria-label={t('bingoals.delete')}>×</button>
              </div>
            )
          })}
        </div>
      )}
      <Slideshow
        items={slideItems}
        playing={isPlaying}
        onRequestStop={() => setPlayingSubId(null)}
        onDelete={async (mediaId) => { await deleteMediaItem(mediaId); await reload() }}
      />
      <AddQuoteModal
        open={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        onAdd={async (quote) => { setQuoteOpen(false); await addQuote(s.id, quote); await reload() }}
      />
      <AddLinkModal
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        onAdd={async (url, label) => { setLinkOpen(false); await addLink(s.id, url, label); await reload() }}
      />
    </div>
  )
}, (prev, next) =>
  prev.s === next.s && prev.playingSubId === next.playingSubId && prev.subMedia === next.subMedia
)
```

- [ ] **Step 2: Replace `SubobjectivePanel` body with thin wrapper**

Find the existing `SubobjectivePanel` memo function (around line 305 in the original, though line numbers shift after additions). Replace its entire body with:

```tsx
const SubobjectivePanel = memo(function SubobjectivePanel(props: {
  s: Subobjective
  timeStats: { total_ms: number; last_end: number | null }
  subs: Subobjective[]
  setSubs: React.Dispatch<React.SetStateAction<Subobjective[]>>
  running: { subId: string; startedAt: number } | null
  playingSubId: string | null
  setPlayingSubId: React.Dispatch<React.SetStateAction<string | null>>
  subMedia: MediaItem[]
  reload: () => Promise<void>
  stopTimerIfRunning: () => Promise<void>
  setRunning: React.Dispatch<React.SetStateAction<{ subId: string; startedAt: number } | null>>
}) {
  const { s, timeStats, subs, setSubs, running, playingSubId, setPlayingSubId, subMedia, reload, stopTimerIfRunning, setRunning } = props
  const { t } = useTranslation()
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const { autoDone, hasTarget } = computeAutoDone(s)
  const ratio = hasTarget && (s.target_total ?? 0) > 0
    ? clamp01((s.progress_current ?? 0) / (s.target_total ?? 0))
    : autoDone ? 1 : 0
  const isRunning = running?.subId === s.id

  return (
    <div className={`panel ${autoDone ? 'panelDone' : ''} ${isRunning ? 'panelRecording' : ''}`}>
      <div className="row bingo-panel-header-row">
        {isEditingTitle ? (
          <input
            className="titleInput"
            aria-label={t('bingoals.sub_title_aria')}
            value={s.title}
            autoFocus
            onChange={(e) => setSubs((prev) => prev.map((x) => (x.id === s.id ? { ...x, title: e.target.value } : x)))}
            onBlur={async () => {
              setIsEditingTitle(false)
              const fresh = subs.find((x) => x.id === s.id)
              if (fresh) await updateSubobjective(s.id, { title: fresh.title })
              await reload()
            }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur() }}
          />
        ) : (
          <div
            className="titleDisplay"
            onClick={() => setIsEditingTitle(true)}
            role="button"
            tabIndex={0}
            aria-label={t('bingoals.sub_title_aria')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsEditingTitle(true) }}
          >
            {s.title}
          </div>
        )}
        <div className="pill">{Math.round(ratio * 100)}%</div>
      </div>
      <div className="bingo-panel-body">
        <SubobjectiveTimerPanel
          s={s} timeStats={timeStats} subs={subs} setSubs={setSubs}
          running={running} playingSubId={playingSubId} setPlayingSubId={setPlayingSubId}
          reload={reload} stopTimerIfRunning={stopTimerIfRunning} setRunning={setRunning}
        />
        <div className="bingo-panel-right">
          <SubobjectiveMemories
            s={s} subs={subs} subMedia={subMedia}
            playingSubId={playingSubId} setPlayingSubId={setPlayingSubId}
            reload={reload} stopTimerIfRunning={stopTimerIfRunning}
          />
        </div>
      </div>
    </div>
  )
}, (prev, next) =>
  prev.s === next.s && prev.timeStats === next.timeStats && prev.running === next.running &&
  prev.playingSubId === next.playingSubId && prev.subMedia === next.subMedia
)
```

- [ ] **Step 3: Type-check and run tests**

```bash
npx tsc --noEmit 2>&1 | head -30
npm test -- --reporter=verbose 2>&1 | tail -10
```

Expected: no type errors, all tests still pass.

- [ ] **Step 4: Verify full-view still works**

Run the app (`npm run dev`), navigate to any Bingoals objective, confirm panels still render with timer, controls, and memories.

- [ ] **Step 5: Commit**

```bash
git add src/pages/bingoals/BingoObjectivePage.tsx
git commit -m "feat(bingoals): extract SubobjectiveMemories, refactor SubobjectivePanel to thin wrapper"
```

---

### Task 7: ActiveTimerSection component

**Files:**
- Modify: `src/pages/bingoals/BingoObjectivePage.tsx`

`ActiveTimerSection` renders: link chips (all links for the active subobjective, above timer), `SubobjectiveTimerPanel`, and `SubobjectiveMemories` wrapped in `.subTimerMemories` (CSS hides at 4K where memoriesCol takes over).

- [ ] **Step 1: Add component**

After `SubobjectivePanel`, insert:

```tsx
function ActiveTimerSection(props: {
  s: Subobjective
  timeStats: { total_ms: number; last_end: number | null }
  subs: Subobjective[]
  setSubs: React.Dispatch<React.SetStateAction<Subobjective[]>>
  running: { subId: string; startedAt: number } | null
  setRunning: React.Dispatch<React.SetStateAction<{ subId: string; startedAt: number } | null>>
  stopTimerIfRunning: () => Promise<void>
  subMedia: MediaItem[]
  reload: () => Promise<void>
  playingSubId: string | null
  setPlayingSubId: React.Dispatch<React.SetStateAction<string | null>>
}) {
  const { s, subMedia } = props

  const links = subMedia
    .filter(m => m.kind === 'link')
    .map(item => {
      try { return JSON.parse(item.data) as { url: string; label: string } }
      catch { return { url: item.data, label: '' } }
    })

  return (
    <div>
      {links.length > 0 && (
        <div className="subTimerLinks">
          {links.map(link => (
            <button
              key={link.url}
              className="subTimerLinkChip"
              onClick={() => openExternal(link.url)}
              title={link.url}
            >
              <ExternalLink size={13} />
              {link.label || link.url}
            </button>
          ))}
        </div>
      )}
      <SubobjectiveTimerPanel
        s={s}
        timeStats={props.timeStats}
        subs={props.subs}
        setSubs={props.setSubs}
        running={props.running}
        playingSubId={props.playingSubId}
        setPlayingSubId={props.setPlayingSubId}
        reload={props.reload}
        stopTimerIfRunning={props.stopTimerIfRunning}
        setRunning={props.setRunning}
      />
      <div className="subTimerMemories">
        <div className="subMemoriesDivider">Memories</div>
        <SubobjectiveMemories
          s={s}
          subs={props.subs}
          subMedia={subMedia}
          playingSubId={props.playingSubId}
          setPlayingSubId={props.setPlayingSubId}
          reload={props.reload}
          stopTimerIfRunning={props.stopTimerIfRunning}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/bingoals/BingoObjectivePage.tsx
git commit -m "feat(bingoals): add ActiveTimerSection (links + timer + memories)"
```

---

### Task 8: Page state + objective header

**Files:**
- Modify: `src/pages/bingoals/BingoObjectivePage.tsx`

Add `activeSubId`, `listView`, `pendingAddLinkSubId` to `BingoObjectivePage`. Also add imports for `computeTotalMs`, `computeLastStudiedTs`, `formatDuration`.

- [ ] **Step 1: Add imports**

In `src/pages/bingoals/BingoObjectivePage.tsx`, update the import from `../../lib/bingoals/progress`:

```tsx
import { computeObjectivePercent, progressLabel, computeTotalMs, computeLastStudiedTs } from "../../lib/bingoals/progress";
```

And add `formatDuration` to the existing format import:

```tsx
import { clamp01, daysAgo, formatDuration } from "../../lib/bingoals/format";
```

- [ ] **Step 2: Add new state in `BingoObjectivePage`**

Inside `BingoObjectivePage`, after the existing state declarations (after `const [running, setRunning]`), add:

```tsx
  const [activeSubId, setActiveSubId] = useState<string | null>(null)
  const [listView, setListView] = useState<'compact' | 'grid' | 'full'>(() =>
    (localStorage.getItem('bingoals.listView') as 'compact' | 'grid' | 'full') ?? 'compact'
  )
  const [pendingAddLinkSubId, setPendingAddLinkSubId] = useState<string | null>(null)
```

- [ ] **Step 3: Persist listView**

Add a `useEffect` after the state declarations:

```tsx
  useEffect(() => {
    localStorage.setItem('bingoals.listView', listView)
  }, [listView])
```

- [ ] **Step 4: Auto-select first incomplete subobjective after load**

Modify `reload()` to set `activeSubId` to the first incomplete sub after loading. Replace the existing `reload` function:

```tsx
  async function reload() {
    const o = await getObjective(objectiveId)
    const s = await listSubobjectives(objectiveId)
    const ids = s.map((x) => x.id)
    const tStats = await getTimeStatsForSubobjectives(ids)
    const m = await listMediaForSubobjectives(ids)
    setObj(o)
    setSubs(s)
    setTimeMap(tStats)
    setMedia(m)
    setPlayingSubId((prev) => (prev && s.some((x) => x.id === prev) ? prev : null))
    setActiveSubId((prev) => {
      if (prev && s.some((x) => x.id === prev)) return prev
      const firstIncomplete = s.find((x) => {
        const { autoDone } = computeAutoDone(x)
        return !autoDone && !x.is_done
      })
      return firstIncomplete?.id ?? s[0]?.id ?? null
    })
  }
```

- [ ] **Step 5: Compute header meta values**

After the existing `percent` and `percentText` computations, add:

```tsx
  const totalMs = useMemo(() => computeTotalMs(timeMap), [timeMap])
  const lastStudiedTs = useMemo(() => computeLastStudiedTs(timeMap, subs), [timeMap, subs])
  const lastStudiedDays = daysAgo(lastStudiedTs)
```

- [ ] **Step 6: Replace the objective header in JSX**

In `BingoObjectivePage`'s return, replace the entire `<div className="page-header">` block and the `<div className="panel">` block (the goal prefix + percent pill + input + bar) with:

```tsx
      <div className="objPage-header">
        <div className="objPage-headerTitleRow">
          <Link to="/bingoals" className="btn btn-icon" aria-label={t('bingoals.back')}>
            <ArrowLeft size={20} />
          </Link>
          <h1 className="objPage-headerTitleText">{obj.title}</h1>
          {(obj.goal_kind === 'metric' || obj.goal_kind === 'amount' || obj.goal_kind === 'manual') && (
            <input
              type="number"
              className="numInput"
              style={{ width: 60 }}
              value={obj.current_value ?? 0}
              onChange={async (e) => {
                const v = Number(e.target.value)
                setObj({ ...obj, current_value: v })
                await updateObjective(obj.id, { current_value: v })
              }}
            />
          )}
        </div>
        <div className="objPage-headerProgressRow">
          <span className="objPage-headerProgressLabel">
            {progressLabel(percent, obj.goal_kind, obj.goal_target, obj.goal_unit)}
          </span>
          <div className="objPage-headerBar">
            <div className="objPage-headerBarFill" style={{ width: `${(percent ?? 0) * 100}%` }} />
          </div>
        </div>
        <div className="objPage-headerMeta">
          <span>{t('bingoals.last_studied_prefix') || 'Last:'} {formatDaysAgo(lastStudiedDays, t)}</span>
          <span>{t('bingoals.total_time_prefix') || 'Total:'} {formatDuration(totalMs)}</span>
        </div>
        <div className="objPage-controls">
          <div className="objPage-viewToggle">
            {(['compact', 'grid', 'full'] as const).map(v => (
              <button
                key={v}
                className={`objPage-viewBtn${listView === v ? ' objPage-viewBtn--active' : ''}`}
                onClick={() => setListView(v)}
              >
                {v}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" onMouseEnter={() => playSFX(SFX.HOVER)} onClick={() => setAddOpen(true)}>
            {t('bingoals.add_subobjective')}
          </button>
        </div>
      </div>
```

Also remove the old bottom add button (`<button className="btn bingo-add-sub-bottom"...>`).

- [ ] **Step 7: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors. If `t('bingoals.last_studied_prefix')` or `t('bingoals.total_time_prefix')` are not in i18n, the fallback strings `'Last:'` and `'Total:'` will show — that is acceptable.

- [ ] **Step 8: Commit**

```bash
git add src/pages/bingoals/BingoObjectivePage.tsx
git commit -m "feat(bingoals): add activeSubId/listView state, rewrite objective header"
```

---

### Task 9: List column + overlay + modals wiring

**Files:**
- Modify: `src/pages/bingoals/BingoObjectivePage.tsx`

Replace the `.list` section and surrounding JSX in `BingoObjectivePage`'s return with the new responsive layout: list column (compact/grid/full), active panel columns, overlay, and `pendingAddLinkSubId` modal.

- [ ] **Step 1: Replace the list and bottom button JSX**

In `BingoObjectivePage`'s return, find the block starting with `<div className="list">` through the bottom add button and `<AddSubobjectiveModal ... />`. Replace it with:

```tsx
      {/* ── Responsive layout ── */}
      <div className="objPage-layout">

        {/* List column */}
        <div className="objPage-listCol">
          {listView === 'compact' && subs.map(s => (
            <SubobjectiveCompactRow
              key={s.id}
              s={s}
              subMedia={mediaBySub.get(s.id) ?? []}
              running={running}
              activeSubId={activeSubId}
              setActiveSubId={setActiveSubId}
              onAddLink={() => setPendingAddLinkSubId(s.id)}
            />
          ))}
          {listView === 'grid' && (
            <div className="subGrid">
              {subs.map(s => (
                <SubobjectiveTile
                  key={s.id}
                  s={s}
                  subMedia={mediaBySub.get(s.id) ?? []}
                  running={running}
                  activeSubId={activeSubId}
                  setActiveSubId={setActiveSubId}
                  onAddLink={() => setPendingAddLinkSubId(s.id)}
                />
              ))}
            </div>
          )}
          {listView === 'full' && subs.map(s => (
            <SubobjectivePanel
              key={s.id}
              s={s}
              timeStats={timeMap.get(s.id) ?? { total_ms: 0, last_end: null }}
              subs={subs}
              setSubs={setSubs}
              running={running}
              playingSubId={playingSubId}
              setPlayingSubId={setPlayingSubId}
              subMedia={mediaBySub.get(s.id) ?? []}
              reload={reload}
              stopTimerIfRunning={stopTimerIfRunning}
              setRunning={setRunning}
            />
          ))}
        </div>

        {/* Active panel column — mid/wide only (CSS hides on narrow) */}
        {activeSubId && (() => {
          const activeSub = subs.find(x => x.id === activeSubId)
          if (!activeSub) return null
          return (
            <>
              <div className="objPage-activeCol">
                <ActiveTimerSection
                  s={activeSub}
                  timeStats={timeMap.get(activeSubId) ?? { total_ms: 0, last_end: null }}
                  subs={subs}
                  setSubs={setSubs}
                  running={running}
                  setRunning={setRunning}
                  stopTimerIfRunning={stopTimerIfRunning}
                  subMedia={mediaBySub.get(activeSubId) ?? []}
                  reload={reload}
                  playingSubId={playingSubId}
                  setPlayingSubId={setPlayingSubId}
                />
              </div>
              {/* 4K: memories in separate column */}
              <div className="objPage-memoriesCol">
                <SubobjectiveMemories
                  s={activeSub}
                  subs={subs}
                  subMedia={mediaBySub.get(activeSubId) ?? []}
                  playingSubId={playingSubId}
                  setPlayingSubId={setPlayingSubId}
                  reload={reload}
                  stopTimerIfRunning={stopTimerIfRunning}
                />
              </div>
            </>
          )
        })()}
      </div>

      {/* Narrow overlay — slide-up timer panel (CSS hides on 900px+) */}
      <div className={`objPage-overlay${activeSubId ? ' objPage-overlay--open' : ''}`}>
        {activeSubId && (() => {
          const activeSub = subs.find(x => x.id === activeSubId)
          if (!activeSub) return null
          return (
            <>
              <div className="objPage-overlay-header">
                <button
                  className="btn btn-icon"
                  onClick={() => setActiveSubId(null)}
                  aria-label={t('bingoals.back')}
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="objPage-overlay-title">{activeSub.title}</div>
              </div>
              <div className="objPage-overlay-body">
                <ActiveTimerSection
                  s={activeSub}
                  timeStats={timeMap.get(activeSubId) ?? { total_ms: 0, last_end: null }}
                  subs={subs}
                  setSubs={setSubs}
                  running={running}
                  setRunning={setRunning}
                  stopTimerIfRunning={stopTimerIfRunning}
                  subMedia={mediaBySub.get(activeSubId) ?? []}
                  reload={reload}
                  playingSubId={playingSubId}
                  setPlayingSubId={setPlayingSubId}
                />
              </div>
            </>
          )
        })()}
      </div>

      {/* Modals */}
      <AddSubobjectiveModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        objective={obj}
        onAdded={async () => { setAddOpen(false); await reload() }}
      />
      {pendingAddLinkSubId && (
        <AddLinkModal
          open={true}
          onClose={() => setPendingAddLinkSubId(null)}
          onAdd={async (url, label) => {
            const subId = pendingAddLinkSubId
            setPendingAddLinkSubId(null)
            await addLink(subId, url, label)
            await reload()
          }}
        />
      )}
```

- [ ] **Step 2: Type-check + tests**

```bash
npx tsc --noEmit 2>&1 | head -40
npm test 2>&1 | tail -5
```

Expected: no type errors, all tests pass (≥ 135).

- [ ] **Step 3: Manual smoke test (narrow — portrait)**

Run the app (`npm run dev`). Resize window to < 900px width. Open any Bingoals objective:
- Compact list with status dots and link chips visible
- Tap a row → overlay slides up from bottom
- Link chips in overlay above timer
- Back button closes overlay
- View toggle (compact/grid/full) changes list

- [ ] **Step 4: Manual smoke test (mid/4K)**

Resize window to > 900px:
- Two-column layout: list left, timer panel right
- Link chips above timer in right panel
- At > 1400px: three columns (list + timer + memories)
- Memories hidden from timer column at 4K

- [ ] **Step 5: Commit**

```bash
git add src/pages/bingoals/BingoObjectivePage.tsx
git commit -m "feat(bingoals): wire responsive layout — compact/grid/full list, overlay, columns, link chips"
```

---

### Task 10: Final type-check + test suite

**Files:** None changed.

- [ ] **Step 1: Run full type-check**

```bash
npx tsc --noEmit 2>&1
```

Expected: zero errors. If errors exist, fix them before continuing.

- [ ] **Step 2: Run full test suite**

```bash
npm test 2>&1 | tail -15
```

Expected: all tests pass. Count should be ≥ 135 (126 original + 9 new).

- [ ] **Step 3: Manual checklist**

Per spec `Testing` section:
- [ ] Compact: tap row → active panel opens; link chip → opens external, no navigation
- [ ] Compact: `[+ link]` → AddLinkModal opens for that subobjective; saves correctly
- [ ] Grid: tile background = cover art if image exists; hash color if not
- [ ] Grid: done tile shows overlay + ✓
- [ ] Portrait (< 900px): tap row → overlay slides up; back button → closes
- [ ] Mid (900–1400px): right column shows active timer
- [ ] 4K (≥ 1400px): 3 columns visible; memories always in right column
- [ ] View toggle persists after page reload
- [ ] `activeSubId` auto-set to first incomplete on load
- [ ] Links at top of active panel, immediately visible without scrolling
- [ ] Full view: existing SubobjectivePanel layout preserved
- [ ] Timer font-size: larger in active panel than in full-view panel

- [ ] **Step 4: Commit any fixes**

```bash
git add -p  # stage only fix files
git commit -m "fix(bingoals): detail page polish from manual testing"
```
