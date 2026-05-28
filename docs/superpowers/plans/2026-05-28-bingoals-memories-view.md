# Bingoals Memories View + Contrast Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `compact` list view with a memories-focused `memories` view (per-sub horizontal strips of image/quote cards), and fix the black-on-black contrast bug on `Marquer terminé` / `+ Citation` / `+ Lien` / `Lire` buttons.

**Architecture:** Add new `SubobjectiveMemoryStrip` and `MemoryLightbox` components in `BingoObjectivePage.tsx`. Extract strip ordering to a pure `sortStripsForMemoriesView` utility (tested). Append new `.memStrip-*` CSS and rewrite the three offending button rules to drop the `.panel` ancestor restriction and use a neutral readable palette. Delete `SubobjectiveCompactRow` and its row-only CSS. Migrate `localStorage['bingoals.listView'] === 'compact'` to `'memories'`.

**Tech Stack:** React 19, TypeScript, Vitest, electron-vite, CSS custom properties (`--primary`, `--danger`, `--success`)

---

## File Map

| File | Change |
|---|---|
| `src/lib/bingoals/sortStrips.ts` | Create — `sortStripsForMemoriesView` pure fn |
| `src/lib/__tests__/bingoals-strip-sort.test.ts` | Create — 5 tests for sort |
| `src/styles/bingoals.css` | Modify — fix 3 button rules; append memStrip + lightbox CSS; remove dead compact row rules |
| `src/pages/bingoals/BingoObjectivePage.tsx` | Modify — new strip + lightbox components; delete compact row; update listView union, migration, render dispatch |

---

### Task 1: sortStripsForMemoriesView utility + tests

**Files:**
- Create: `src/lib/bingoals/sortStrips.ts`
- Create: `src/lib/__tests__/bingoals-strip-sort.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/bingoals-strip-sort.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { sortStripsForMemoriesView } from '../bingoals/sortStrips'

type S = { id: string; done: boolean }
const isDone = (s: S) => s.done

describe('sortStripsForMemoriesView', () => {
  it('returns empty array unchanged', () => {
    expect(sortStripsForMemoriesView<S>([], null, isDone)).toEqual([])
  })

  it('preserves DB order when no running and no done', () => {
    const subs: S[] = [
      { id: 'a', done: false },
      { id: 'b', done: false },
      { id: 'c', done: false },
    ]
    const out = sortStripsForMemoriesView(subs, null, isDone)
    expect(out.map(s => s.id)).toEqual(['a', 'b', 'c'])
  })

  it('floats the running sub to the top', () => {
    const subs: S[] = [
      { id: 'a', done: false },
      { id: 'b', done: false },
      { id: 'c', done: false },
    ]
    const out = sortStripsForMemoriesView(subs, 'c', isDone)
    expect(out.map(s => s.id)).toEqual(['c', 'a', 'b'])
  })

  it('sinks done subs to the bottom', () => {
    const subs: S[] = [
      { id: 'a', done: true },
      { id: 'b', done: false },
      { id: 'c', done: true },
      { id: 'd', done: false },
    ]
    const out = sortStripsForMemoriesView(subs, null, isDone)
    expect(out.map(s => s.id)).toEqual(['b', 'd', 'a', 'c'])
  })

  it('running sub wins even when done', () => {
    const subs: S[] = [
      { id: 'a', done: false },
      { id: 'b', done: true },
    ]
    const out = sortStripsForMemoriesView(subs, 'b', isDone)
    expect(out.map(s => s.id)).toEqual(['b', 'a'])
  })

  it('does not mutate input array', () => {
    const subs: S[] = [
      { id: 'a', done: true },
      { id: 'b', done: false },
    ]
    const copy = [...subs]
    sortStripsForMemoriesView(subs, null, isDone)
    expect(subs).toEqual(copy)
  })
})
```

- [ ] **Step 2: Run tests — expect failures**

```bash
cd /home/html5ishard/.gemini/antigravity/scratch/study-buddy-electron
npm test -- --reporter=verbose 2>&1 | grep -E "PASS|FAIL|✓|✗|sortStrips"
```

Expected: FAIL — `sortStripsForMemoriesView` not found.

- [ ] **Step 3: Implement the function**

Create `src/lib/bingoals/sortStrips.ts`:

```ts
export function sortStripsForMemoriesView<S extends { id: string }>(
  subs: ReadonlyArray<S>,
  runningSubId: string | null,
  isDone: (s: S) => boolean
): S[] {
  return [...subs].sort((a, b) => {
    if (runningSubId === a.id && runningSubId !== b.id) return -1
    if (runningSubId === b.id && runningSubId !== a.id) return 1
    const aDone = isDone(a)
    const bDone = isDone(b)
    if (aDone !== bDone) return aDone ? 1 : -1
    return 0
  })
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
npm test -- --reporter=verbose 2>&1 | grep -E "PASS|FAIL|sortStrips"
```

Expected: all 6 `sortStripsForMemoriesView` tests PASS. Total tests ≥ 144.

- [ ] **Step 5: Commit**

```bash
git add src/lib/bingoals/sortStrips.ts src/lib/__tests__/bingoals-strip-sort.test.ts
git commit -m "feat(bingoals): add sortStripsForMemoriesView (running > incomplete > done)"
```

---

### Task 2: Contrast fixes for action buttons

**Files:**
- Modify: `src/styles/bingoals.css:1545-1565` and around the `.bingo-memories-play` block at `:892`

The current rules scope `bingo-mark-done-btn` and `bingo-memory-action-btn` under `.panel`, so they don't apply inside the new `subFullCard` or upcoming `memStrip`. They also use `opacity: 0.55-0.65` which is too aggressive. Dropping the ancestor restriction and bumping opacity fixes both issues. Adding an explicit neutral palette (`rgba(255,255,255,0.x)`) ensures the buttons stay readable regardless of theme.

