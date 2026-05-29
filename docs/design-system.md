# Study Buddy — Design System

A comprehensive reference for the visual language of this app: tokens, components, layouts, theming, accessibility, and the current audit findings.

This document is descriptive (what *is*) and prescriptive (what to *do* next). It is the single source of truth when adding a new theme, a new page, or a new component.

**Last updated:** 2026-05-29

---

## Table of contents

1. [Overview & philosophy](#1-overview--philosophy)
2. [Design tokens](#2-design-tokens)
3. [Component classes](#3-component-classes)
4. [Layout patterns](#4-layout-patterns)
5. [Theme creation guide](#5-theme-creation-guide)
6. [Accessibility & contrast](#6-accessibility--contrast)
7. [Audit — current state of compliance](#7-audit--current-state-of-compliance)
8. [Change history](#8-change-history)

---

## 1. Overview & philosophy

The design system is **CSS-custom-property-driven**. Every color, radius, shadow, transition, font, and heatmap step lives in a small set of named tokens. Components consume tokens via `var(--token-name)`. Themes override tokens. Components themselves are theme-agnostic.

### Three layers

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1 — Token contract                                   │
│  ~25 CSS custom properties defined on `:root` and on every  │
│  `[data-theme="X"] { ... }` selector. Names are stable; per- │
│  theme values vary. Token names never change without a      │
│  migration; values can be swapped freely.                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 2 — Component classes                                │
│  `.glass`, `.btn`, `.btn-primary`, `.card`, `.pill`, `.muted`, │
│  `.row`, `.form`, modal/input/sidebar/page-header patterns. │
│  Each class is defined once in `src/index.css` (or feature  │
│  CSS) and consumes tokens via `var()`. No theme-specific     │
│  values inline.                                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 3 — Pages & features                                 │
│  React components compose layer-2 classes. Pages never       │
│  define raw colors; they read tokens or use layer-2 classes. │
└─────────────────────────────────────────────────────────────┘
```

### Three rules

1. **One source of truth per token.** Add a new color requirement → add a new token (don't hardcode).
2. **Themes override tokens, never component classes.** Want a different button shape in a theme? Override `--border-radius`, not `.btn { border-radius: ... }`.
3. **Components consume `var(--token)`, not raw colors.** A grep for `#[0-9a-f]{3,6}` outside the theme blocks should return zero matches in component code.

When you find code that violates these rules, it is a design-system debt entry — log it in the audit (section 7).

---

## 2. Design tokens

Tokens are declared on `[data-theme="X"] { ... }` selectors in `src/index.css`. The base obsidian theme at `src/index.css:6610` is the canonical reference; the other 12 obsidian variants (added 2026-05-29) follow the same structure.

### 2.1 Surface tokens

| Token | Purpose | Obsidian default | Where consumed |
|---|---|---|---|
| `--bg-color` | Page-level background | `#0d1117` | Body, layout root, `.input-bg-focus` fallback |
| `--bg-gradient` | Used where a gradient is wanted, otherwise falls back to a solid color | `#0d1117` | Some theme-specific decorative surfaces |
| `--card-bg` | Card / panel / sidebar background | `#161b22` | `.glass`, `.card`, `.panel`, `.sidebar-bg`, `.bubble-bg` |
| `--surface-raised` | A slightly lifted card (used for nested cards or hover state) | `#21262d` | Component-specific raised UIs |
| `--border-color` | Default border on cards and dividers | `#30363d` | `.glass`, `.card`, dividers, table separators |
| `--sidebar-bg` | Sidebar background (often same as card-bg) | `#161b22` | `.obsidian-sidebar`, default sidebar |
| `--glass-border` | Border for `.glass` containers | `#30363d` | `.glass` |
| `--bubble-bg` | Background for chat-bubble / quote-bubble patterns | `#161b22` | Chat-style components |

### 2.2 Accent tokens

| Token | Purpose | Obsidian default | Where consumed |
|---|---|---|---|
| `--primary` | Primary brand / accent color | `#58a6ff` | `.btn-primary`, focus rings, progress fills, active states |
| `--primary-rgb` | Same as `--primary` but as `R, G, B` triplet for use in `rgba()` | `88, 166, 255` | `box-shadow` glows, `rgba()` overlays |
| `--primary-hover` | Hover state for primary buttons / links | `#79b8ff` | `.btn-primary:hover` |
| `--secondary` | Secondary accent (less prominent than primary) | `#3fb950` | `.btn-secondary` |
| `--accent` | Tertiary highlight (used in gradients, decorations) | `#d29922` | `.btn-primary` gradient end, badges |

### 2.3 Semantic tokens

| Token | Purpose | Obsidian default |
|---|---|---|
| `--success` | Success states, "done" indicators | `#3fb950` |
| `--danger` | Error states, destructive actions, stop/cancel | `#f85149` |

### 2.4 Text tokens

| Token | Purpose | Obsidian default |
|---|---|---|
| `--text-dark` | Primary text color on dark backgrounds (despite the name, it's whatever color is most readable on `--bg-color`) | `#e6edf3` |
| `--text-light` | Brightest text (headings on dark, used sparingly) | `#ffffff` |
| `--text-muted` | Secondary text — labels, captions, hints, disabled states | `#7d8590` |

> The name `--text-dark` is historical (it meant "dark text on light bg"). In dark themes this is the *light* color. Rename is on the audit list (section 7).

### 2.5 Form tokens

| Token | Purpose | Obsidian default |
|---|---|---|
| `--input-border` | Default border on inputs / selects / textareas | `#30363d` |
| `--input-bg-focus` | Background when input is focused | `#0d1117` |
| `--input-focus-ring` | Focus ring (typically `rgba(var(--primary-rgb), 0.2)`) | `rgba(88, 166, 255, 0.2)` |

### 2.6 Typography

| Token | Purpose | Obsidian default |
|---|---|---|
| `--font-main` | Default body font | `'IBM Plex Sans', sans-serif` |
| `--font-heading` | Headings font (often same as body for cohesion) | `'IBM Plex Sans', sans-serif` |

The base app fonts are loaded via `@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');` at the top of `src/index.css`. IBM Plex Sans for obsidian themes is referenced by name and assumed to be available; fallback is the system sans-serif.

### 2.7 Radius

| Token | Purpose | Obsidian default |
|---|---|---|
| `--border-radius` | Default radius for cards, modals, popovers | `6px` |
| `--border-radius-sm` | Small radius for buttons, chips, inputs | `4px` |

Non-obsidian themes inherit the legacy default (cards use generous radii). When designing a new variant intentionally, override these per-theme.

### 2.8 Shadows

| Token | Purpose | Obsidian default |
|---|---|---|
| `--shadow-sm` | Subtle elevation (resting cards) | `0 1px 3px rgba(0, 0, 0, 0.4)` |
| `--shadow-md` | Mid elevation (hovered cards, dropdowns) | `0 1px 3px rgba(0, 0, 0, 0.4)` |
| `--shadow-lg` | High elevation (modals, popovers) | `0 2px 6px rgba(0, 0, 0, 0.5)` |

In obsidian, `--shadow-sm` and `--shadow-md` are intentionally the same — the design language is flat. In Sailor Moon / Pastel themes the elevation steps are more dramatic.

### 2.9 Motion

| Token | Purpose | Obsidian default |
|---|---|---|
| `--transition` | Default transition for hover / state changes | `all 0.15s ease` |

Individual components are free to use a custom transition when needed (e.g., overlay slide-up uses `cubic-bezier(0.32, 0.72, 0, 1)` for a snappier feel). Use the token for "default UI feel"; reach for custom curves when the interaction deserves it.

### 2.10 Heatmap (data viz)

| Token | Purpose | Obsidian default |
|---|---|---|
| `--h-0` | Coldest heatmap step (no activity) | `#161b22` |
| `--h-1` | Low activity | `#0e4429` |
| `--h-2` | Mid activity | `#006d32` |
| `--h-3` | High activity | `#26a641` |
| `--h-4` | Highest activity | `#39d353` |

In variant themes these are derived from `--card-bg` and `--primary` via `color-mix(in srgb, ...)` so a 5-step gradient is auto-generated.

### 2.11 Derivation patterns (variant themes only)

The 12 obsidian variants (added 2026-05-29) use modern CSS `color-mix()` to derive secondary tokens from the small set of "given" tokens:

| Derived | Recipe |
|---|---|
| `--surface-raised` | `color-mix(in srgb, var(--card-bg) 92%, white)` |
| `--border-color` | `color-mix(in srgb, var(--card-bg) 82%, white)` |
| `--primary-hover` | `color-mix(in srgb, var(--primary) 90%, white)` |
| `--text-light` | `color-mix(in srgb, var(--text-dark) 94%, white)` |
| `--text-muted` | `color-mix(in srgb, var(--text-dark) 50%, var(--bg-color))` |
| `--h-1` | `color-mix(in srgb, var(--card-bg) 75%, var(--primary))` |
| `--h-2` | `color-mix(in srgb, var(--card-bg) 50%, var(--primary))` |

`color-mix()` requires Chromium 111+ (Electron 24+). The base obsidian theme uses pre-computed hex; variants use `color-mix()` to keep author effort manageable.

---

## 3. Component classes

### 3.1 Layout primitives

| Class | File | Purpose | Tokens consumed |
|---|---|---|---|
| `.glass` | `src/index.css:1316` | Translucent card with blur; the default container for grouping content | `--card-bg`, `--glass-border`, `--border-radius`, `--shadow-sm` |
| `.card` | various | Solid card (used in Bingoals dashboard, Settings sections) | `--card-bg`, `--border-color`, `--border-radius`, `--shadow-sm` |
| `.panel` | `src/index.css` (Bingoals + others) | A card-like container used in the original Bingoals full view | `--card-bg`, `--border-color`, `--border-radius`, padding 14px |
| `.pill` | `src/index.css` | Small rounded tag (e.g., `100%` progress badge) | `rgba(255,255,255,0.08)` background, `var(--text-dark)` |
| `.muted` | `src/index.css` | Apply muted text color | `--text-muted` |
| `.row` | `src/index.css` | A flex row container (`display: flex; align-items: center;`) | — (layout-only) |
| `.form` | `src/index.css` | A vertical stack inside a modal (`display: flex; flex-direction: column; gap: 12px;`) | — (layout-only) |
| `.container` | `src/index.css:1398` | Max-width 1200px centered with 24px padding | — (layout-only) |

### 3.2 Buttons

| Class | File | Visual | Notes |
|---|---|---|---|
| `.btn` | `src/index.css:1324` | Default pill button (radius 100px, padding 10px 20px, font-weight 600) | Base for all variants. In obsidian themes the radius is overridden to `--border-radius-sm` (4px). |
| `.btn-primary` | `src/index.css:1340` | Gradient `var(--primary)` → `var(--accent)` with `rgba(var(--primary-rgb), 0.4)` glow shadow | In obsidian themes the gradient is replaced with a solid `var(--primary)` background and `var(--bg-color)` text. |
| `.btn-secondary` | `src/index.css:1360` | Solid `var(--secondary)` background, `var(--text-dark)` text | Less prominent action. |
| `.btn-danger` | `src/index.css` | Solid `var(--danger)` background | Destructive action (delete, cancel session). |
| `.btn-danger-outline` | `src/index.css` (Settings) | Transparent with red border + red text | Used inside delete-confirm modals. |
| `.btn-icon` | `src/index.css:1369` | 34×34 circular, transparent, `var(--text-muted)` icon | Hover lifts to `var(--text-dark)`. |
| `.btn-icon.bingo-delete-btn` | Bingoals CSS | Smaller variant with delete affordance | Used in Bingoals timer footer. |

**State conventions:**

- `:hover` — `translateY(-2px)` lift + brighter shadow for primary; opacity bump for icon buttons.
- `:active` — `scale(0.97)` press feedback (in `--transition` time).
- `:focus-visible` — `outline: 2px solid var(--primary)` with `2px` offset. Defined globally at `src/index.css:1391`.
- `:disabled` — opacity 0.5 + `cursor: not-allowed`.

### 3.3 Inputs

| Class | Purpose | Notes |
|---|---|---|
| `.numInput` | Number input (used for counters, target values, current value) | Small, monospaced numeric look. |
| `.titleInput` | Inline title editing input (e.g., when clicking a card title to rename) | Inherits font size + weight from the displayed title. |
| `.unitInput` | Inline unit text input | Small, italic-ish. |
| `.bingo-quote-textarea` | Quote textarea (added 2026-05-28 alongside multi-line quote support) | 120px min-height, monospace, `white-space: pre-wrap`. |
| `CustomSelect` (React component) | Custom dropdown that respects theme tokens | Used in Settings for theme picker, week-start, etc. Imported from `src/components/CustomSelect.tsx`. |

All inputs share:
- `border: 1px solid var(--input-border)`
- Focus: `border-color: var(--primary)` + ring via `box-shadow: 0 0 0 3px var(--input-focus-ring)` (or similar).
- Background `var(--card-bg)` resting, `var(--input-bg-focus)` on focus.

### 3.4 Navigation

| Class | Purpose | Notes |
|---|---|---|
| `.nav-item` | Sidebar nav link | Active state shows `var(--primary)` text or background depending on theme. |
| `.obsidian-sidebar` | Obsidian sidebar wrapper | Replaces the default sidebar inside the obsidian layout. |
| `.nav-review-dot` | Small indicator dot for SRS-due reviews | `var(--accent)` color. |

### 3.5 Modals

The app uses **two modal patterns**:

| Pattern | File | Used by |
|---|---|---|
| `BingoModal` (React component) | `src/components/bingoals/BingoModal.tsx` | All Bingoals modals (`AddSubobjectiveModal`, `AddQuoteModal`, `AddLinkModal`, `TimeEditModal`, `QuickAddTimeModal`) |
| `.modal-overlay` + `.modal-content` (raw CSS pattern) | `src/index.css`, used in `src/pages/Settings.tsx:262` | Settings danger modal, some legacy flows |

Both follow the same visual language:
- Backdrop: `rgba(0, 0, 0, 0.6+)`
- Body: `var(--card-bg)`, `var(--border-radius)`, `var(--shadow-lg)`
- Close on backdrop click + ESC key
- Two-click delete confirmation for destructive operations (added 2026-05-28 in `MemoryLightbox` / `QuoteLightbox`)

Additionally added 2026-05-28 for the Bingoals memories view:
- `MemoryLightbox` — full-screen image viewer
- `QuoteLightbox` — full-screen quote viewer (large italic centered text)

### 3.6 Page header pattern

`src/index.css:3260`:

```css
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 32px;
  flex-wrap: wrap;
  gap: 16px;
}
```

Historically every page used:

```tsx
<div className="page-header">
  <div className="page-title-group">
    <div className="icon-wrapper bg-X"><Icon size={20} /></div>
    <h1>Page Title</h1>
  </div>
</div>
```

The sidebar already shows the active page, so on `Learning`, `MetacognitionLogs`, `Settings`, and `BingoDashboard` this block was redundant and was removed on 2026-05-29 (see audit). On pages still using it (`Home`, `Analytics`, `Dev`, `Plan`, `ObsidianPlanner`, `BingoObjectivePage` via its custom `objPage-header`), the block plays a secondary role: page-specific actions sit on the right of the header (e.g., the Plan page has filter chips, the Bingoals dashboard had its year-nav until cleanup moved it into `.bingo-toolbar`).

**Recommendation:** new pages should NOT include `.page-header` with an icon + title block. If the page has actions, group them in a thin `*-toolbar` div (right-aligned) and let the sidebar do the page-name work.

### 3.7 Bingoals-specific component classes

Documented here because they are complete, self-contained patterns; reuse them or learn from them.

| Class | File | Purpose |
|---|---|---|
| `.bingoals-root` | `src/styles/bingoals.css:9` | Root wrapper for any Bingoals page. Owns 24px / 32px (1200px+) padding so the obsidian layout has page gutters. |
| `.objPage-header` | `src/styles/bingoals.css:1981` | Custom page header for `BingoObjectivePage` (replaces the default `.page-header`). |
| `.objPage-layout` | `src/styles/bingoals.css:2096` | 3-column responsive layout for `BingoObjectivePage`. |
| `.objPage-layout--memories`, `--full` | `src/styles/bingoals.css` | View-specific overrides. Memories view hides active+memories cols; full view goes column. |
| `.memStrip-*` | `src/styles/bingoals.css:2607+` | Memories view strips: header + horizontal-scrolling memory track. |
| `.subFullCard-*` | `src/styles/bingoals.css` | Full-view dense card with cover, title, percent, links, timer panel. |
| `.subGridTile-*` | `src/styles/bingoals.css` | Grid view tile with cover background + title + chips. |
| `.subCompactChip`, `.subCompactAddLink` | `src/styles/bingoals.css` | Link chip + `+ link` button. Reused by `memStrip` and `subFullCard`. |
| `.bingo-instrument-face`, `.bingo-instrument-timer`, etc. | `src/styles/bingoals.css` | Timer face skeuomorphic styling (dark inset, monospace face, edit + quick-add icons). |
| `.bingo-toolbar` | `src/styles/bingoals.css` (added 2026-05-29) | Replaces redundant `.page-header` on `BingoDashboard`; right-aligned action row. |

---

## 4. Layout patterns

The app has TWO top-level layout shells, switched at runtime by the active theme.

### 4.1 Obsidian layout

**Trigger:** `theme.startsWith('obsidian')` in `Layout.tsx:343` (fixed from strict equality on 2026-05-29).

**Structure:**

```
<div className="layout obsidian-layout">
  <nav className="obsidian-sidebar"> ... nav items ... </nav>
  <div className="obsidian-main-wrapper">
    <main className="main-content">
      <Outlet />
    </main>
    <div className="obsidian-quote-bar"> ... quote of the day ... </div>
  </div>
</div>
```

**Key CSS rules** (`src/components/Layout.css`):

```css
.obsidian-main-wrapper { flex: 1; display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
.obsidian-main-wrapper .main-content { flex: 1; overflow-y: auto; padding: 0; }  /* ← critical */
.obsidian-main-wrapper .page-route-transition { flex: 1; display: flex; flex-direction: column; }
.obsidian-main-wrapper .top-decoration { display: none; }
```

**Consequence:** `.main-content { padding: 0 }` in this layout means **each page is responsible for its own padding**. Pages that fail to provide gutters render edge-to-edge.

**Pages that handle their own padding correctly** under obsidian:
- `ObsidianHome` — own internal padding
- `ObsidianAnalytics` — own internal padding
- `ObsidianPlanner` — own internal padding
- `.bingoals-root` — defines `padding: 24px` (32px at 1200px+), so Bingoals pages get gutters

**Pages that need padding owners** (audit entries):
- Learning Center (uses default styling under obsidian — needs an `ObsidianLearning` variant or its own padding)
- Settings (same)
- Metacognition Logs (same)

### 4.2 Default layout

**Trigger:** all non-obsidian themes (the second return path in `Layout.tsx:504`).

**Structure:**

```
<div className="layout default-layout ...">
  <nav className="default-sidebar"> ... </nav>
  <main className="main-content">
    <div className="top-decoration"></div>
    <Outlet />
  </main>
</div>
```

**Key CSS rule** (`src/index.css:3174`):

```css
.main-content { padding: 40px; position: relative; min-height: 100vh; }
```

**Consequence:** pages get free gutters automatically. No page-level padding required.

### 4.3 When each is used

The theme gate at `Layout.tsx:343` decides. Additionally, three pages have their own per-theme component switch:

| Page | Gate | Default | Obsidian variant |
|---|---|---|---|
| `/` | `Home.tsx:459` | `<DefaultHome />` (inline) | `<ObsidianHome />` |
| `/analytics` | `Analytics.tsx:41` | `<DefaultAnalytics />` (inline) | `<ObsidianAnalytics />` |
| `/plan` | `Plan.tsx:527` | (inline default) | `<ObsidianPlanner />` |
| `/bingoals` | (no per-theme switch) | `<BingoDashboard />` | same component, themed via tokens |
| `/learning` | (no per-theme switch) | `<Learning />` | same component, default styled |
| `/settings` | (no per-theme switch) | `<Settings />` | same component, default styled |
| `/metacognition-logs` | (no per-theme switch) | `<MetacognitionLogs />` | same component, default styled |

All four gates use `theme.startsWith('obsidian')` (fixed 2026-05-29; previously strict `theme === 'obsidian'` excluded the 12 new variants).

---

## 5. Theme creation guide

A theme is a set of token values declared on a `[data-theme="X"] { ... }` selector. Adding one requires touching 3 files.

### 5.1 Files to touch

| File | Change |
|---|---|
| `src/index.css` | Append a `[data-theme="X"] { ... }` block (~38 lines) at the end of file. Include component overrides if you want a non-default look for `.glass`, `.btn`, `.btn-primary`. |
| `src/lib/settings.tsx:5` | Add the new ID string to the `Theme` union. |
| `src/pages/Settings.tsx` (around lines 113–169) | Append a `ThemeOption` entry to whichever theme group the new variant belongs in (`Sailor Moon`, `Terminal`, `Art`, `Modern & Experimental`, `Redesign`). |

### 5.2 Required tokens checklist

Every theme block MUST define these 25 tokens. Use the obsidian variant template (`src/index.css:6610+` and the 12 variants below it) as a starting point.

- Surface: `--bg-color`, `--bg-gradient`, `--card-bg`, `--surface-raised`, `--border-color`, `--sidebar-bg`, `--bubble-bg`, `--glass-border`
- Accent: `--primary`, `--primary-rgb`, `--primary-hover`, `--secondary`, `--accent`
- Semantic: `--success`, `--danger`
- Text: `--text-dark`, `--text-light`, `--text-muted`
- Form: `--input-border`, `--input-bg-focus`, `--input-focus-ring`
- Typography: `--font-main`, `--font-heading`
- Spacing: `--border-radius`, `--border-radius-sm`
- Shadow: `--shadow-sm`, `--shadow-md`, `--shadow-lg`
- Motion: `--transition`
- Heatmap: `--h-0`, `--h-1`, `--h-2`, `--h-3`, `--h-4`

### 5.3 Optional component overrides

If you want the theme to feel different (not just look different), add these overrides after the token block:

```css
[data-theme="X"] .glass {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  backdrop-filter: none;            /* solid card look instead of blurred */
}

[data-theme="X"] .btn { border-radius: var(--border-radius-sm); }

[data-theme="X"] .btn-primary {
  background: var(--primary);        /* solid instead of gradient */
  color: var(--bg-color);            /* high-contrast on the accent */
}

[data-theme="X"] .btn-primary:hover { background: var(--primary-hover); }
```

These four overrides are the obsidian fingerprint. Skip them if you want the base "gradient + radius-100px" feel.

### 5.4 Audio theme handling

`setAudioTheme(settings.theme)` is called from `src/lib/settings.tsx:64` whenever the theme changes. The audio module (`src/lib/sounds`) only knows a closed set of audio palettes; for unknown theme strings it falls back to the default audio set. New variants will pass through and use the default audio — this is intentional, not a bug.

If you want a new audio palette per theme:
- Add audio assets under `public/sounds/<palette-name>/`
- Extend `src/lib/sounds` to recognize the theme name and route accordingly

### 5.5 Theme inheritance pattern (obsidian variants)

If a new theme is "obsidian with different accent colors" (like the 12 variants added 2026-05-29):

1. Use the same `IBM Plex Sans` font.
2. Use the same `6px` / `4px` radius scale.
3. Use the same shadow + transition scale.
4. Override only the 8 "given" tokens (`--bg-color`, `--card-bg`, `--primary`, `--primary-rgb`, `--secondary`, `--accent`, `--success`, `--danger`, `--text-dark`).
5. Derive the rest with `color-mix(in srgb, ...)` (see Section 2.11).
6. Include the obsidian component overrides verbatim (`.glass`, `.btn`, `.btn-primary`, `.btn-primary:hover`).
7. **Name it `obsidian-<flavor>` so the theme gates in `Layout`, `Home`, `Analytics`, `Plan` automatically route the obsidian layout + obsidian page components.**

### 5.6 Picker entry template

```ts
{
  id: 'X',                            // matches Theme union + data-theme
  name: 'Display Name',
  color: '#<primary-hex>',            // shown as a dot in the swatch
  background: 'linear-gradient(135deg, #<bg> 0%, #<card> 50%, #<primary> 100%)',
}
```

The `background` field is optional but recommended — the picker uses it for the larger swatch preview.

---

## 6. Accessibility & contrast

### 6.1 Target

The project aims for **WCAG AA**:
- 4.5:1 contrast for body text
- 3:1 contrast for large text (≥18pt or ≥14pt bold) and UI components (button borders, focus rings)

These targets are not measured in CI today; they are a design constraint that authors apply when defining new themes or adjusting tokens.

### 6.2 Focus visibility (already enforced globally)

```css
button:focus-visible,
a:focus-visible,
[tabindex]:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
```

This works across every theme because it uses the `--primary` token. Don't override it per-theme.

### 6.3 Per-theme high-level contrast notes

Themes that currently meet AA cleanly:
- All `obsidian-*` variants (token palettes are picked from the source design systems they reference, which are themselves AA-aligned).
- `pastel` (default)
- `classic-uniform`, `chibi-moon`, `transformation-ribbon`

Themes with possible contrast risks (not audited rigorously, flagged for follow-up):
- `terminal-acid` — bright green on green
- `cyber-scan` — neon green on near-black is fine; secondary accents on bright bg may not be
- `tdr-warp` — yellow accent on light surfaces

### 6.4 Common pitfalls (encountered + fixed this week)

Each of these came up in real bugs. Document so the next theme author doesn't repeat them.

1. **Black-on-black via `.panel` scope.** Some button rules were scoped under `.panel` (`src/styles/bingoals.css:1545–1565`). When the button moved into a non-panel parent (`.subFullCard`, the upcoming `.memStrip`), it fell back to theme defaults that happened to be dark-on-dark. Fix: drop the `.panel` ancestor and define the rule directly. (Fixed 2026-05-28.)
2. **Over-aggressive opacity.** `.bingo-mark-done-btn { opacity: 0.65 }` and `.bingo-memory-action-btn { opacity: 0.55 }` cut text contrast below readable. Fix: bump to 0.85 and add an explicit neutral palette (`rgba(255,255,255,0.06)` background + `rgba(255,255,255,0.16)` border + `color: inherit`). (Fixed 2026-05-28.)
3. **`.btn-primary` text color vs `--primary` background.** In the obsidian themes the button background IS `var(--primary)`, so the text MUST contrast with primary. Obsidian uses `var(--bg-color)` (very dark) for button text. If a theme uses a bright `--primary` (cyber green, neon yellow), `var(--bg-color)` still works because bg is dark. If a future theme uses a *medium-brightness* primary on a *medium-brightness* bg, manually pick a contrast color in the `.btn-primary` override.
4. **`.subActiveTitle` opacity 0.85.** Caused a faint title in the active panel. Fix: opacity 1 and weight 800. (Fixed 2026-05-28.)
5. **`.glass` blur on dark bg.** `backdrop-filter: blur(10px)` is the default but reduces contrast on busy backgrounds. Obsidian overrides to `backdrop-filter: none` for clarity.

### 6.5 Recommended pattern for action buttons in feature CSS

Use a neutral palette that survives every theme:

```css
.your-action-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.16);
  color: inherit;
  opacity: 0.85;
}

.your-action-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  opacity: 1;
}

.your-action-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
```

This pattern works on any dark theme without per-theme overrides because `color: inherit` picks up `--text-dark` automatically.

---

## 7. Audit — current state of compliance

A living list of where the codebase diverges from the system. Add entries when you discover them; remove entries when fixed.

### 7.1 Fixed this week

| Issue | Fix | Date | Commit |
|---|---|---|---|
| Redundant `.page-header` icon+title on Learning, MetacognitionLogs, Settings, BingoDashboard (sidebar already shows page name) | Removed; BingoDashboard year-nav moved to new `.bingo-toolbar` | 2026-05-29 | `bac9f78`, `c2fc530`, `02f7bea`, `609c2bf` |
| Strict `theme === 'obsidian'` excluded the 12 new obsidian variants from the obsidian layout and obsidian page components | Switched to `theme.startsWith('obsidian')` in `Layout.tsx`, `Home.tsx`, `Analytics.tsx`, `Plan.tsx` | 2026-05-29 | `6244aa2`, `9f4449a` |
| Black-on-black `Marquer terminé` / `+ Citation` / `+ Lien` / `Lire` buttons (rules scoped under `.panel`, didn't apply in `.subFullCard` / `.memStrip`) | Drop `.panel` ancestor; bump opacity; explicit neutral palette | 2026-05-28 | `ac1ccc7` |
| Bingoals page had zero edge gutter under obsidian layout (because `.obsidian-main-wrapper .main-content { padding: 0 }`) | `.bingoals-root { padding: 24px }` (32px at 1200px+) | 2026-05-28 | `b828ac6` |
| Bingoals memories view list column overflowed the row | `flex: 1 1 0` and dropped `width: 100%`, then hid `activeCol` + overlay entirely in memories view | 2026-05-28 | `89db635`, `982eaa7` |
| Bingoals memories view image/quote cards too small for a memories-focused view | 120/140/160 → 180/220/260; quote font 0.78rem → 0.95rem; clamp 4 → 7 lines | 2026-05-28 | `644965d` |
| Quote viewer reused inline expand (extra click required) | New `QuoteLightbox` mirroring `MemoryLightbox` | 2026-05-28 | `644965d` |
| Quote input was `<input>` so newlines impossible | `<textarea rows=6>` + `white-space: pre-wrap` on display | 2026-05-28 | `644965d` |

### 7.2 Open issues

| Issue | Notes | Priority |
|---|---|---|
| Learning Center has no obsidian-styled variant | Page renders default styling under obsidian themes. Sticks out next to `ObsidianHome` / `ObsidianAnalytics`. Candidate for `ObsidianLearning` component or a deeper rework. | High (user-requested) |
| Settings page has no obsidian-styled variant + 699 lines / 8 sections | Same as above. Also flagged by user for UX rework (tabs vs. accordion vs. search). | High (user-requested) |
| Metacognition Logs has no obsidian-styled variant | Same; smaller page, lower urgency. | Medium |
| `--text-dark` is misnamed in dark themes | Token name suggests "dark text" but holds the light text color in obsidian. Rename pass = touches every theme block + every consumer. | Low (cosmetic / docs) |
| `--shadow-sm` and `--shadow-md` are identical in obsidian | Intentional (flat design language) but breaks the implied elevation hierarchy. Either rename one or document. | Low |
| `setAudioTheme` falls back silently on unknown themes | No user-facing bug, but undocumented. Add to audio module docs. | Low |
| No CI contrast check | Adding `axe-core` or `pa11y` to CI would catch new contrast regressions. | Medium (future) |
| Component classes documented inconsistently | Some have inline comments, some don't. Doc this file is the canonical reference; remove redundant comments in source. | Low (incremental) |
| `BingoModal` and raw `.modal-overlay` are two patterns | Settings uses raw pattern; Bingoals uses component. Should converge on one. | Low |
| `.page-header` still used by some pages — purpose unclear | After 2026-05-29 cleanup, `Home`, `Analytics`, `Dev`, `Plan`, `ObsidianPlanner` still use it. Audit which need it and which don't. | Low |

### 7.3 Anti-patterns to grep for

Run these periodically:

```bash
# Strict theme equality (should use startsWith for theme families)
grep -rn "theme === 'obsidian'" src/

# Hardcoded colors outside theme blocks
grep -rn '#[0-9a-f]\{3,6\}' src/components src/pages \
  | grep -v 'data-theme=' \
  | grep -v '\.test\.'

# Rules scoped under .panel that may exclude new contexts
grep -rn '\.panel \.' src/styles src/index.css | head
```

---

## 8. Change history

### 2026-05-29
- **Initial version.** Captures the token inventory after the 12 new obsidian variants land. Documents the audit fixes from 2026-05-28 (Bingoals memories view) and 2026-05-29 (page-header cleanup + obsidian theme gating).

### Future
- Document new themes here when they're added.
- Document component-class additions / removals.
- Document audit issue resolutions (move from section 7.2 to 7.1).
