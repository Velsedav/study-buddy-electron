# Obsidian Settings Rework — Design Spec

## Goal

Build an `ObsidianSettings` page that mirrors the `ObsidianHome` / `ObsidianAnalytics` / `ObsidianPlanner` pattern: a left-rail nav with 4 categories on the left, a content panel on the right. Replaces the current single-scroll 699-line Settings page when any `obsidian-*` theme is active.

## Context

The current `Settings.tsx` is 699 lines stacking 8 sections vertically (`Appearance`, `Preferences`, `Language`, `Spaced Repetition`, `Shortcuts`, `Audio`, `Data Management`, `Danger Zone`). It uses the default `.page-header` block (now redundant — sidebar already shows the page) and lacks an obsidian-styled variant — under obsidian themes it still renders the default visual language.

The four other major routes (`/`, `/analytics`, `/plan`, plus `Layout` itself) already gate on `theme.startsWith('obsidian')` and render dedicated obsidian variants. Settings is the next page on the rework list, with `Learning Center` and `MetacognitionLogs` to follow.

The design system (`docs/design-system.md`) captures the token contract this rework consumes — no new tokens introduced, only new component classes prefixed `obs-settings-*`.

---

## Architecture

**Pattern:** Mirror the existing obsidian-component pattern. Two-stage:

1. Top of `src/pages/Settings.tsx` becomes a thin route gate:
   ```tsx
   export default function Settings() {
     const { theme } = useSettings();
     if (theme.startsWith('obsidian')) return <ObsidianSettings />;
     return <DefaultSettings />;
   }
   ```
2. Existing 699-line body becomes a non-default-exported `DefaultSettings` component in the same file (rename, no logic change).
3. New `src/pages/ObsidianSettings.tsx` + `src/pages/ObsidianSettings.css` hold the obsidian variant.

**Files touched (4):**

| File | Change |
|---|---|
| `src/pages/Settings.tsx` | Wrap body as `DefaultSettings`; add top-level `Settings` route gate. ~5 line diff in addition to a rename. |
| `src/pages/ObsidianSettings.tsx` | NEW. ~400 lines. Left-rail + 4 content panels. |
| `src/pages/ObsidianSettings.css` | NEW. ~250 lines. Rail + panel + responsive. |
| `src/lib/i18n.ts` | Add 4 new strings: `settings.look_and_feel`, `settings.learning`, `settings.audio`, `settings.system`. |

**Shared logic stays.** Theme picker, SFX volume sliders, export config, import flow, delete confirmations, autostart toggle, performance mode toggle, language picker, spaced-repetition input, week-start picker — all imported from the same `src/lib/*` modules. No business logic duplicated. The new component composes existing primitives (`CustomSelect`, `BingoModal`, raw inputs, the existing `THEME_GROUPS` data structure for the theme picker).

**No tests touched.** Pure visual + structural change.

---

## Left-rail nav

```
┌──────────────────┬──────────────────────────────────────────┐
│ ⚙ Settings       │ Look & feel                              │
├──────────────────┤                                          │
│ ◉ Look & feel    │   Theme                                  │
│ ○ Learning       │   ┌───────────────────────────────┐      │
│ ○ Audio          │   │ Big visual theme picker grid  │      │
│ ○ System         │   └───────────────────────────────┘      │
│                  │   Language                               │
│                  │   [dropdown]                             │
│                  │                                          │
│                  │   Preferences                            │
│                  │   ...                                    │
└──────────────────┴──────────────────────────────────────────┘
```

### Rail spec

- Width 220px at ≥ 900px viewport. Collapses to 56px (icons only) below 900px.
- Sticky position, full-height.
- Header at top: small "Settings" label, `var(--text-muted)`, uppercase, 0.7rem, 0.8px letter-spacing.
- Each item: 16px icon + label, 10px vertical padding, 12px horizontal padding.
- Active item: `var(--card-bg)` background + 3px left border `var(--primary)` + text `var(--text-light)`.
- Inactive: text `var(--text-muted)`. Hover: text `var(--text-dark)` + bg `rgba(255,255,255,0.04)`.
- 4 items: `Look & feel` (Palette icon), `Learning` (Brain icon), `Audio` (Volume2 icon), `System` (Database icon).

### Right panel spec

- Padding 32px (24px at < 900px).
- Top: large category title (h1, 1.6rem, weight 700, color `var(--text-dark)`).
- Optional subtitle: 0.85rem, `var(--text-muted)`.
- Sections within stack vertically with 32px gap. Each section: small uppercase label (`var(--text-muted)`, 0.72rem, weight 700, letter-spacing 0.6px) + control(s) underneath.
- Max-width 720px on the content (centered) at ≥ 1400px so form rows stay readable on 4K.
- `overflow-y: auto` so content scrolls without scrolling the rail.

### State + interaction

- Active category in local `useState<'look-and-feel' | 'learning' | 'audio' | 'system'>('look-and-feel')`.
- Click rail item → updates state.
- No URL-hash routing in scope (defer to follow-up).
- Right-panel fade-in (180ms ease) on category switch — apply via a `key={activeCategory}` on the panel root that triggers React's mount/unmount + `animation: fadeIn 0.18s ease` CSS rule.
- Keyboard: standard Tab navigation. `:focus-visible` already enforced globally.

---

## Panel content

### Panel 1: Look & feel

**Theme**
- Title "Theme" (uppercase section label).
- Big visual swatch grid (kept from current `THEME_GROUPS` structure in `src/pages/Settings.tsx:113-169`).
- Active state shows the active theme name + `Apply` / `Hover to preview` hint.
- 5 groups intact: `Sailor Moon`, `Terminal`, `Art`, `Modern & Experimental`, `Redesign`.
- All 13 obsidian entries (1 original + 12 variants from 2026-05-29) under `Redesign`.