- [ ] **Step 1: Find current `bingo-mark-done-btn` and `bingo-memory-action-btn` rules**

Read `src/styles/bingoals.css` around line 1545 to find:

```css
.bingoals-root .panel .bingo-mark-done-btn { … }
.bingoals-root .panel .bingo-mark-done-btn:hover { … }
.bingoals-root .panel .bingo-memory-action-btn,
.bingoals-root .panel label.bingo-memory-action-btn { … }
.bingoals-root .panel .bingo-memory-action-btn:hover,
.bingoals-root .panel label.bingo-memory-action-btn:hover { … }
```

- [ ] **Step 2: Replace those four rule blocks**

Use `Edit` tool on `src/styles/bingoals.css`. Replace this entire block:

```css
.bingoals-root .panel .bingo-mark-done-btn {
  font-size: 0.83em;
  opacity: 0.65;
  transition: opacity 120ms ease;
}

.bingoals-root .panel .bingo-mark-done-btn:hover {
  opacity: 1;
}

.bingoals-root .panel .bingo-memory-action-btn,
.bingoals-root .panel label.bingo-memory-action-btn {
  font-size: 0.78em;
  opacity: 0.55;
  transition: opacity 120ms ease;
}

.bingoals-root .panel .bingo-memory-action-btn:hover,
.bingoals-root .panel label.bingo-memory-action-btn:hover {
  opacity: 1;
}
```

With:

```css
.bingoals-root .bingo-mark-done-btn {
  font-size: 0.83em;
  opacity: 0.85;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.16);
  color: inherit;
  transition: opacity 120ms ease, background 120ms ease;
}

.bingoals-root .bingo-mark-done-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.12);
}

.bingoals-root .bingo-memory-action-btn,
.bingoals-root label.bingo-memory-action-btn {
  font-size: 0.78em;
  opacity: 0.85;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.16);
  color: inherit;
  transition: opacity 120ms ease, background 120ms ease;
}

.bingoals-root .bingo-memory-action-btn:hover,
.bingoals-root label.bingo-memory-action-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.12);
}
```

- [ ] **Step 3: Update `bingo-memories-play` rule near line 892**

Find:

```css
.bingoals-root .memories-actions .bingo-memories-play {
```

Read the full rule. If it has dark bg / dark fg / low contrast, replace it. If it already uses readable colors, leave it. To be safe, append AFTER its existing rule (whether kept or replaced) the following normalized version:

```css
.bingoals-root .bingo-memories-play {
  opacity: 0.85;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.16);
  color: inherit;
  transition: opacity 120ms ease, background 120ms ease;
}
.bingoals-root .bingo-memories-play:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.12);
}
.bingoals-root .bingo-memories-play:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  background: rgba(255, 255, 255, 0.03);
}
```

Place this block immediately AFTER any pre-existing `.memories-actions .bingo-memories-play` rule. The unscoped selector has lower specificity but later position, so it wins ties.

- [ ] **Step 4: Verify visually + no parse errors**

```bash
wc -l src/styles/bingoals.css
```

Expected: file size approximately unchanged (replacement, not append). No CSS lint errors (project uses no CSS linter).

- [ ] **Step 5: Commit**

```bash
git add src/styles/bingoals.css
git commit -m "fix(bingoals): black-on-black contrast on memory action + mark-done buttons

Drop the .panel ancestor restriction so rules apply inside subFullCard
and the upcoming memStrip. Bump opacity 0.55/0.65 -> 0.85. Add explicit
neutral palette (rgba whites) so buttons stay readable regardless of theme."
```

---

### Task 3: New memStrip + lightbox CSS

**Files:**
- Modify: `src/styles/bingoals.css` — append at end of file

- [ ] **Step 1: Append all memStrip + lightbox CSS**

Append to the end of `src/styles/bingoals.css`:

