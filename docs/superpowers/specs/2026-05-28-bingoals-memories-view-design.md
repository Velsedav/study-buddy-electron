# Bingoals Memories View + Contrast Fixes — Design Spec

## Goal

Replace the `compact` list view with a new `memories` view that puts photos and quotes front-and-center: one horizontal strip per subobjective, controls on the left, memory cards scrolling right. Fix concurrent black-on-black contrast bug on `Marquer terminé`, `+ Citation`, `+ Lien`, `Lire` buttons.

## Context

Anhedonic / low-discipline user: needs lowest possible friction to start sessions AND a visual environment that re-engages them with the things they care about (album art, movie stills, favorite quotes). The current `compact` view is a flat list with link chips — functional but emotionally inert. The `Memories` view doubles as visual mood board and launchpad.

The contrast bug surfaces in the existing memory action buttons inside `SubobjectiveMemories` and `SubobjectiveTimerPanel`: the CSS rules are scoped under `.panel` (the old `SubobjectivePanel` wrapper), so when those buttons render inside the new `subFullCard` or other non-panel contexts, they fall back to theme defaults — which can be dark text on dark background depending on theme.

---

## Architecture

**Pattern:** In-place refactor of `BingoObjectivePage`. Two files changed:
- `src/pages/bingoals/BingoObjectivePage.tsx` — new `SubobjectiveMemoryStrip` component; delete `SubobjectiveCompactRow`; update `listView` union and toggle buttons; sort + dispatch by view
- `src/styles/bingoals.css` — new `.memStrip-*` classes, layout override class `.objPage-layout--memories`, contrast fix on the three button classes; remove dead `.subCompact*` rules

**View enum changes:**
```ts
type ListView = 'memories' | 'grid' | 'full'
```

Migration: if `localStorage['bingoals.listView']` reads `'compact'`, treat as `'memories'` (one-shot, no write-back needed — next change overwrites).

Default for new users: `'memories'`.

---

## SubobjectiveMemoryStrip

Renders one horizontal strip per subobjective. Two regions: sticky header (left) + horizontal-scroll memory track (right).

```
┌────────── HEADER (260px) ──────────┬─── MEMORIES (flex:1, scroll-x) ──────────────────┐
│ ● NAS – ILLMATIC          1/1 ✓    │ [img]  [img]  [quote]  [img]   [+]  [+]  [+]   →│
│                                    │                                                  │
│ [● START]  [Mark Done]             │                                                  │
│                                    │                                                  │
│ 🔗 Spotify  🔗 RYM   [+ link]      │                                                  │
└────────────────────────────────────┴──────────────────────────────────────────────────┘
```

### Props

```ts
{
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
  onAddLink: () => void   // opens page-level AddLinkModal via setPendingAddLinkSubId
}
```

### Header (left, ~260px fixed)

- Status dot: `subDot--running` (red, pulsing) | `subDot--done` (green) | `subDot--active` (primary) | `subDot--idle` (muted)
- Title (uppercase, ellipsis, click → `setActiveSubId(s.id)`)
- Progress text: `"N / T unit"` if `target_total > 0`, else `'✓'` if done, else `'—'`
- Action row: `[● START]` / `[■ STOP]` button (primary or danger, compact) + `[Mark Done]` toggle (re-uses `mark-done` logic from `SubobjectiveTimerPanel`)
- Link chips row (parsed from `subMedia.filter(kind === 'link')`) + `[+ link]` button

When `activeSubId === s.id`: header gets `border-left: 3px solid var(--primary)` accent.

### Memory track (right, horizontal scroll)

Each card is fixed 140×140 (160×160 at 4K, 120×120 narrow). Track scrolls horizontally — `overflow-x: auto`, hidden scrollbar, mouse wheel mapped to horizontal scroll via `onWheel` handler. Right edge fade gradient when content overflows.

**Image card:**
- `background-image: url(item.data)`, `background-size: cover`
- Click → opens existing-style lightbox modal (new component `MemoryLightbox` — full-screen overlay with image + optional caption, click-anywhere to dismiss, `×` delete top-right)
- Hover (over card directly, not lightbox) → small `×` top-right corner delete button

