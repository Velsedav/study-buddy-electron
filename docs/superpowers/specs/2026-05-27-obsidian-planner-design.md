# Obsidian Planner — Design Spec

**Date:** 2026-05-27
**Theme:** `obsidian` only (other themes unchanged)
**Scope:** New `ObsidianPlanner` component + 3 view modes + 1080×2560 vertical monitor layout

---

## 1. Context & Goals

The current Planner (`Plan.tsx`) has these UX problems:
- Config happens before seeing the session (abstract repeats/template before blocks)
- Drag-and-drop adds friction (3–4 interactions per block)
- Two-column layout is cramped at 1016px usable width
- WeeklyCompass interrupts planning flow
- Start Session button buried in long toolbar
- Tall screen (2560px) completely unused

**Goals:**
- Session can be built in ≤3 clicks in the happy path
- Timeline fills the vertical space of a 1080×2560 screen
- Three views cover different working styles (quick/visual/guided)
- Start Session always reachable without scrolling

---

## 2. Architecture

Same early-return pattern as `ObsidianHome`:

```tsx
// In Plan.tsx, after all hooks:
if (theme === 'obsidian') {
    return <ObsidianPlanner />;
}
```

New files:
- `src/pages/ObsidianPlanner.tsx`
- `src/pages/ObsidianPlanner.css`

Reuses existing:
- `TechniquePickerModal` (unchanged)
- `TECHNIQUES`, `TEMPLATES` from `src/lib/techniques.ts` and Plan.tsx
- `useUndoRedo` hook
- Session start logic (same `localStorage` `activeSession` schema)
- `getSubjects`, `getSubjectTags`, `getChaptersForSubject`

---

## 3. Layout Shell

```
┌──────┬────────────────────────────────────────┐
│  64px│  [≡ Timeline] [⊞ Split] [⋮ Wizard]   [▶ Start Session]  │
│ icon │  ─────────────────────────────────────  │
│ side │  [session config strip]                 │
│ bar  │                                          │
│      │  [timeline / split / wizard content]    │
│      │                                          │
│      ├────────────────────────────────────────┤
│      │  quote bar (28px)                       │
└──────┴────────────────────────────────────────┘
```

**Top bar** (48px, fixed, `obsidian-planner-topbar`):
- Left: view toggle buttons — Timeline `≡`, Split `⊞`, Wizard `⋮` — same pill style as ObsidianHome
- Right: `[▶ Start Session]` primary button (disabled when 0 WORK blocks, or all WORK blocks empty)
- View persisted to `localStorage` key `obsidian-planner-view`, default `'timeline'`

**Session config strip** (72px, not scrollable, `obsidian-planner-config`):
- Shape presets: `[25/5]` `[50/10]` `[90/15]` `[Custom]` — horizontal pills, active state highlighted
- Repeats stepper: `[−] 2 [+]`
- Live summary: `"2h 10m · ends 16:30"` (JetBrains Mono)
- Undo/redo icon buttons (Ctrl+Z / Ctrl+Shift+Z preserved)
- 5-min alert toggle (Bell icon)
- When Custom selected: inline inputs for work/break/prep minutes appear in the strip (no separate panel)

**Content area**: fills remaining height — view-dependent (see sections 4–6).

---

## 4. View 1 — Timeline (default)

Full-height scrollable timeline. No drag-and-drop. Blocks ordered: PREP (optional, first) → [WORK → BREAK] × repeats.

### Block cards

Each block is a `72px` tall card (`obsidian-plan-block`):

```
┌─────────────────────────────────────────────┐
│ ⏱ PREP  5m                                  │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ ▶ WORK  25m   Mathematics          [⋯ menu] │
│           Active Recall · Chapter 3         │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ ☕ BREAK  5m                                 │
└─────────────────────────────────────────────┘
```

Block type colors (left border accent, 3px):
- PREP: `#7d8590` (muted)
- WORK: `#58a6ff` (primary)
- BREAK: `#3fb950` (success)