```css

/* ════════════════════════════════════════════════════════════════
   MEMORIES VIEW — per-subobjective horizontal strips of memory cards
   ════════════════════════════════════════════════════════════════ */

/* When listView==='memories', list column claims full width;
   memoriesCol hidden (strips already show memories). */
.bingoals-root .objPage-layout--memories .objPage-listCol {
  flex: 1 1 auto !important;
  width: 100%;
  min-width: 0;
}
.bingoals-root .objPage-layout--memories .objPage-memoriesCol { display: none !important; }

/* ── Strip container ── */

.bingoals-root .memStrip {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  margin-bottom: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.025);
  transition: border-color 150ms ease, opacity 200ms ease;
  min-width: 0;
}

.bingoals-root .memStrip:hover { border-color: rgba(255, 255, 255, 0.16); }

.bingoals-root .memStrip--done { opacity: 0.55; }
.bingoals-root .memStrip--done:hover { opacity: 0.8; }

.bingoals-root .memStrip--running {
  border-color: var(--danger, #e53935);
  box-shadow: 0 0 0 1px var(--danger, #e53935), 0 0 28px -10px var(--danger, #e53935);
}

.bingoals-root .memStrip--active {
  border-left: 3px solid var(--primary);
  padding-left: 10px;
}

@media (min-width: 720px) {
  .bingoals-root .memStrip {
    flex-direction: row;
    align-items: stretch;
    gap: 14px;
    padding: 14px;
  }
}

/* ── Strip header (left region) ── */

.bingoals-root .memStrip-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  flex-shrink: 0;
}

@media (min-width: 720px) {
  .bingoals-root .memStrip-header { width: 240px; }
}

@media (min-width: 1400px) {
  .bingoals-root .memStrip-header { width: 280px; }
}

.bingoals-root .memStrip-headerTop {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.bingoals-root .memStrip-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.2);
}
.bingoals-root .memStrip-dot--done { background: var(--success, #4caf50); }
.bingoals-root .memStrip-dot--active { background: var(--primary); }
.bingoals-root .memStrip-dot--running {
  background: var(--danger, #e53935);
  animation: subDotPulse 1s ease-in-out infinite;
}

.bingoals-root .memStrip-title {
  flex: 1;
  min-width: 0;
  font-size: 0.85rem;
  font-weight: 800;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  color: inherit;
  opacity: 0.95;
}

.bingoals-root .memStrip-progress {
  font-size: 0.7rem;
  font-variant-numeric: tabular-nums;
  opacity: 0.5;
  white-space: nowrap;
}

.bingoals-root .memStrip-headerActions {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}

.bingoals-root .memStrip-startBtn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 0.78rem;
  font-weight: 700;
  border-radius: 6px;
  cursor: pointer;
  background: var(--primary);
  color: #fff;
  border: 1px solid transparent;
}
.bingoals-root .memStrip-startBtn--stop {
  background: var(--danger, #e53935);
}

.bingoals-root .memStrip-headerLinks {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

/* ── Track (right region) — horizontal scroll ── */

.bingoals-root .memStrip-track {
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  position: relative;
}
.bingoals-root .memStrip-track::-webkit-scrollbar { display: none; }

.bingoals-root .memStrip-trackInner {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  padding: 2px;
  align-items: stretch;
}

/* Right-edge fade gradient hint when content overflows */
.bingoals-root .memStrip-track::after {
  content: '';
  position: sticky;
  right: 0;
  top: 0;
  bottom: 0;
  width: 30px;
  pointer-events: none;
  background: linear-gradient(to right, transparent, rgba(0, 0, 0, 0.35));
}

/* ── Memory card base ── */

.bingoals-root .memStrip-card {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: transform 120ms ease, box-shadow 120ms ease;
}

@media (min-width: 720px) {
  .bingoals-root .memStrip-card { width: 140px; height: 140px; }
}

@media (min-width: 1400px) {
  .bingoals-root .memStrip-card { width: 160px; height: 160px; }
}

.bingoals-root .memStrip-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.3);
}

.bingoals-root .memStrip-card--image {
  background-size: cover;
  background-position: center;
}

.bingoals-root .memStrip-card--quote {
  display: flex;
  align-items: flex-start;
  padding: 10px;
  font-style: italic;
  font-size: 0.78rem;
  line-height: 1.35;
  color: #fff;
}

.bingoals-root .memStrip-quoteMark {
  position: absolute;
  top: -8px;
  left: 4px;
  font-size: 3.5rem;
  opacity: 0.18;
  font-family: Georgia, serif;
  line-height: 1;
  pointer-events: none;
}

.bingoals-root .memStrip-quoteText {
  position: relative;
  z-index: 1;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.bingoals-root .memStrip-card--quote.memStrip-card--expanded {
  height: auto;
  min-height: 120px;
}

.bingoals-root .memStrip-card--quote.memStrip-card--expanded .memStrip-quoteText {
  -webkit-line-clamp: unset;
  overflow: visible;
}

.bingoals-root .memStrip-cardDelete {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.65);
  border: none;
  color: #fff;
  font-size: 0.7rem;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  transition: opacity 100ms ease;
  z-index: 4;
}

.bingoals-root .memStrip-card:hover .memStrip-cardDelete { opacity: 0.85; }
.bingoals-root .memStrip-cardDelete:hover { opacity: 1 !important; background: var(--danger, #e53935); }

/* Placeholder + add-picker cards */
.bingoals-root .memStrip-card--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 0.72rem;
  font-weight: 600;
  background: transparent;
  border: 1px dashed rgba(255, 255, 255, 0.18);
  color: inherit;
  opacity: 0.55;
  padding: 8px;
  cursor: pointer;
  transition: opacity 100ms ease, border-color 100ms ease, background 100ms ease;
}
.bingoals-root .memStrip-card--placeholder:hover {
  opacity: 0.95;
  border-color: rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.04);
}

.bingoals-root .memStrip-card--addTrigger {
  font-size: 1.6rem;
  font-weight: 300;
}

/* + add picker popover */
.bingoals-root .memStrip-addPicker {
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  width: 130px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  background: rgba(20, 20, 30, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  z-index: 5;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.4);
}

.bingoals-root .memStrip-addPickerBtn {
  padding: 6px 10px;
  font-size: 0.74rem;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: inherit;
  border-radius: 5px;
  cursor: pointer;
  text-align: left;
}
.bingoals-root .memStrip-addPickerBtn:hover { background: rgba(255, 255, 255, 0.14); }

/* Hidden file input attached to each strip */
.bingoals-root .memStrip-fileInput {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

/* ── Lightbox ── */

.bingoals-root .memLightbox {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.88);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  cursor: zoom-out;
}

.bingoals-root .memLightbox-image {
  max-width: 95vw;
  max-height: 95vh;
  object-fit: contain;
  user-select: none;
  cursor: default;
}

.bingoals-root .memLightbox-close,
.bingoals-root .memLightbox-delete {
  position: absolute;
  top: 16px;
  padding: 8px 14px;
  font-size: 0.85rem;
  font-weight: 700;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #fff;
  cursor: pointer;
}
.bingoals-root .memLightbox-close { right: 16px; }
.bingoals-root .memLightbox-delete {
  left: 16px;
  background: rgba(229, 57, 53, 0.25);
  border-color: rgba(229, 57, 53, 0.6);
}
.bingoals-root .memLightbox-close:hover { background: rgba(255, 255, 255, 0.18); }
.bingoals-root .memLightbox-delete:hover { background: rgba(229, 57, 53, 0.4); }
```

