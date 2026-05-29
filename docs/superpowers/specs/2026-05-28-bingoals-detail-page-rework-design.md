# Bingoals Detail Page Rework — Design Spec

## Goal

Transform `BingoObjectivePage` from a list of stacked full panels into a responsive launchpad: subobjective list with links visible at a glance, view toggle (compact/grid/full), and a focused timer panel that adapts per breakpoint.

## Context

`BingoObjectivePage` is the detail page for a single objective (e.g. "Watch 12 French Films"). It lists subobjectives (individual films, albums, etc.) each with a timer, count controls, and memories. Current pain: full-panel-per-subobjective is heavy to scan, links are buried in memories (2+ clicks), timer is small (2.4rem), layout isn't visually appealing.

User pattern: pre-plan subobjectives + links upfront → scan list → tap link to source → optionally record session with timer → pick next item. Anhedonia context: lowest possible friction to reach sources and start.

Monitor context: 1080×2560 portrait (9:12) + 4K wide. Portrait = 1080px wide, very tall; 4K = 3840×2160.

---

## Architecture

**Pattern:** Refactor `BingoObjectivePage.tsx` in place. No new routes or pages. Two files changed:
- `src/pages/bingoals/BingoObjectivePage.tsx` — refactor + new sub-components
- `src/styles/bingoals.css` — layout additions

**New page-level state:**
```ts
const [activeSubId, setActiveSubId] = useState<string | null>(null)
const [listView, setListView] = useState<'compact' | 'grid' | 'full'>(() =>
  (localStorage.getItem('bingoals.listView') as 'compact' | 'grid' | 'full') ?? 'compact'
)
```

`listView` persisted to `localStorage['bingoals.listView']` on change.

`activeSubId` auto-set to first incomplete subobjective on page load. On narrow screens it drives overlay open/close. On mid/wide it drives which right panel is shown.

**`SubobjectivePanel` (existing monolith) split into:**
- `SubobjectiveTimerPanel` — timer face + START/STOP + count block + tap strip + tick bar + footer
- `SubobjectiveMemories` — links row + slideshow (unchanged logic)
- `SubobjectiveCompactRow` — compact list item
- `SubobjectiveTile` — grid tile
- `SubobjectivePanel` (full view) — wraps Timer + Memories in existing left/right layout (kept for full toggle)

**Data:** `mediaBySub` (already computed from `listMediaForSubobjectives`) passed down to all list items. No new DB calls.

---

## Responsive Layout

Three breakpoints via CSS classes on `.objPage-layout`:

| Breakpoint | Class | Layout |
|---|---|---|
| < 900px | `.objPage-layout--narrow` | Single column. Tap subobjective → full-screen overlay slides up from bottom |
| 900–1400px | `.objPage-layout--mid` | 2-column row. Left = list (300px). Right = active timer panel (flex:1) |
| ≥ 1400px | `.objPage-layout--wide` | 3-column row. Left = list (320px). Center = timer (flex:1, max 600px). Right = memories (flex:1) |

CSS media queries drive which class applies (or use a single class with nested `@media` inside).

---

## Objective Header

No separate `.panel` wrapper. Header sits in page flow, less visual weight.

```
← WATCH 12 FRENCH FILMS                    3 / 12 Films ▓▓▓░░░
   last: 3 days ago  ·  total: 8h 9m
   [compact] [grid] [full]                              [+ Add]
```

- Back arrow + title (`h1`) left. Progress label (`progressLabel()`) + inline mini bar right.
- Second row: `last studied: X days ago` (max of all `timeStats.last_end` and `s.updated_at`) + `total time: Xh Xm` (sum of all `timeStats.total_ms`).
- Third row: view toggle (3 buttons) left + Add button right.
- `current_value` inline input (for metric/amount/manual objectives) beside goal label.

---

## Subobjective List Views

### Compact (default)

48px rows. Tap row (not on chip) → `setActiveSubId(s.id)`. Tap chip → `openExternal`, no navigation.

```
● Kind of Blue – Miles Davis   [🔗 Spotify] [🔗 RYM]    —
● Moonlight (2016)             [🔗 MUBI]               1/1 ✓
```

- Left: status dot — green=done, accent=active (`activeSubId === s.id`), running=pulsing accent, muted=todo.
- Title. Done = 50% opacity + strikethrough.
- Right: all link chips (horizontal, scroll overflow if many). Tap → `openExternal`.
- Far right: progress badge (`3/12` or `—`) + ✓ if done.
- Each row: small `[+ link]` icon button → opens `AddLinkModal` for that subobjective directly. No navigation required.

### Grid (2-col portrait, 3-col 4K)

Tiles ~140×120px.
- Background: `lastImageDataUrl` (cover art, `object-fit: cover`) if exists, else deterministic hue from title hash (CSS `hsl(hash % 360, 40%, 30%)`).
- Title bottom-left overlay (dark scrim). Progress badge bottom-right.
- Link chips along bottom edge (small, truncated label).
- Done: semi-transparent dark overlay + ✓ centered.
- `[+ link]` icon on hover/tap of tile corner.
- Tap tile (not chip) → `setActiveSubId`.

### Full (existing layout, power user)

Current `SubobjectivePanel` stacked vertically. Timer + memories side-by-side on mid/wide. No column-level layout change — each panel is self-contained. Used rarely; kept for completeness.

