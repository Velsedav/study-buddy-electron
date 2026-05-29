# Page Header Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the redundant `.page-header` (icon + h1 title) block from `Learning`, `BingoDashboard`, `MetacognitionLogs`, and `Settings` so the sidebar stays the single source of "where am I" context.

**Architecture:** Pure structural deletion in 4 page files. One adjacent change in `BingoDashboard` — the year-nav widget lives inside `.page-header` today, so it gets rehoused in a new lightweight `.bingo-toolbar` wrapper. One small CSS rule added to `src/styles/bingoals.css`. Global `.page-header` rules in `src/index.css` stay (still used by Home, Analytics, Dev, Plan, ObsidianPlanner, BingoObjectivePage). No tests touched.

**Tech Stack:** React 19, TypeScript, electron-vite, CSS custom properties

---

## File Map

| File | Change |
|---|---|
| `src/pages/Learning.tsx` | Delete `.page-header` block. Keep `Sparkles` import (used at line 932). |
| `src/pages/MetacognitionLogs.tsx` | Delete `.page-header.metacognition-logs-header` block. Keep `Wrench` import (used in empty state). |
| `src/pages/Settings.tsx` | Delete `.page-header` block. Remove `Settings as SettingsIcon` alias from imports — only consumed by the deleted block. |
| `src/pages/bingoals/BingoDashboard.tsx` | Replace `.page-header` block with `.bingo-toolbar` that holds only the existing `.bingo-year-nav`. Remove `Target` import — only consumed by the deleted block. |
| `src/styles/bingoals.css` | Append `.bingo-toolbar` rule. |

---

### Task 1: Learning page

**Files:**
- Modify: `src/pages/Learning.tsx`

- [ ] **Step 1: Delete the page-header block**

In `src/pages/Learning.tsx`, find this exact block (around lines 1041–1046):

```tsx
            <div className="page-header">
                <div className="page-title-group">
                    <div className="icon-wrapper bg-accent"><Sparkles size={20} /></div>
                    <h1>Learning Center</h1>
                </div>
            </div>
```

Delete the block in full. The `<div className="learning-tab">` immediately below becomes the first child of `<div className={`learning-page ...`}>`.

Do NOT remove `Sparkles` from the lucide import — it's still used at line 932 in the Concept Check label.

- [ ] **Step 2: Type-check**

```bash
cd /home/html5ishard/.gemini/antigravity/scratch/study-buddy-electron
npx tsc --noEmit 2>&1 | head -10
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Learning.tsx
git commit -m "chore(learning): remove redundant page-header title block

Sidebar already shows the active page. Drops vertical real estate
without losing any controls."
```

---

### Task 2: Metacognition Logs page

**Files:**
- Modify: `src/pages/MetacognitionLogs.tsx`

- [ ] **Step 1: Delete the page-header block**

In `src/pages/MetacognitionLogs.tsx`, find this exact block (around lines 69–74):

```tsx
            <div className="page-header metacognition-logs-header">
                <div className="page-title-group">
                    <div className="icon-wrapper bg-orange"><Wrench size={20} /></div>
                    <h1>{t('nav.metacognition_logs')}</h1>
                </div>
            </div>
```

Delete the block in full. The `<div className="metacognition-logs-content">` immediately below becomes the first child of the page root.

Do NOT remove `Wrench` from imports — it's still used inside the empty-state block:

```tsx
<Wrench size={48} className="text-muted empty-wrench-icon" />
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -10
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/MetacognitionLogs.tsx
git commit -m "chore(metacog-logs): remove redundant page-header title block"
```

---

### Task 3: Settings page

**Files:**
- Modify: `src/pages/Settings.tsx`

- [ ] **Step 1: Delete the page-header block**

In `src/pages/Settings.tsx`, find this exact block (around lines 256–261):

```tsx
            <div className="page-header">
                <div className="page-title-group">
                    <div className="icon-wrapper bg-orange"><SettingsIcon size={20} /></div>
                    <h1>{t('nav.settings')}</h1>
                </div>
            </div>
```

Delete the block in full. The next sibling (`{showDeleteModal && (...)}` or whatever immediately follows) becomes the first child of `<div className="settings-tab fade-in">`.

- [ ] **Step 2: Remove the `SettingsIcon` import alias**

`SettingsIcon` was only consumed by the deleted block. Verify with:

```bash
cd /home/html5ishard/.gemini/antigravity/scratch/study-buddy-electron
grep -n "SettingsIcon" src/pages/Settings.tsx
```

Expected: zero output after Step 1. If zero output, edit the lucide-react import line at the top of the file:

Find:
```tsx
import { Palette, Calendar, Keyboard, Globe, Database, AlertTriangle, Trash2, Volume2, Play, Brain, Power, Zap, Settings as SettingsIcon, FolderOpen, X } from 'lucide-react';
```

Replace with:
```tsx
import { Palette, Calendar, Keyboard, Globe, Database, AlertTriangle, Trash2, Volume2, Play, Brain, Power, Zap, FolderOpen, X } from 'lucide-react';
```

(The `Settings as SettingsIcon` alias is dropped.)

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -10
```

Expected: no errors. TypeScript's `noUnusedLocals` would flag a left-over alias; this avoids that.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Settings.tsx
git commit -m "chore(settings): remove redundant page-header title block

Drops the unused 'Settings as SettingsIcon' import alongside the
deleted block."
```