- [ ] **Step 2: Verify file grew**

```bash
wc -l src/styles/bingoals.css
```

Expected: significantly more lines than before.

- [ ] **Step 3: Commit**

```bash
git add src/styles/bingoals.css
git commit -m "feat(bingoals): add memStrip + memLightbox CSS for memories view"
```

---

### Task 4: MemoryLightbox component

**Files:**
- Modify: `src/pages/bingoals/BingoObjectivePage.tsx`

`MemoryLightbox` is a self-contained full-screen image viewer with delete + close. It renders nothing when `image` prop is null.

- [ ] **Step 1: Add component near other modal components**

Read `src/pages/bingoals/BingoObjectivePage.tsx` to find the existing `AddLinkModal` function. Insert immediately AFTER its closing `}`:

```tsx
function MemoryLightbox(props: {
  image: { id: string; data: string } | null
  onClose: () => void
  onDelete: () => Promise<void>
}) {
  const { image, onClose, onDelete } = props
  const { t } = useTranslation()
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!image) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [image, onClose])

  useEffect(() => {
    if (!image) setConfirmDelete(false)
  }, [image])

  if (!image) return null

  return (
    <div className="memLightbox" onClick={onClose}>
      <img
        className="memLightbox-image"
        src={image.data}
        alt=""
        onClick={(e) => e.stopPropagation()}
      />
      <button
        className="memLightbox-close"
        onClick={(e) => { e.stopPropagation(); onClose() }}
        aria-label={t('bingoals.close') || 'Close'}
      >×</button>
      <button
        className="memLightbox-delete"
        onClick={async (e) => {
          e.stopPropagation()
          if (!confirmDelete) { setConfirmDelete(true); return }
          await onDelete()
          onClose()
        }}
      >
        {confirmDelete ? (t('bingoals.yes_delete') || 'Confirm delete') : (t('bingoals.delete') || 'Delete')}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd /home/html5ishard/.gemini/antigravity/scratch/study-buddy-electron
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors. `useEffect` is already imported in the file.

- [ ] **Step 3: Commit**

```bash
git add src/pages/bingoals/BingoObjectivePage.tsx
git commit -m "feat(bingoals): add MemoryLightbox component"
```

---

### Task 5: SubobjectiveMemoryStrip — skeleton + header

**Files:**
- Modify: `src/pages/bingoals/BingoObjectivePage.tsx`

`SubobjectiveMemoryStrip` is a new component. This task adds the skeleton plus the header (left) region with: status dot, title, progress, START/STOP button, Mark Done button, link chips + `+ link` button. Memory cards come in Task 6. Placeholders + picker come in Task 7.

Insert AFTER `SubobjectiveTile` and BEFORE `SubobjectiveTimerPanel`. (This keeps the file grouped: compact-row would have been first, but we are deleting it later; tile is the smallest list element; strip is bigger than tile but smaller than the timer machinery.)

- [ ] **Step 1: Add the component**

Read the file to find the closing `}` of `SubobjectiveTile`. Insert AFTER it:

```tsx
const SubobjectiveMemoryStrip = memo(function SubobjectiveMemoryStrip(props: {
  s: Subobjective
  subs: Subobjective[]
  setSubs: React.Dispatch<React.SetStateAction<Subobjective[]>>
  timeStats: { total_ms: number; last_end: number | null }
  running: { subId: string; startedAt: number } | null
  setRunning: React.Dispatch<React.SetStateAction<{ subId: string; startedAt: number } | null>>
  stopTimerIfRunning: () => Promise<void>
  subMedia: MediaItem[]
  activeSubId: string | null
  setActiveSubId: (id: string | null) => void
  reload: () => Promise<void>
  onAddLink: () => void
}) {
  const {
    s, subs, setSubs, running, setRunning, stopTimerIfRunning,
    subMedia, activeSubId, setActiveSubId, reload, onAddLink,
  } = props
  const { t } = useTranslation()

  const { autoDone, hasTarget } = computeAutoDone(s)
  const isDone = autoDone || (!hasTarget && !!s.is_done)
  const isActive = activeSubId === s.id
  const isRunning = running?.subId === s.id

  const links = subMedia
    .filter(m => m.kind === 'link')
    .map(item => {
      try { return { item, parsed: JSON.parse(item.data) as { url: string; label: string } } }
      catch { return { item, parsed: { url: item.data, label: '' } } }
    })

  const stripClass = [
    'memStrip',
    isDone && 'memStrip--done',
    isRunning && 'memStrip--running',
    isActive && 'memStrip--active',
  ].filter(Boolean).join(' ')

  const dotClass = [
    'memStrip-dot',
    isRunning ? 'memStrip-dot--running' : isDone ? 'memStrip-dot--done' : isActive ? 'memStrip-dot--active' : '',
  ].filter(Boolean).join(' ')

  const progressText = (s.target_total ?? 0) > 0
    ? `${s.progress_current ?? 0} / ${s.target_total ?? 0}${s.unit ? ' ' + s.unit : ''}`
    : isDone ? '✓' : '—'

  const onToggleDone = async () => {
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
  }

  return (
    <div className={stripClass}>
      <div className="memStrip-header">
        <div className="memStrip-headerTop">
          <span className={dotClass} aria-hidden="true" />
          <span
            className="memStrip-title"
            onClick={() => setActiveSubId(s.id)}
            role="button"
            tabIndex={0}
            aria-label={t('bingoals.sub_title_aria')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveSubId(s.id) }}
          >
            {s.title}
          </span>
          <span className="memStrip-progress">{progressText}</span>
        </div>
        <div className="memStrip-headerActions">
          {isRunning ? (
            <button
              className="memStrip-startBtn memStrip-startBtn--stop"
              onClick={() => { playSFX(SFX.CANCEL); stopTimerIfRunning() }}
              onMouseEnter={() => playSFX(SFX.HOVER)}
            >
              <span className="bingo-stop-square" aria-hidden="true" />
              {t('bingoals.stop')}
            </button>
          ) : (
            <button
              className="memStrip-startBtn"
              onClick={async () => {
                playSFX(SFX.SESSION_START)
                await stopTimerIfRunning()
                setRunning({ subId: s.id, startedAt: Date.now() })
              }}
              onMouseEnter={() => playSFX(SFX.HOVER)}
            >
              <span className="bingo-rec-dot" aria-hidden="true" />
              {t('bingoals.start')}
            </button>
          )}
          <button className="btn bingo-mark-done-btn" onClick={onToggleDone}>
            {isDone ? t('bingoals.undone') : t('bingoals.done')}
          </button>
        </div>
        {(links.length > 0 || true) && (
          <div className="memStrip-headerLinks">
            {links.map(({ item, parsed }) => (
              <button
                key={item.id}
                className="subCompactChip"
                onClick={() => openExternal(parsed.url)}
                title={parsed.url}
              >
                <ExternalLink size={10} />
                {parsed.label || parsed.url}
              </button>
            ))}
            <button
              className="subCompactAddLink"
              onClick={onAddLink}
              title={t('bingoals.add_link')}
              aria-label={t('bingoals.add_link')}
              style={{ opacity: 0.7 }}
            >+ link</button>
          </div>
        )}
      </div>
      <div className="memStrip-track">
        <div className="memStrip-trackInner">
          {/* Memory cards added in Task 6 + placeholders/picker in Task 7 */}
        </div>
      </div>
    </div>
  )
}, (prev, next) =>
  prev.s === next.s
  && prev.subMedia === next.subMedia
  && prev.running === next.running
  && prev.activeSubId === next.activeSubId
)
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors. `memo`, `useState`, `useTranslation`, `playSFX`, `SFX`, `computeAutoDone`, `updateSubobjective`, `ExternalLink`, `openExternal` are all already imported. `MediaItem` and `Subobjective` types are in scope. The `(links.length > 0 || true)` is intentional so the `+ link` button stays visible even when no links yet — this matches the spec (header always shows the `+ link` action).

