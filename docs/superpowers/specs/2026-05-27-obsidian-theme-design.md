# Obsidian Theme — Design Spec

**Date:** 2026-05-27  
**Theme ID:** `obsidian`  
**Category in Settings:** New group below "Modern & Experimental"  
**Scope:** CSS theme + layout variants + Home page view modes + Quick-Start modal

---

## 1. Context & Goals

The existing themes are visual reskins only. The Obsidian theme goes further: it introduces a restructured layout and a new Home page interaction model designed for users who:

- Are self-taught with many subjects across diverse domains (20–100+)
- Use the app as a therapeutic/motivational tool (CBT, ADHD management, depression)
- Find the current card-based Home page and multi-step session start flow slow and cluttered

**Success criteria:**
- Starting a study session takes ≤2 clicks from Home
- Home page is comfortable with 50+ subjects
- Motivational quotes remain always-visible across all pages
- Dark Pro aesthetic reduces visual fatigue for long sessions

---

## 2. Visual Identity

### Palette

| CSS Variable | Value | Role |
|---|---|---|
| `--bg-color` | `#0d1117` | Page background |
| `--card-bg` | `#161b22` | Cards, panels, sidebar |
| `--surface-raised` | `#21262d` | Hover states, dropdowns (new variable, obsidian-only) |
| `--border-color` | `#30363d` | All dividers and borders (new variable, obsidian-only) |
| `--text-dark` | `#e6edf3` | Primary text |
| `--text-muted` | `#7d8590` | Labels, hints, secondary text |
| `--primary` | `#58a6ff` | Actions, links, active nav |
| `--primary-rgb` | `88, 166, 255` | For rgba() usage |
| `--success` | `#3fb950` | Retention %, streaks, good states |
| `--danger` | `#f85149` | Delete, overdue, error |
| `--accent` | `#d29922` | Warning, due-soon, attention |

### Typography

- **Body:** `IBM Plex Sans` (already loaded), 13px base — tighter than default 16px for density
- **Stats/numbers:** `JetBrains Mono` — hours, percentages, timers
- **Headings:** IBM Plex Sans 600 — no decorative serif
- **Line height:** 1.5

### Shape & Depth

- `--border-radius`: `6px` everywhere (vs current 20px)
- `--border-radius-sm`: `4px`
- **No colored shadows.** Only: `box-shadow: 0 1px 3px rgba(0,0,0,0.4)`
- **No gradients** on backgrounds or cards
- **No glass/blur effects**
- **No top-decoration bar**

---

## 3. Layout Shell

### Compact Icon Sidebar (64px)

Replaces the current wide sidebar when `theme === 'obsidian'`.

- **Width:** 64px, fixed
- **Background:** `#161b22`
- **Right border:** `1px solid #30363d`
- **Icons only.** No label text rendered in DOM.
- **Active state:** `#58a6ff` icon color + 3px left accent bar (`#58a6ff`)
- **Hover tooltip:** native `title` attribute shows nav label
- **Review-due dot:** preserved on Learning icon
- **No mascot image, no logo text, no quote bubble**

Nav items (same routes as current):
- Subjects (Home)
- Planner
- Learning
- Analytics
- Bingoals
- Metacognition Logs
- Settings

### Bottom Quote Bar (28px)

Replaces the mascot quote bubble. Spans full width at bottom of main content area (not sidebar).

- **Height:** 28px
- **Background:** `#161b22`
- **Top border:** `1px solid #30363d`
- **Text:** `#7d8590`, IBM Plex Sans italic, 12px
- **Quote rotation:** same 4.5s interval logic as current implementation
- **Right side:** `[✎]` pencil icon opens QuoteEditorModal
- **Purpose:** always visible on every page including mid-session — critical for users relying on quotes for motivation/CBT/ADHD support

### Overall Grid

```
┌──────┬────────────────────────────────────────┐
│  64px│                                        │
│ icon │          Main content area             │
│ side │         (page <Outlet />)              │
│ bar  │                                        │
│      │                                        │
│      ├────────────────────────────────────────┤
│      │  "The exam is won at home..."     [✎] │
└──────┴────────────────────────────────────────┘
```

---

## 4. Home Page — 3 View Modes

### Shared Top Bar (all views)

```
[⚡ 2h today]  [📅 8h this week]    [filter subjects...]   [≡] [⊞] [⊟]
```

- **Left:** today's total hours + week total hours (JetBrains Mono)
- **Center:** text filter input, filters all views by subject name
- **Right:** view toggle buttons (List / Board / Split), active state highlighted
- **Persistence:** selected view stored in `localStorage` key `obsidian-home-view`, default `'list'`

### List View (default)

Dense sortable table. Each row:

```
▸ Mathematics      #science    studied 2d ago   12.4h   87%  [▶ Start]
▸ Guitar           #music      studied today     8.1h   92%  [▶ Start]
▸ Japanese         #language   studied 5d ago    3.2h   41%  [▶ Start]
```

- Column headers: Name / Tags / Last Studied / Total Hours / Retention / Action — all sortable
- Hover row: subtle `#21262d` background
- `[▶ Start]` button: opens Quick-Start modal (Section 5)
- Row click (not on Start): opens SubjectEditorModal (existing behavior)
- Retention % colored: ≥80% green, 50–79% amber, <50% red
- Pinned subjects float to top (existing pin logic preserved)
- Trashed subjects not shown (existing soft-delete logic preserved)

### Board View

Subjects grouped by tag into collapsible sections:

```
▼ #music (3)             ▼ #science (5)          ▼ Ungrouped (2)
  Guitar   87%  [▶]        Mathematics 87%  [▶]    Japanese  41%  [▶]
  Piano    72%  [▶]        Physics     63%  [▶]    ...
  ...                      ...
```

- Subjects with no tags → "Ungrouped" section, shown last
- Subjects with multiple tags → appear in first tag group only
- Collapse state stored in `localStorage` key `obsidian-board-collapsed` (JSON array of collapsed group names)
- `[▶]` triggers Quick-Start modal

### Split View

Left panel: subject list. Right panel: selected subject detail. No page navigation needed.

```
┌─────────────────┬──────────────────────────────────────┐
│ Guitar       ▶  │  Guitar                              │
│ Japanese        │  Last studied: today    8.1h total   │
│ Mathematics     │  Retention: 92%                      │
│ Physics         │  Chapters: 12/20 complete            │
│ ...             │  Tags: #music                        │
│                 │                                      │
│                 │  [▶ Start Session]   [✎ Edit]        │
└─────────────────┴──────────────────────────────────────┘
```

- Left panel: 280px, scrollable subject list, compact rows
- Right panel: fills remaining width, shows detail for selected subject
- Default selection: first pinned subject, else first subject alphabetically
- `[▶ Start Session]` → Quick-Start modal
- `[✎ Edit]` → SubjectEditorModal

---

## 5. Quick-Start Modal

New component: `src/components/ObsidianQuickStart.tsx`

Triggered by any `[▶ Start]` / `[▶ Start Session]` button in the Obsidian home views.

```
┌─────────────────────────────────────┐
│  Start: Guitar                      │
│                                     │
│  Duration   [25m] [50m] [90m] [___] │
│  Technique  [Pomodoro          ▾]   │
│  Chapter    [Chapter 3         ▾]   │
│                                     │
│             [Launch Session]        │
└─────────────────────────────────────┘
```

- **Duration:** preset buttons (25/50/90 min) + optional custom text input. Last used duration persists in `localStorage` key `obsidian-qs-duration`.
- **Technique:** dropdown using existing TECHNIQUES list from `src/lib/techniques.ts`. Last used persists.
- **Chapter:** dropdown of chapters for the selected subject (from `getChaptersForSubject`). Optional — can be left blank.
- **Launch:** builds a single-block session draft `[{ type: 'WORK', subject_id, minutes, chapter_name, technique }]`, writes to `localStorage` key `activeSession` using the same schema as the existing session system, then navigates to `/session`.
- **Escape / backdrop click:** closes modal without action.

---

## 6. Settings Integration

In `src/pages/Settings.tsx`, add new theme group after "Modern & Experimental":

```ts
{
  name: 'Redesign',
  themes: [
    {
      id: 'obsidian',
      name: 'Obsidian',
      color: '#58a6ff',
      background: 'linear-gradient(135deg, #0d1117 0%, #161b22 50%, #58a6ff 100%)'
    }
  ]
}
```

---

## 7. Files Changed

| File | Change |
|---|---|
| `src/lib/settings.tsx` | Add `'obsidian'` to `Theme` union type |
| `src/pages/Settings.tsx` | Add "Redesign" theme group with obsidian entry |
| `src/components/Layout.tsx` | Conditional render: compact sidebar + bottom quote bar when `theme === 'obsidian'` |
| `src/components/Layout.css` | Obsidian sidebar + quote bar styles |
| `src/pages/Home.tsx` | 3 view modes + view toggle when `theme === 'obsidian'` |
| `src/pages/Home.css` | Obsidian home styles (list/board/split) |
| `src/index.css` | `[data-theme="obsidian"]` CSS variable block |
| `src/components/ObsidianQuickStart.tsx` | New — quick-start modal component |

No other pages require React changes. All other pages inherit Dark Pro styling via CSS variables.

---

## 8. Out of Scope

- i18n for new Obsidian-specific strings (hardcoded English for now)
- Drag-to-reorder in list/board views
- Keyboard shortcuts within home views
- Obsidian-specific changes to Plan, Session, Analytics, Learning pages beyond CSS restyling