---

### Task 4: BingoDashboard page + .bingo-toolbar CSS

**Files:**
- Modify: `src/pages/bingoals/BingoDashboard.tsx`
- Modify: `src/styles/bingoals.css`

`BingoDashboard.page-header` also wraps the `.bingo-year-nav` widget. Year-nav must survive; the icon + h1 + page-header wrapper must go. A new `.bingo-toolbar` div holds the year-nav alone.

- [ ] **Step 1: Replace the page-header block with a toolbar that wraps the year-nav**

In `src/pages/bingoals/BingoDashboard.tsx`, find this exact block (around lines 132–165):

```tsx
      <div className="page-header">
          <div className="page-title-group">
            <div className="icon-wrapper bg-blue"><Target size={20} /></div>
            <h1 className="page-header-title">
              {t('bingoals.page_title')} <span className="bingo-title-year">{selectedYear}</span>
            </h1>
          </div>
          <div className="bingo-year-nav">
            {selectedYear !== CURRENT_YEAR && (
              <button
                className="btn bingo-year-return"
                onClick={() => setSelectedYear(CURRENT_YEAR)}
              >
                {t('bingoals.return_year').replace('{year}', String(CURRENT_YEAR))}
              </button>
            )}
            <button
              className="btn btn-icon bingo-year-btn"
              aria-label={t('bingoals.prev_year')}
              onClick={() => setSelectedYear(y => y - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="bingo-year-label">{selectedYear}</span>
            <button
              className="btn btn-icon bingo-year-btn"
              aria-label={t('bingoals.next_year')}
              disabled={selectedYear >= CURRENT_YEAR}
              onClick={() => setSelectedYear(y => y + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
```

Replace with:

```tsx
      <div className="bingo-toolbar">
          <div className="bingo-year-nav">
            {selectedYear !== CURRENT_YEAR && (
              <button
                className="btn bingo-year-return"
                onClick={() => setSelectedYear(CURRENT_YEAR)}
              >
                {t('bingoals.return_year').replace('{year}', String(CURRENT_YEAR))}
              </button>
            )}
            <button
              className="btn btn-icon bingo-year-btn"
              aria-label={t('bingoals.prev_year')}
              onClick={() => setSelectedYear(y => y - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="bingo-year-label">{selectedYear}</span>
            <button
              className="btn btn-icon bingo-year-btn"
              aria-label={t('bingoals.next_year')}
              disabled={selectedYear >= CURRENT_YEAR}
              onClick={() => setSelectedYear(y => y + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
```

The page-title-group (icon + h1) is gone. The `.bingo-year-nav` block is preserved verbatim. The wrapper class changes from `page-header` to `bingo-toolbar`.

- [ ] **Step 2: Remove the `Target` import**

`Target` was only consumed by the deleted icon-wrapper. Verify with:

```bash
grep -n "Target\b" src/pages/bingoals/BingoDashboard.tsx
```

Expected: zero output. If zero, edit the lucide-react import line at the top of the file:

Find:
```tsx
import { Target, Pencil, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
```

Replace with:
```tsx
import { Pencil, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
```

- [ ] **Step 3: Append `.bingo-toolbar` CSS**

Append to the end of `src/styles/bingoals.css`:

```css

/* ── Dashboard toolbar (replaces page-header on BingoDashboard) ── */

.bingoals-root .bingo-toolbar {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    margin-bottom: 16px;
    gap: 12px;
}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -10
```

Expected: no errors. `Target` removal would cause an error if still referenced; verified clean in Step 2.

- [ ] **Step 5: Commit**

```bash
git add src/pages/bingoals/BingoDashboard.tsx src/styles/bingoals.css
git commit -m "chore(bingoals): remove dashboard page-header, keep year-nav in toolbar

Year nav widget stays — only the icon + title row goes. New
.bingo-toolbar wrapper right-aligns the nav. Drops the now-unused
Target icon import."
```

---

### Task 5: Final type-check + tests + manual smoke

**Files:** None changed.

- [ ] **Step 1: Full type-check**

```bash
cd /home/html5ishard/.gemini/antigravity/scratch/study-buddy-electron
npx tsc --noEmit 2>&1
```

Expected: zero output (zero errors).

- [ ] **Step 2: Full test suite**

```bash
npm test 2>&1 | tail -10
```

Expected: 144/144 tests passing (no test regressions — this plan touches no logic).

- [ ] **Step 3: Manual smoke checklist**

Start `npm run dev`. Click each of the four pages in the sidebar:

- [ ] Learning Center — page content starts at the top, no broken layout, Sparkles still works on the Concept Check label inside lessons
- [ ] Metacognition Logs — page content starts at the top, empty-state Wrench icon still renders if there are no logs, month nav still works
- [ ] Settings — sections render normally, no broken hierarchy at the top, all section headers still visible
- [ ] Bingoals dashboard — year-nav still visible at the top-right (prev / current label / next, plus the "return to current year" button when applicable), grid renders below normally
- [ ] Sidebar still highlights the active page on each
- [ ] Vertical space at the top of each page is reduced compared to before

If anything is broken, fix it in a follow-up commit:

```bash
git add -p   # stage only what was actually changed
git commit -m "fix(<area>): <specific issue from smoke test>"
```

Otherwise no commit is needed.