- [ ] **Step 3: Commit**

```bash
git add src/pages/bingoals/BingoObjectivePage.tsx
git commit -m "feat(bingoals): add SubobjectiveMemoryStrip skeleton + header"
```

---

### Task 6: SubobjectiveMemoryStrip — memory cards (image + quote)

**Files:**
- Modify: `src/pages/bingoals/BingoObjectivePage.tsx`

Render image and quote cards inside `memStrip-trackInner`. Image cards open the lightbox. Quote cards toggle expand/collapse. Both have hover-delete `×`.

This requires `MemoryLightbox` to be wired at the strip level via local state — the strip owns the open-lightbox state for its own images.

- [ ] **Step 1: Add lightbox state + image/quote rendering**

In `SubobjectiveMemoryStrip`, modify the component to add lightbox state at the top:

Find this line inside the component (added in Task 5):
```tsx
  const { autoDone, hasTarget } = computeAutoDone(s)
```

Insert immediately BEFORE it:
```tsx
  const [lightboxImageId, setLightboxImageId] = useState<string | null>(null)
  const [expandedQuoteId, setExpandedQuoteId] = useState<string | null>(null)
```

Find this near the bottom of the component (added in Task 5):
```tsx
      <div className="memStrip-track">
        <div className="memStrip-trackInner">
          {/* Memory cards added in Task 6 + placeholders/picker in Task 7 */}
        </div>
      </div>
```

Replace the `<div className="memStrip-trackInner">` block with:

```tsx
      <div className="memStrip-track">
        <div className="memStrip-trackInner">
          {subMedia
            .filter(m => m.kind === 'image' || m.kind === 'quote')
            .map(item => {
              if (item.kind === 'image') {
                return (
                  <div
                    key={item.id}
                    className="memStrip-card memStrip-card--image"
                    style={{ backgroundImage: `url(${item.data})` }}
                    onClick={() => setLightboxImageId(item.id)}
                    role="button"
                    tabIndex={0}
                    aria-label={t('bingoals.memory_image_aria') || 'Image'}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setLightboxImageId(item.id) }}
                  >
                    <button
                      className="memStrip-cardDelete"
                      onClick={async (e) => {
                        e.stopPropagation()
                        await deleteMediaItem(item.id)
                        await reload()
                      }}
                      aria-label={t('bingoals.delete')}
                    >×</button>
                  </div>
                )
              }
              const expanded = expandedQuoteId === item.id
              const hue = titleToHue(s.title)
              return (
                <div
                  key={item.id}
                  className={`memStrip-card memStrip-card--quote ${expanded ? 'memStrip-card--expanded' : ''}`}
                  style={{ background: `hsl(${hue}, 35%, 22%)` }}
                  onClick={() => setExpandedQuoteId(expanded ? null : item.id)}
                  role="button"
                  tabIndex={0}
                  aria-label={t('bingoals.memory_quote_aria') || 'Quote'}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpandedQuoteId(expanded ? null : item.id) }}
                >
                  <span className="memStrip-quoteMark" aria-hidden="true">“</span>
                  <span className="memStrip-quoteText">{item.data}</span>
                  <button
                    className="memStrip-cardDelete"
                    onClick={async (e) => {
                      e.stopPropagation()
                      await deleteMediaItem(item.id)
                      await reload()
                    }}
                    aria-label={t('bingoals.delete')}
                  >×</button>
                </div>
              )
            })}
        </div>
      </div>
```