**Quote card:**
- Italic text on hue-tinted background. Hue from `titleToHue(s.title)`, `hsl(h, 35%, 22%)` for dark-mode readability
- Decorative opening quote mark (`'“'`) in top-left corner, large, 0.15 opacity
- Text `line-clamp: 4` by default; click → expands inline (no clamp); click again → re-collapse
- Hover → small `×` delete top-right

**`+` placeholder card:**
- Dashed border, muted background, centered icon + label
- For empty subs (zero memories): render 3 placeholders at start of track: `[+ image]`, `[+ quote]`, `[+ link]`. Each opens its corresponding add modal (file input for image, `AddQuoteModal`, `AddLinkModal`)
- For non-empty subs: render one trailing `+` card that opens a small inline picker: three buttons `(+ image | + quote | + link)` in a popover

### Strip ordering

Computed in `BingoObjectivePage`:
```ts
const sortedSubs = useMemo(() => {
  return [...subs].sort((a, b) => {
    const aRunning = running?.subId === a.id ? 0 : 1
    const bRunning = running?.subId === b.id ? 0 : 1
    if (aRunning !== bRunning) return aRunning - bRunning
    const aDone = computeAutoDone(a).autoDone || (!computeAutoDone(a).hasTarget && !!a.is_done)
    const bDone = computeAutoDone(b).autoDone || (!computeAutoDone(b).hasTarget && !!b.is_done)
    if (aDone !== bDone) return aDone ? 1 : -1
    return 0  // stable: preserves DB order within group
  })
}, [subs, running])
```

Done strips get `opacity: 0.55` via `.memStrip--done`.

---

## MemoryLightbox component

Small new component for image cards. Renders full-screen overlay:

```tsx
<div className="memLightbox" onClick={onClose}>
  <img src={dataUrl} className="memLightbox-image" />
  <button className="memLightbox-close" onClick={onClose}>×</button>
  <button className="memLightbox-delete" onClick={onDelete}>Delete</button>
</div>
```

- Click backdrop or `×` → close
- Click `Delete` → confirm then delete + close
- ESC key → close
- Image `max-width: 95vw; max-height: 95vh; object-fit: contain`

No keyboard navigation between images (out of scope — keep YAGNI).

---

## Responsive

Three breakpoints. CSS-only, no JS `matchMedia`.

| Width | Strip layout | Card | Page layout |
|---|---|---|---|
| < 720px | Column (header on top, track below) | 120×120 | Single col. Active timer = slide-up overlay (existing). |
| 720–1400px | Row, header 240px left, track flex:1 | 140×140 | 2-col: memories list left, active panel right. |
| ≥ 1400px | Row, header 280px left, track flex:1 | 160×160 | 2-col (NOT 3-col). The `objPage-memoriesCol` is HIDDEN in memories view — strips already show memories. |

Page-layout override class: `.objPage-layout--memories`:
```css
.bingoals-root .objPage-layout--memories .objPage-listCol { flex: 1 1 auto; min-width: 0; }
.bingoals-root .objPage-layout--memories .objPage-memoriesCol { display: none !important; }
```

`objPage-listCol`'s default `flex: 0 0 300px` at 900px+ gets overridden — strips need full width.

Active timer column (`objPage-activeCol`) still renders normally for memories view, shown at 900px+ as the right column when `activeSubId` is set.

---

## Contrast fixes

**Root cause:** these rules at `src/styles/bingoals.css:1545-1565` are scoped under `.panel`:
```css
.bingoals-root .panel .bingo-mark-done-btn { opacity: 0.65 }
.bingoals-root .panel .bingo-memory-action-btn { opacity: 0.55 }
```

When the buttons render outside `.panel` (e.g., inside `.subFullCard`, or the new `.memStrip`), they get theme `.btn` fallback styles — some themes are dark-bg with dark-fg.

**Fix:**