Empty WORK block shows `[+ Assign subject]` placeholder text in muted color.

### Block expand (inline edit)

Click any block → expands to ~180px showing:
- **Subject**: searchable input, shows matching subject names as dropdown
- **Technique**: same card-style trigger as ObsidianQuickStart (`[Tier S · Savoir Mémoriser] [⚡ Browse]`), opens TechniquePickerModal
- **Chapter**: native `<select>` dropdown
- **Objective**: single-line text input (optional)
- Click outside or press Escape → collapses

Only one block expanded at a time.

### Block menu (`[⋯]`)

Hover reveals `[⋯]` icon top-right. Click opens small popover:
- Duplicate block
- Delete block
- Move up / Move down

### Add block

`[+ Add WORK block]` button at bottom of timeline. Always adds an empty WORK block + a BREAK block after it (matching current template timing). If no blocks exist and template has PREP > 0, first add also creates a PREP block.

### 1080×2560 behavior

At 2560px height, minus 48px topbar + 72px config + 28px quote bar = ~2412px for timeline. At 72px per block, ~33 blocks visible without scrolling. A typical 2h session (PREP + 4×[WORK+BREAK]) = 9 blocks = ~648px. Session fits entirely in ~27% of screen height.

---

## 5. View 2 — Split

Left panel (280px, fixed, scrollable):
- Subject search input
- Subject list (click → adds to next empty WORK block, highlights target block briefly with `obsidian-block-pulse` animation)
- Tag filter (same dropdown as current planner)
- Collapse/expand chevron at top-right of panel

Right panel: same timeline as View 1.

When a subject is clicked from the left panel and added to a block, the timeline auto-scrolls to that block.

---

## 6. View 3 — Wizard

Two steps. Step indicator shown at top of content area: `● Build  ○ Review` or `○ Build  ● Review`.

### Step 1 — Build

```
Session shape:  [25/5] [50/10] [90/15] [Custom]   Repeats: [−] 2 [+]

Subjects:
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Mathematics  │ │ Guitar       │ │ Japanese     │
│ ✓ selected   │ │              │ │              │
└──────────────┘ └──────────────┘ └──────────────┘
...

                              [→ Build Plan]
```

Subject cards: click to toggle selection (checkmark appears). Order of selection = order in timeline. Tag filter available. `[→ Build Plan]` disabled if 0 subjects selected.

### Step 2 — Review

Auto-generated timeline based on selections. Same block cards as View 1 (expandable inline edit). Buttons at top: `[← Back]` (returns to Step 1, preserves selections) and Start Session (in topbar, now enabled).

---

## 7. Session Start

`startSession()` logic identical to current Plan.tsx — builds the same `activeSession` localStorage schema, navigates to `/session`. The Start Session button in the top bar calls this. Disabled state: 0 blocks, or all WORK blocks have no `subject_id`.

Tooltip on disabled Start button: `"Add at least one subject to start"`.

---

## 8. Keyboard Shortcuts

- `Ctrl+Z` / `Ctrl+Shift+Z`: undo/redo (same as current)
- `Escape`: collapse expanded block
- `Enter` in subject search: add first result to next empty block

---

## 9. Files

| File | Change |
|---|---|
| `src/pages/Plan.tsx` | Add `if (theme === 'obsidian') return <ObsidianPlanner />` after all hooks |
| `src/pages/ObsidianPlanner.tsx` | New — full component |
| `src/pages/ObsidianPlanner.css` | New — all `.op-*` styles |

No changes to `TechniquePickerModal`, `Session.tsx`, or the `activeSession` schema.

---

## 10. Out of Scope

- i18n for new Obsidian-specific strings (hardcoded English)
- Drag-to-reorder blocks in any view
- Block resize by dragging (current behavior, not ported)
- WeeklyCompass (moved to Analytics spec)