**Language**
- `CustomSelect` dropdown. Existing 6 options: en, fr, es, id, zh-CN, zh-TW.

**Calendar**
- First day of week (Monday / Sunday) — `CustomSelect`.
- Metacognition log day (Friday / Saturday / Sunday) — `CustomSelect`.

**System behavior**
- Launch at login — `[✓]` toggle, `Power` icon prefix.
- Performance mode — `[✓]` toggle, `Zap` icon prefix, hint text.

### Panel 2: Learning

**Spaced repetition**
- Description text (`settings.sr_desc`).
- Review intervals input + Reset-to-default button.

**Keyboard shortcuts**
- Read-only list of shortcuts (existing data — `settings.shortcuts` section).
- No editing in scope.

### Panel 3: Audio

**Master volume**
- Single horizontal slider, value from `volumeSettings.master`.

**Mute toggle**
- Single switch at the top, makes the rest of the panel render dimmed when on.

**Per-SFX volume**
- Existing `SFX_GROUPS` structure (`hover`, `feedback`, `bingo`, etc.) — one collapsible-style group per category.
- Each row: SFX label + slider + Test button.

### Panel 4: System

**Backup & restore**
- Export config form: auto-export folder picker + frequency picker.
- Last export time display (`getLastExportTime`).
- Manual export buttons (one per configured path).
- Single import button + file picker flow (existing `pickImportFilePath` + `importBackup`).

**Danger zone**
- Visual separator (red horizontal rule) ABOVE this subsection.
- "Delete all data" button → existing two-step modal (`showDeleteModal` state).
- "Delete all Bingoals data" button → existing two-step modal.

Danger sits at the bottom of System panel, NOT a separate rail entry — keeps the rail tight (4 items) and groups dangerous actions with their data context.

---

## Responsive

| Width | Rail | Right panel |
|---|---|---|
| ≥ 900px | Expanded — 220px, icon + label | Padding 32px |
| < 900px | Collapsed — 56px, icon-only | Padding 24px |

CSS-driven (no JS `matchMedia`).

At < 900px:
- Rail labels hidden via `display: none`.
- Hover on a rail item shows a tooltip with the label (`.obs-settings-rail-tooltip`).
- Active state still visible via left border + bg.

At ≥ 1400px (4K):
- Content max-width 720px, centered in the right panel — keeps form rows readable.

---

## CSS class summary

Prefix: `obs-settings-*` so the new classes don't collide with the existing `.settings-*` ones in `DefaultSettings`.

```
.obs-settings-root         — page root, fills the obsidian main-content area
.obs-settings-layout       — flex row: rail + panel
.obs-settings-rail         — left rail container (sticky)
.obs-settings-rail-header  — "Settings" label at top of rail
.obs-settings-rail-item    — one nav item
.obs-settings-rail-item--active
.obs-settings-rail-tooltip — shown on hover when rail collapsed

.obs-settings-panel        — right panel container
.obs-settings-panel-title  — large h1 at top of panel
.obs-settings-panel-subtitle — optional muted subtitle
.obs-settings-section      — one sub-section inside a panel
.obs-settings-section-label — uppercase muted label above each sub-section

.obs-settings-toggle       — checkbox + label row (used for boolean toggles)
.obs-settings-danger-rule  — red horizontal rule above the danger zone

.obs-settings-hint         — small muted hint text (reuses existing `.settings-hint` if convenient)
```

Reused existing classes: `.form-group`, `.modal-overlay`, `.modal-content`, `.danger-modal-*`, `.theme-color-select`, `.card-select-theme`, etc.

---

## i18n additions

Add to `src/lib/i18n.ts` (in every locale):

| Key | English |
|---|---|
| `settings.look_and_feel` | "Look & feel" |
| `settings.learning` | "Learning" |
| `settings.system` | "System" |
| `settings.audio` (already exists) | — |

Translations are bundled with the implementation task; no separate translator workflow.

---

## What stays unchanged

- Existing `DefaultSettings` (renamed body of current `Settings`) — used for all non-obsidian themes
- All business logic
- All other i18n strings
- All other CSS classes
- `CustomSelect`, `BingoModal`, raw input pattern
- The 144 unit tests

---

## Out of scope (deferred)

- URL-hash routing for active rail category (`/settings#audio`)
- Search-across-settings input
- Drag-to-resize rail width
- Customizable rail items / per-user ordering
- Migration of the `DefaultSettings` body to also use the rail pattern (would replace both variants with one component)
- Refactor of the audio module's per-SFX grouping data structure

---

## Testing

No unit tests added — pure UI restructure.

Manual smoke checklist:
- Switch to any obsidian-* theme → `/settings` → new left-rail UI loads with `Look & feel` selected by default
- Click each of the 4 rail categories → right panel updates, fade-in animation plays
- Theme picker still works (hover preview, click apply, persistence)
- Language change still works
- Week-start change still works
- Metacognition log day change still works
- Launch at login toggle still works
- Performance mode toggle still works
- Spaced repetition input + reset still work
- Keyboard shortcut list renders
- Audio master volume slider + mute toggle work
- Per-SFX sliders + test buttons work
- Export config save + manual export still work
- Import still works
- Delete-all-data confirms still require typed "delete" keyword
- Delete-all-bingoals confirms still require typed "delete" keyword
- Resize window narrow → rail collapses to icons-only, tooltip on hover
- Switch back to a non-obsidian theme (`pastel`) → old `DefaultSettings` UI returns
- `npx tsc --noEmit` clean
- All 144 existing tests still pass