```css
/* Drop .panel ancestor restriction; apply everywhere. Bump opacity. Explicit colors. */
.bingoals-root .bingo-mark-done-btn {
  font-size: 0.83em;
  opacity: 0.85;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.16);
  color: inherit;
  transition: opacity 120ms ease, background 120ms ease;
}
.bingoals-root .bingo-mark-done-btn:hover {
  opacity: 1;
  background: rgba(255,255,255,0.12);
}

.bingoals-root .bingo-memory-action-btn,
.bingoals-root label.bingo-memory-action-btn {
  font-size: 0.78em;
  opacity: 0.85;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.16);
  color: inherit;
  transition: opacity 120ms ease, background 120ms ease;
}
.bingoals-root .bingo-memory-action-btn:hover,
.bingoals-root label.bingo-memory-action-btn:hover {
  opacity: 1;
  background: rgba(255,255,255,0.12);
}

.bingoals-root .bingo-memories-play {
  opacity: 0.85;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.16);
  color: inherit;
}
.bingoals-root .bingo-memories-play:hover { opacity: 1; background: rgba(255,255,255,0.12); }
.bingoals-root .bingo-memories-play:disabled { opacity: 0.35; cursor: not-allowed; }
```

Old `.panel`-scoped rules deleted.

Inside `.subFullCard--done` (green tint) and `.memStrip--done` (also green tint), the neutral `rgba(255,255,255,0.x)` palette stays readable — no extra overrides needed.

---

## New CSS classes (memories view)

```
.memStrip — strip container
.memStrip--done — muted opacity 0.55
.memStrip--running — red glow
.memStrip--active — primary left border accent

.memStrip-header — left region (~260px)
.memStrip-headerTop — dot + title + progress row
.memStrip-headerActions — START/Stop + Mark Done row
.memStrip-headerLinks — link chips + +link button row

.memStrip-track — right region, horizontal scroll
.memStrip-trackInner — flex row, no-wrap
.memStrip-card — base card (140×140 default)
.memStrip-card--image — background image + scrim
.memStrip-card--quote — hue-tinted bg + italic text + decorative quote mark
.memStrip-card--placeholder — dashed border, muted

.memStrip-quoteText — text inside quote card, line-clamp:4 default
.memStrip-quoteText--expanded — no clamp
.memStrip-cardDelete — small × top-right, opacity:0 default
.memStrip-card:hover .memStrip-cardDelete { opacity: 0.85 }

.memStrip-addPicker — small popover from trailing + card
.memStrip-addPickerBtn — buttons inside the popover

.memLightbox, .memLightbox-image, .memLightbox-close, .memLightbox-delete
```

Existing classes kept and reused: `.subCompactChip` (link chips), `.subCompactAddLink` (+link button in header), `.bingo-start-btn` (start/stop), the existing modals.

---

## What Changes vs Stays

| Item | Status |
|---|---|
| Compact view | **Deleted** |
| `SubobjectiveCompactRow` component | **Deleted** |
| `.subCompact*` CSS (rows only — chip + addLink reused) | **Mostly deleted**; chip + addLink kept |
| `listView` enum: `'compact' \| 'grid' \| 'full'` | Becomes `'memories' \| 'grid' \| 'full'` |
| `localStorage['bingoals.listView']` value `'compact'` | Migrated to `'memories'` on read |
| Grid view | Kept as-is |
| Full view | Kept as-is (just reworked last commit) |
| Active timer panel column | Kept; visible when `activeSubId` set |
| 4K third column (`objPage-memoriesCol`) | **Hidden in memories view** (redundant) |
| Black-on-black `Marquer terminé`, `+ Citation`, `+ Lien`, `Lire` | **Fixed** via explicit neutral palette + dropped `.panel` ancestor |

---

## Testing

Manual:
- Memories view: each sub renders a strip; running sub floats to top with red glow; done subs at bottom muted.
- Click image → lightbox opens full-screen; click `×` or backdrop → closes.
- Click quote → expands inline; click again → re-collapses.
- Click START in strip header → timer starts for that sub; any other running timer stops.
- Click strip title → activeSubId set; right column shows that sub.
- Empty sub → strip track shows 3 placeholders (`+ image`, `+ quote`, `+ link`); each opens correct modal.
- Click trailing `+` card on non-empty strip → small picker pops up.
- Switch view to grid/full and back → memories view re-renders correctly.
- Reload page → view persists. Pre-existing `'compact'` localStorage value loads as `'memories'`.
- Buttons `Marquer terminé`, `+ Citation`, `+ Lien`, `Lire` all readable on every theme.
- Narrow (< 720px): strip stacks vertically.
- Mid (720–1400px): strip is row, header 240px.
- 4K (≥ 1400px): strip is row, header 280px, 3rd column hidden.

No new unit tests (pure visual / interaction work). Existing 138 tests stay green.