- [ ] **Step 2: Render `MemoryLightbox` at the end of the strip (just before the strip's closing `</div>`)**

Find the closing `</div>` of the strip — the last `</div>` before `)\n}, (prev, next) =>` of the memo wrapper. Insert immediately BEFORE it:

```tsx
      <MemoryLightbox
        image={(() => {
          if (!lightboxImageId) return null
          const found = subMedia.find(m => m.id === lightboxImageId && m.kind === 'image')
          return found ? { id: found.id, data: found.data } : null
        })()}
        onClose={() => setLightboxImageId(null)}
        onDelete={async () => {
          if (!lightboxImageId) return
          await deleteMediaItem(lightboxImageId)
          await reload()
        }}
      />
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors. `titleToHue` and `deleteMediaItem` already imported.

- [ ] **Step 4: Commit**

```bash
git add src/pages/bingoals/BingoObjectivePage.tsx
git commit -m "feat(bingoals): render image + quote cards inside SubobjectiveMemoryStrip"
```

---

### Task 7: Empty placeholders + trailing add picker

**Files:**
- Modify: `src/pages/bingoals/BingoObjectivePage.tsx`

When the strip has zero image AND zero quote items, render three dashed placeholder cards at the start of the track (`+ image`, `+ quote`, `+ link`). Otherwise render a single trailing `+` card at the end that opens a small picker with the same three options.

Each strip owns a hidden file input + an `AddQuoteModal` instance for adding new memories.

- [ ] **Step 1: Add picker + quote modal state + file input ref**

In `SubobjectiveMemoryStrip`, add to the state block (already has `lightboxImageId`, `expandedQuoteId` from Task 6):

```tsx
  const [pickerOpen, setPickerOpen] = useState(false)
  const [quoteOpen, setQuoteOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
```

And insert these helper handlers just before the `return (` of the component:

```tsx
  const triggerImageUpload = () => {
    setPickerOpen(false)
    fileInputRef.current?.click()
  }
  const triggerAddQuote = () => {
    setPickerOpen(false)
    setQuoteOpen(true)
  }
  const triggerAddLink = () => {
    setPickerOpen(false)
    onAddLink()
  }
  const hasMemories = subMedia.some(m => m.kind === 'image' || m.kind === 'quote')
```

- [ ] **Step 2: Render placeholders or trailing add card inside the track**

Find this code (added in Task 6 inside the `memStrip-trackInner` block):

```tsx
        <div className="memStrip-trackInner">
          {subMedia
            .filter(m => m.kind === 'image' || m.kind === 'quote')
            .map(item => {
              if (item.kind === 'image') {
```

We want to also render placeholders / trailing card. Find the closing `})}` and the `</div>` that closes `memStrip-trackInner`:

```tsx
              )
            })}
        </div>