---

## Active Panel (Timer)

### Portrait (< 900px): Overlay

Full-screen overlay slides up from bottom. Fixed position, 95vh height, rounded top corners, CSS `transform: translateY` transition.

Header:
- `←` back button (left) — closes overlay, clears `activeSubId`
- Subobjective title (center)

Body (scrollable):

```
[🔗 Spotify] [🔗 RateYourMusic]    ← links at top, all visible immediately

        00:45:12                    ← timer, 5rem monospace, centered

[████████████████  ■ STOP  ]       ← full-width START/STOP

        3  /  12  films             ← count block, centered, large
       [    −    ]  [    +    ]     ← tap strip, full width
   ▓▓▓▓▓░░░░░░░░░░░░░░░░░░░       ← tick bar

   Today    [Mark Done]  [🗑]       ← footer

─── Memories ─────────────────
[images + quotes + slideshow]
```

Links at top: all `mediaBySub.get(s.id)` link items shown as chips. Immediately visible on overlay open — no scrolling.

Timer: `5rem`, monospace, dark inset face (keep existing `.bingo-instrument-face` style).

START/STOP: full-width button below timer.

Count + tap strip: centered, large. Same logic as current.

Memories: below fold, accessible by scrolling. Includes slideshow + quote display.

### Mid-width (900–1400px): Right column

Same content as overlay, no overlay wrapper. `4rem` timer. Links at top. Memories below timer in same column.

### 4K (≥ 1400px): Center + Right columns

Center column: timer panel (links at top, timer `5rem`, count/controls). Max 600px wide.
Right column: `SubobjectiveMemories` always visible (no scrolling to reach). Full height.

---

## Links: Add & Display

**Adding:** `AddLinkModal` accessible from:
1. Compact row `[+ link]` icon button (rightmost, small)
2. Grid tile `[+ link]` on hover/corner
3. Active panel (existing add-link button in memories section)

**Displaying:**
- Compact row: all link chips inline. `overflow-x: auto` if many.
- Grid tile: chips at bottom edge.
- Active panel: chips at very top of body (above timer).
- All chips: `openExternal(url)` on click, `e.stopPropagation()`.

---

## CSS New Classes

| Class | Purpose |
|---|---|
| `.objPage-layout` | Page grid container |
| `.objPage-listCol` | List column |
| `.objPage-activeCol` | Timer panel column (mid/wide) |
| `.objPage-memoriesCol` | Memories column (4K only) |
| `.objPage-overlay` | Full-screen timer overlay (narrow) |
| `.objPage-overlay--open` | Open state (translateY(0)) |
| `.objPage-header` | New objective header |
| `.objPage-headerProgress` | Progress label + mini bar row |
| `.objPage-headerMeta` | Last studied + total time row |
| `.objPage-viewToggle` | Compact/grid/full toggle buttons |
| `.subCompactRow` | Compact list row |
| `.subCompactRow--active` | Selected row |
| `.subCompactRow--done` | Done row (muted, strikethrough) |
| `.subCompactDot` | Status dot |
| `.subCompactLinks` | Link chips container in row |
| `.subCompactAddLink` | [+ link] icon button on row |
| `.subGridTile` | Grid tile |
| `.subGridTile--done` | Done overlay |
| `.subGridLinks` | Link chips on tile |
| `.subTimerLinks` | Link chips at top of active panel |
| `.subTimerLinkChip` | Individual chip in active panel |

Existing classes kept: `.bingo-instrument-face`, `.bingo-instrument-timer`, `.bingo-start-btn`, `.bingo-count-block`, `.bingo-tap-strip`, `.bingo-tick-bar`, `.bingo-panel-right`, `.memories`, etc.

---

## What Changes vs Stays

| Item | Status |
|---|---|
| Timer face (dark inset, monospace) | Kept, larger (5rem narrow/4K, 4rem mid) |
| START/STOP button | Kept, full-width in active panel |
| Count block + tap strip | Kept, centered |
| Tick-mark bar | Kept |
| Footer (last practiced, done, delete) | Kept |
| Memories (links row + slideshow) | Kept, new placement |
| Stacked full panels (default view) | Replaced by compact list (still accessible via full toggle) |
| Timer size (2.4rem) | **Larger** |
| Links in memories section (buried) | **Surfaced** — top of active panel + on list rows |
| No subobjective list views | **New**: compact / grid / full toggle |
| No active subobjective concept | **New**: `activeSubId` state |
| No overlay on portrait | **New**: slide-up overlay |
| 3-column layout on 4K | **New** |
| `+ link` from list | **New**: add link without navigating in |

---

## Testing

Manual:
- Compact: tap row → active panel opens. Tap link chip → opens external, no navigation.
- Compact: `[+ link]` → modal opens for that subobjective.
- Grid: tile background = cover art if exists, hue if not. Done overlay correct.
- Portrait: tap subobjective → overlay slides up. Back → closes.
- Mid-width: right column shows active timer panel. Switching subobjective → panel updates.
- 4K: 3 columns visible. Memories always in right column.
- View toggle persisted after reload.
- `activeSubId` auto-set to first incomplete on load.
- Links at top of active panel, immediately visible without scrolling.
- Full view: existing layout preserved.
