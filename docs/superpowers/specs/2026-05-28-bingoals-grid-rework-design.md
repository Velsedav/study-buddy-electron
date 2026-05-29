# Bingoals Grid Rework — Design Spec

## Goal

Make the Bingo grid page a better launchpad for action and recording. Cards should surface links, progress counts, and past memories at a glance — without navigating into the detail page first.

## Context

The detail page (`BingoObjectivePage`) is solid: timer, memories (images/quotes/links), +/− counter, all working well. The grid (`BingoDashboard`) is the weak link — cards show title + last-studied date + thin progress bar, and nothing motivational. Links and memories are buried 2+ clicks deep. For a user with ADHD/anhedonia, the grid needs to give a reason to click before motivation has kicked in.

User's data: 16 objectives, mostly `count` kind (films, albums, books, recipes), 3 active, 13 never touched. Links and images stored in subobjectives but invisible from grid.

---

## Architecture

**Pattern:** Augment existing `DashboardCard` and `load()` function. No new pages, no new routes.

**Files:**
- `src/lib/bingoals/db.ts` — add `listDashboardMediaSummaries(objectiveIds)`
- `src/pages/bingoals/BingoDashboard.tsx` — load media summaries, pass to card, update card rendering
- `src/styles/bingoals.css` — card CSS changes (progress count badge, time badge, link chips, hover thumbnail)

**`openExternal` in BingoDashboard:** Add at top of file (same pattern as `BingoObjectivePage`):
```ts
const openExternal = (url: string) => (window as any).electronAPI.shell.openExternal(url)
```

**`DashboardCard` prop signature change:**
```ts
// Add to existing props:
mediaSummary: ObjectiveMediaSummary | undefined
```
Import `ObjectiveMediaSummary` from `../../lib/bingoals/db`.

---

## New DB Function

```ts
export type ObjectiveMediaSummary = {
  objectiveId: string
  links: Array<{ url: string; label: string }>
  lastImageDataUrl: string | null
}
```

`listDashboardMediaSummaries(objectiveIds: string[]): Promise<ObjectiveMediaSummary[]>`

SQL: join `subobjectives` → `media_items` where `kind IN ('link', 'image')` and `objective_id IN (...)`. Return all rows, group in JS:
- Links: all `kind='link'` items, parsed as `{ url, label }`, in `created_at` ASC order
- Last image: last `kind='image'` item by `created_at DESC`, take `data` field

Returns empty array if `objectiveIds` is empty (guard).

---

## Data Loading

In `BingoDashboard.load()`:
1. After `fetchSubobjectivesByObjective`, call `listDashboardMediaSummaries(objectiveIds)`
2. Build `mediaSummaryMap: Map<string, ObjectiveMediaSummary>` keyed by `objectiveId`
3. Store in component state: `const [mediaMap, setMediaMap] = useState<Map<string, ObjectiveMediaSummary>>(new Map())`
4. Pass `mediaSummaryMap.get(c.objective_id!)` as `mediaSummary` prop to `DashboardCard`
5. `DASH_CACHE` stores `Cell[]` only — media is re-fetched on each `load()` (media changes are rare, cache complexity not worth it)

---

## Progress Count Display

Computed inside `DashboardCard` from existing props (no extra DB call):

```ts
function progressLabel(c: Cell): string {
  const obj = c.objective!
  if (obj.goal_kind === 'manual' || !obj.goal_target) {
    return c.percent === null ? '—' : `${Math.round((c.percent ?? 0) * 100)}%`
  }
  const done = Math.round((c.percent ?? 0) * obj.goal_target)
  const unit = obj.goal_unit ? ` ${obj.goal_unit}` : ''
  return `${done} / ${obj.goal_target}${unit}`
}
```

Examples: `"3 / 12 Films"`, `"7 / 24 albums"`, `"25%"` (manual)

---

## Card Visual Design

### At Rest

```
┌──────────────────────────────────┐
│                                  │
│   [cover image / gradient bg]    │  unchanged background
│                                  │
│   WATCH 12 FRENCH FILMS          │  cardTitle — kept, bottom-left
│   3 / 12 Films  ·  8h 9m         │  NEW: progress count + time on one line
│  [🔗 Netflix]                    │  NEW: first link chip (if links exist)
│  ▓▓▓░░░░░░░░░░░░░░░             │  progress bar (kept)
└──────────────────────────────────┘
```