```

Replace that closing fragment (the `})}` plus the closing `</div>` of the trackInner) with:

```tsx
              )
            })}
          {!hasMemories ? (
            <>
              <button
                className="memStrip-card memStrip-card--placeholder"
                onClick={triggerImageUpload}
                aria-label={t('bingoals.add_images')}
              >+ image</button>
              <button
                className="memStrip-card memStrip-card--placeholder"
                onClick={triggerAddQuote}
                aria-label={t('bingoals.add_quote')}
              >+ quote</button>
              <button
                className="memStrip-card memStrip-card--placeholder"
                onClick={triggerAddLink}
                aria-label={t('bingoals.add_link')}
              >+ link</button>
            </>
          ) : (
            <div className="memStrip-card memStrip-card--placeholder memStrip-card--addTrigger" style={{ position: 'relative' }}>
              <button
                onClick={() => setPickerOpen(o => !o)}
                style={{ all: 'unset', cursor: 'pointer', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem' }}
                aria-label={t('bingoals.add')}
              >+</button>
              {pickerOpen && (
                <div className="memStrip-addPicker" onClick={(e) => e.stopPropagation()}>
                  <button className="memStrip-addPickerBtn" onClick={triggerImageUpload}>+ image</button>
                  <button className="memStrip-addPickerBtn" onClick={triggerAddQuote}>+ quote</button>
                  <button className="memStrip-addPickerBtn" onClick={triggerAddLink}>+ link</button>
                </div>
              )}
            </div>
          )}
        </div>
```

- [ ] **Step 3: Add the hidden file input and AddQuoteModal at the end of the strip**

Find the `<MemoryLightbox` block added in Task 6 — at the bottom of the strip JSX, just before the closing `</div>` of `.memStrip`. Insert BEFORE the `<MemoryLightbox`:

```tsx
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="memStrip-fileInput"
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
      <AddQuoteModal
        open={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        onAdd={async (quote) => { setQuoteOpen(false); await addQuote(s.id, quote); await reload() }}
      />
```

- [ ] **Step 4: Add `useRef` import if not already present**

Check the top of the file. If `useRef` is not in the React import line, add it. (It's likely already there or `React.useRef` works via the `React` import. Use whichever the file already uses.)

```bash
grep "^import React\|useRef" src/pages/bingoals/BingoObjectivePage.tsx | head -3
```

If `useRef` is missing from the named imports, add it. E.g. change `import { useState, useMemo, useEffect } from "react"` to `import { useState, useMemo, useEffect, useRef } from "react"`.

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors. `fileToCompressedDataUrl`, `addImage`, `addQuote`, `AddQuoteModal` already in scope.

- [ ] **Step 6: Commit**

```bash
git add src/pages/bingoals/BingoObjectivePage.tsx
git commit -m "feat(bingoals): memStrip placeholders + trailing add picker + file input + quote modal"
```

---

### Task 8: Wire memories view into BingoObjectivePage

**Files:**
- Modify: `src/pages/bingoals/BingoObjectivePage.tsx`

Update `listView` type to `'memories' | 'grid' | 'full'`, migrate `'compact'` reads to `'memories'`, swap the toggle, sort subs for memories view, dispatch render based on view, add `objPage-layout--memories` class.

- [ ] **Step 1: Update imports**

Find the existing imports at the top of `src/pages/bingoals/BingoObjectivePage.tsx`. Add `sortStripsForMemoriesView`:

```tsx
import { sortStripsForMemoriesView } from "../../lib/bingoals/sortStrips";
```

Place it next to other `../../lib/bingoals/*` imports.

- [ ] **Step 2: Update `listView` state type and initializer**

Find:

```tsx
  const [listView, setListView] = useState<'compact' | 'grid' | 'full'>(() =>
    (localStorage.getItem('bingoals.listView') as 'compact' | 'grid' | 'full') ?? 'compact'
  )
```

Replace with:

```tsx
  const [listView, setListView] = useState<'memories' | 'grid' | 'full'>(() => {
    const raw = localStorage.getItem('bingoals.listView')
    if (raw === 'grid' || raw === 'full' || raw === 'memories') return raw
    return 'memories'  // also covers legacy 'compact'
  })
```

- [ ] **Step 3: Sort subs for memories view via useMemo**

Find this block (where percent/totalMs/lastStudiedTs are computed):

```tsx
  const totalMs = useMemo(() => computeTotalMs(timeMap), [timeMap])
  const lastStudiedTs = useMemo(() => computeLastStudiedTs(timeMap, subs), [timeMap, subs])
  const lastStudiedDays = daysAgo(lastStudiedTs)
```

Insert AFTER `lastStudiedDays`:

```tsx
  const sortedSubs = useMemo(() => sortStripsForMemoriesView(
    subs,
    running?.subId ?? null,
    (sub) => {
      const { autoDone, hasTarget } = computeAutoDone(sub)
      return autoDone || (!hasTarget && !!sub.is_done)
    },
  ), [subs, running])
```

- [ ] **Step 4: Update view toggle label list**

Find:

```tsx
            {(['compact', 'grid', 'full'] as const).map(v => (
```

Replace with:

```tsx
            {(['memories', 'grid', 'full'] as const).map(v => (
```

- [ ] **Step 5: Update the layout class**

Find:

```tsx
      <div className={`objPage-layout${listView === 'full' ? ' objPage-layout--full' : ''}`}>
```

Replace with:

```tsx
      <div className={`objPage-layout${listView === 'full' ? ' objPage-layout--full' : ''}${listView === 'memories' ? ' objPage-layout--memories' : ''}`}>
```

- [ ] **Step 6: Replace the compact branch with memories branch**

Find:

```tsx
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
```

Replace with:

```tsx
          {listView === 'memories' && sortedSubs.map(s => (
            <SubobjectiveMemoryStrip
              key={s.id}
              s={s}
              subs={subs}
              setSubs={setSubs}
              timeStats={timeMap.get(s.id) ?? { total_ms: 0, last_end: null }}
              running={running}
              setRunning={setRunning}
              stopTimerIfRunning={stopTimerIfRunning}
              subMedia={mediaBySub.get(s.id) ?? []}
              activeSubId={activeSubId}
              setActiveSubId={setActiveSubId}
              reload={reload}
              onAddLink={() => setPendingAddLinkSubId(s.id)}
            />
          ))}
```

- [ ] **Step 7: Type-check + tests**

```bash
npx tsc --noEmit 2>&1 | head -30
npm test 2>&1 | tail -5
```

Expected: no type errors. Tests still pass (≥ 144).

- [ ] **Step 8: Commit**

```bash
git add src/pages/bingoals/BingoObjectivePage.tsx
git commit -m "feat(bingoals): wire memories view into BingoObjectivePage

- listView union: 'memories' | 'grid' | 'full' (legacy 'compact' -> 'memories')
- Default for new users: 'memories'
- Toggle buttons updated
- sortedSubs useMemo via sortStripsForMemoriesView
- objPage-layout--memories class added when active"
```

---

### Task 9: Delete dead SubobjectiveCompactRow + dead .subCompact-row CSS

**Files:**
- Modify: `src/pages/bingoals/BingoObjectivePage.tsx`
- Modify: `src/styles/bingoals.css`

`SubobjectiveCompactRow` and its `subProgressText` helper are no longer referenced. Same for the row-only CSS rules (chip and addLink classes are still reused, so we keep those).

- [ ] **Step 1: Delete `SubobjectiveCompactRow` and `subProgressText`**

Read `src/pages/bingoals/BingoObjectivePage.tsx`. Find:
- `function subProgressText(s: Subobjective): string { ... }` — entire function
- `function SubobjectiveCompactRow(props: { ... }) { ... }` — entire function

Both live after `AddLinkModal` (before `MemoryLightbox` from Task 4 and `SubobjectiveTile`). Delete both function definitions in full.

Run `grep -n "SubobjectiveCompactRow\|subProgressText" src/pages/bingoals/BingoObjectivePage.tsx` to verify no remaining references after deletion. Expected: zero output.

- [ ] **Step 2: Delete dead `.subCompactRow` CSS rules — KEEP `.subCompactChip` and `.subCompactAddLink`**

Read `src/styles/bingoals.css` around lines 2173–2280 (the `── Compact row ──` section). The rules to **delete**:

```css
.bingoals-root .subCompactRow { … }
.bingoals-root .subCompactRow:hover { … }
.bingoals-root .subCompactRow--active { … }
.bingoals-root .subCompactRow--done { … }
.bingoals-root .subCompactDot { … }
.bingoals-root .subCompactDot--done { … }
.bingoals-root .subCompactDot--active { … }
.bingoals-root .subCompactDot--running { … }
.bingoals-root .subCompactTitle { … }
.bingoals-root .subCompactRow--done .subCompactTitle { … }
.bingoals-root .subCompactLinks { … }
.bingoals-root .subCompactLinks::-webkit-scrollbar { … }
.bingoals-root .subCompactProgress { … }
.bingoals-root .subCompactRow:hover .subCompactAddLink { … }
```

Rules to **KEEP** (reused by `memStrip-headerLinks` and `subFullCard-links`):
- `.bingoals-root .subCompactChip { ... }` and `:hover`
- `.bingoals-root .subCompactAddLink { ... }` and `:hover` (the base rule without the parent-hover wrapper)

`@keyframes subDotPulse` is still used by `memStrip-dot--running` — keep it.

Use `Edit` tool with care: delete one block at a time, verify, move on. Better: use `Read` to copy the current block, then `Edit` with `old_string` matching exactly and `new_string` empty (or replacement keeping only the kept rules).

A safe one-shot approach — replace the entire block from `/* ── Compact row ── */` through the last `subCompactProgress` rule with just the kept rules. First read lines 2170–2290 to capture the exact current text, then `Edit` with:

`old_string`: that whole block including the comment header
`new_string`:
```css
/* ── Link chip + add-link button (reused by memStrip + subFullCard) ── */

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
  border-radius: 4px;
  border: 1px dashed rgba(255,255,255,0.2);
  background: transparent;
  color: inherit;
  cursor: pointer;
  flex-shrink: 0;
  transition: opacity 100ms ease;
  opacity: 0.7;
}

.bingoals-root .subCompactAddLink:hover { opacity: 1; }
```

(Verify the current rule values for `.subCompactChip` and `.subCompactAddLink` match these before pasting — if they differ, use the current values.)

- [ ] **Step 3: Type-check + tests**

```bash
npx tsc --noEmit 2>&1 | head -20
npm test 2>&1 | tail -5
```

Expected: no errors. 144+ tests passing.

- [ ] **Step 4: Commit**

```bash
git add src/pages/bingoals/BingoObjectivePage.tsx src/styles/bingoals.css
git commit -m "chore(bingoals): delete dead SubobjectiveCompactRow + row-only CSS

Keeps .subCompactChip and .subCompactAddLink — reused by memStrip header
and subFullCard. Deletes the row layout rules and the helper function."
```

---

### Task 10: Final type-check + manual smoke + tests

**Files:** None changed.

- [ ] **Step 1: Full type-check**

```bash
cd /home/html5ishard/.gemini/antigravity/scratch/study-buddy-electron
npx tsc --noEmit 2>&1
```

Expected: zero errors.

- [ ] **Step 2: Full test suite**

```bash
npm test 2>&1 | tail -15
```

Expected: ≥ 144 tests passing (138 pre-existing + 6 new from Task 1).

- [ ] **Step 3: Manual smoke test**

Run `npm run dev`. Open Bingoals → any objective with subobjectives.

Verify:
- [ ] Memories view loads by default (or if previous `compact` was saved, it loads as memories)
- [ ] Each subobjective renders as a strip with header + horizontal memory track
- [ ] Running sub (when timer active) floats to top with red border glow
- [ ] Done subs sink to bottom at 55% opacity
- [ ] Click strip title → active panel shows that sub (right column on mid/wide, overlay on narrow); active strip gets primary-color left border
- [ ] Click image card → lightbox opens fullscreen; click outside or `×` → closes; ESC closes
- [ ] Click quote card → expands inline; click again → collapses
- [ ] Hover over image/quote → small `×` delete button appears; click `×` → confirms and deletes
- [ ] Empty sub (no images/quotes) → track shows 3 dashed placeholders (`+ image`, `+ quote`, `+ link`); each opens its respective add UI
- [ ] Non-empty sub → trailing `+` card at end of track; click → 3-option picker pops up
- [ ] Header `[● START]` button → starts timer (becomes `[■ STOP]`); START on a different sub stops the running one
- [ ] Header `[Mark Done]` → toggles done; sub gets done styling
- [ ] Header link chips → `openExternal` on click; `+ link` button → opens AddLinkModal for that sub
- [ ] Switch view to `grid` → grid renders, no console errors
- [ ] Switch view to `full` → full cards render
- [ ] Switch back to `memories` → strips render
- [ ] Buttons `Marquer terminé`, `+ Citation`, `+ Lien`, `Lire` all readable on every theme (cycle through a few via settings)
- [ ] Narrow viewport (< 720px) → strip stacks: header on top, memory track below scrolls horizontal
- [ ] Mid (720–1400px) → strip is row, header 240px left
- [ ] Wide / 4K (≥ 1400px) → strip is row, header 280px; the 3rd `objPage-memoriesCol` is hidden (no duplicate memories column on the right of the active panel)
- [ ] Reload page → view persists

- [ ] **Step 4: Commit any fixes**

If manual testing surfaced any issues, fix them and commit:

```bash
git add -p
git commit -m "fix(bingoals): polish memories view from manual testing"
```

Otherwise no commit needed.