- `cardMeta` (last-studied date) **removed** — now replaced by the progress count + time line
- Last-studied date `status` color (green/orange/red) moves to a small dot on the progress count line: `● 3 / 12 Films · 8h 9m` where dot color = `lastStatus` value
- Time format: use existing `formatDuration(ms)` — shows "8h 9m" or "45m"
- Link chip: only first link shown at rest. If no links: chip not rendered (no empty state).
- Link chip click: calls `openExternal(url)`, stops propagation (does NOT navigate to detail)

### On Hover

`hoverProgress` panel (existing slide-up from bottom) is replaced with expanded content:

```
┌──────────────────────────────────┐
│  [last memory thumbnail, 80px]   │  NEW: top of hover panel, if image exists
│  [🔗 Netflix] [🔗 Senscritique]  │  NEW: all links as chips
│  3 / 12 Films  ·  8h 9m  ● green │  progress line (same as at-rest, repeated)
└──────────────────────────────────┘
[▲/▼ pin]  [✏ edit]               ← cardActions (unchanged)
```

- Thumbnail: `<img>` with fixed height ~80px, `object-fit: cover`, full width. Only rendered if `mediaSummary.lastImageDataUrl` exists.
- Links: all `mediaSummary.links` rendered as chips (same style as single at-rest chip). If 0 links: no chips section.
- Hover panel height: expands naturally (no fixed height). CSS transition stays.
- Progress % pill (`hoverRow` with pill) **removed** — replaced by progress line.

### cardActions (pin/edit buttons)

No change. Still appear on hover, outside the card.

---

## DashboardCard Memo Comparator

Update to include `mediaSummary`:
```ts
prev.c === next.c &&
prev.mediaSummary === next.mediaSummary
// (other existing field checks)
```

Pass `mediaSummary` as a prop; include in comparator.

---

## CSS Changes

New classes needed in `bingoals.css`:

| Class | Purpose |
|-------|---------|
| `.cardStatusDot` | Colored dot (green/orange/red/neutral) before progress count |
| `.cardProgressLine` | Row holding status dot + progress count + time |
| `.cardLinkChip` | Single link chip at rest (icon + label, truncated) |
| `.hoverLinks` | Row of link chips in hover panel |
| `.hoverLinkChip` | Link chip in hover panel (same base as `.cardLinkChip`) |
| `.hoverThumb` | Thumbnail image in hover panel |

Existing classes kept: `cardWrap`, `card`, `card--has-cover`, `cardTitle`, `cardProgressBar`, `cardProgressFill`, `hoverProgress`, `cardActions`.

Existing class removed: `cardMeta` (the last-studied date row) — replaced by `.cardProgressLine`.

Theme variable overrides in `bingoals.css` (20+ themes) do not need updating — new classes inherit from existing `card` context.

---

## What Changes vs Stays

| Item | Status |
|------|--------|
| Cover image background | Kept |
| `cardTitle` (objective name) | Kept |
| `cardMeta` (last-studied date row) | **Removed** — replaced by progress line with status dot |
| `cardProgressBar` (3px bar) | Kept |
| `hoverProgress` panel | Modified — now shows thumbnail + all links + progress line |
| `hoverRow` with progress % pill | **Removed** from hover panel |
| `cardActions` (pin/edit) | Kept unchanged |
| First link chip at rest | **New** |
| Progress count label (X/Y unit) | **New** |
| Time badge on same line as count | **New** |
| Status dot on progress line | **New** |
| Hover thumbnail (last memory image) | **New** |
| All links in hover panel | **New** |

---

## Testing

Manual:
- Card with cover image + links: link chip visible at rest, thumbnail + all links on hover
- Card with no links: no chip rendered at rest, no chip section in hover
- Card with no memory images: hover panel shows links only (no thumbnail)
- Card with `manual` goal: progress line shows "25%" not "X/Y unit"
- Link chip click: opens external, does NOT navigate to detail page
- Card click (not on chip): navigates to detail as before
- Status dot: green/orange/red/neutral based on `lastStatus(days, frequency_days)`
- Objective with no `frequency_days`: dot shows neutral (no color)
