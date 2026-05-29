# Obsidian Theme Variants — Design Spec

## Goal

Add 12 new obsidian-aesthetic theme variants (4 required + 8 extras) so the user can pick a dark theme with the accent palette of their choice. Each variant defines its own full color palette (bg, card, surface, border, accents, heatmap) using the existing CSS custom property pattern.

## Context

The app already ships an `obsidian` theme (`src/index.css:6610–6673`) — a GitHub-style dark theme with blue accent (`#58a6ff`), driven by ~25 CSS custom properties under `[data-theme="obsidian"]`. The `Theme` union in `src/lib/settings.tsx:5` lists every registered theme. The theme picker in `src/pages/Settings.tsx:113–169` groups themes (`Sailor Moon`, `Terminal`, `Art`, `Modern & Experimental`, `Redesign`) and renders each as a swatch with `color` + optional `background` gradient.

New variants extend the `Redesign` group alongside the original `obsidian` and inherit the obsidian font (`IBM Plex Sans`), border-radius, shadow scale, and transition timing — but each variant defines its OWN full color palette so it can stand alone.

## Theme list (12 total)

Required (4):
1. `obsidian-terminal-green` — phosphor CRT green
2. `obsidian-terminal-orange` — amber CRT
3. `obsidian-designers-republic` — TDR hot pink + cyan + yellow
4. `obsidian-cyberpunk` — Cyberpunk 2077 yellow + cyan + red

Extras (8):
5. `obsidian-dracula`
6. `obsidian-nord`
7. `obsidian-monokai`
8. `obsidian-tokyo-night`
9. `obsidian-solarized-dark`
10. `obsidian-gruvbox`
11. `obsidian-catppuccin`
12. `obsidian-ayu`

---

## Color palettes

Each row gives the 8 primary tokens. Per-theme blocks also derive `--surface-raised`, `--border-color`, `--sidebar-bg`, `--glass-border`, `--input-border`, `--input-bg-focus`, `--bubble-bg`, `--bg-gradient`, `--primary-rgb`, `--primary-hover`, `--text-muted`, `--text-light`, `--input-focus-ring`, and the 5-step `--h-0`..`--h-4` heatmap from the same base palette.

| Theme | bg | card | primary | secondary | accent | success | danger | text-dark |
|---|---|---|---|---|---|---|---|---|
| `obsidian-terminal-green` | `#0a1a0c` | `#0f2412` | `#39ff14` | `#00b85d` | `#84ff5c` | `#39ff14` | `#ff5252` | `#c5fcc2` |
| `obsidian-terminal-orange` | `#1a0f00` | `#261800` | `#ff9e1f` | `#cc7a00` | `#ffd07a` | `#66ff66` | `#ff4d4d` | `#ffe8c2` |
| `obsidian-designers-republic` | `#0a0a14` | `#14142e` | `#ff0066` | `#00d4ff` | `#fff200` | `#00ff99` | `#ff3366` | `#f0f0ff` |
| `obsidian-cyberpunk` | `#0a0a0a` | `#1a1a1a` | `#fcee0a` | `#00f0ff` | `#ff003c` | `#00f0ff` | `#ff003c` | `#f0f0f0` |
| `obsidian-dracula` | `#282a36` | `#383a47` | `#bd93f9` | `#ff79c6` | `#f1fa8c` | `#50fa7b` | `#ff5555` | `#f8f8f2` |
| `obsidian-nord` | `#2e3440` | `#3b4252` | `#88c0d0` | `#81a1c1` | `#ebcb8b` | `#a3be8c` | `#bf616a` | `#eceff4` |
| `obsidian-monokai` | `#272822` | `#3e3d32` | `#f92672` | `#66d9ef` | `#e6db74` | `#a6e22e` | `#f92672` | `#f8f8f2` |
| `obsidian-tokyo-night` | `#1a1b26` | `#24283b` | `#7aa2f7` | `#bb9af7` | `#e0af68` | `#9ece6a` | `#f7768e` | `#c0caf5` |
| `obsidian-solarized-dark` | `#002b36` | `#073642` | `#268bd2` | `#2aa198` | `#b58900` | `#859900` | `#dc322f` | `#fdf6e3` |
| `obsidian-gruvbox` | `#282828` | `#3c3836` | `#fe8019` | `#b8bb26` | `#fabd2f` | `#b8bb26` | `#fb4934` | `#ebdbb2` |
| `obsidian-catppuccin` | `#1e1e2e` | `#313244` | `#cba6f7` | `#f5c2e7` | `#f9e2af` | `#a6e3a1` | `#f38ba8` | `#cdd6f4` |
| `obsidian-ayu` | `#1f2430` | `#232834` | `#ffcc66` | `#5ccfe6` | `#ffae57` | `#bae67e` | `#ff3333` | `#cbccc6` |

### Derived tokens per theme

For each theme block:

- `--bg-gradient` = `--bg-color`
- `--surface-raised` = card lightened ~8% (hand-picked per palette)
- `--border-color` = card lightened ~18% (hand-picked per palette)
- `--sidebar-bg`, `--bubble-bg` = same as `--card-bg`
- `--glass-border`, `--input-border` = same as `--border-color`
- `--input-bg-focus` = same as `--bg-color`
- `--primary-rgb` = primary expressed as `R, G, B` triplet
- `--primary-hover` = primary lightened ~10%
- `--text-muted` = ~50% blend of text-dark and bg
- `--text-light` = white or text-dark lightened ~6%
- `--input-focus-ring` = `rgba(<primary-rgb>, 0.2)`
- `--h-0` = `--card-bg`
- `--h-1` = blend(card, primary, 25%)
- `--h-2` = blend(card, primary, 50%)
- `--h-3` = `--primary`
- `--h-4` = `--primary-hover`

These derivations are committed to fixed hex values per theme during implementation (no runtime computation — CSS custom properties don't support color math without `color-mix()`, which is fine to use but the spec prefers pre-computed hex for legibility and broader browser support).

### Constants inherited from base obsidian (not redefined)

- `--font-main: 'IBM Plex Sans', sans-serif`
- `--font-heading: 'IBM Plex Sans', sans-serif`
- `--border-radius: 6px`
- `--border-radius-sm: 4px`
- `--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.4)`
- `--shadow-md: 0 1px 3px rgba(0, 0, 0, 0.4)`
- `--shadow-lg: 0 2px 6px rgba(0, 0, 0, 0.5)`
- `--transition: all 0.15s ease`

Each new theme block re-declares these because there is no CSS variable inheritance between `[data-theme=A]` and `[data-theme=B]` — declaring them keeps each variant self-contained.

### Component overrides per theme

The base obsidian theme also defines:

```css
[data-theme="obsidian"] .glass { background: var(--card-bg); border: 1px solid var(--border-color); backdrop-filter: none; }
[data-theme="obsidian"] .btn { border-radius: var(--border-radius-sm); }
[data-theme="obsidian"] .btn-primary { background: var(--primary); color: #0d1117; }
[data-theme="obsidian"] .btn-primary:hover { background: var(--primary-hover); }
```

Each variant re-declares these with the same structure but the `color: #0d1117` on `.btn-primary` is replaced with the variant's `--bg-color` value (or a hand-picked contrast color when the bg is too light to ensure legible button text).

---

## Architecture

**Files touched (3):**

| File | Change |
|---|---|
| `src/index.css` | Append 12 new `[data-theme="obsidian-X"] { ... }` blocks plus their `.glass`, `.btn`, `.btn-primary`, `.btn-primary:hover` overrides at the end of the obsidian section. |
| `src/lib/settings.tsx` | Extend the `Theme` union (line 5) with the 12 new string literals. |
| `src/pages/Settings.tsx` | Append 12 `ThemeOption` entries to the `Redesign` group's `themes` array (around line 159–168). |

**Naming convention:** `obsidian-<flavor>` (lowercase, kebab-case).

**No inheritance:** Each new theme defines its own full palette. Saves any risk of cross-theme bleed and matches the existing pattern of every other theme block.

**Original `obsidian` theme stays as the GitHub-blue default** in the same group.

**No audio-theme code touched.** `setAudioTheme` in `src/lib/sounds` already gets called with whatever `settings.theme` is and falls back gracefully on unknown strings — new variants will use the audio default of whatever its fallback is.

**Hover preview already works for any registered theme** — `handleThemeHover` in `Settings.tsx:180` directly sets `document.documentElement.setAttribute('data-theme', id)`. No new code.

---

## Settings picker entries

12 `ThemeOption` objects appended to the `Redesign` group's `themes` array:

```ts
{ id: 'obsidian-terminal-green',     name: 'Obsidian — Terminal Green',     color: '#39ff14', background: 'linear-gradient(135deg, #0a1a0c 0%, #0f2412 50%, #39ff14 100%)' },
{ id: 'obsidian-terminal-orange',    name: 'Obsidian — Terminal Orange',    color: '#ff9e1f', background: 'linear-gradient(135deg, #1a0f00 0%, #261800 50%, #ff9e1f 100%)' },
{ id: 'obsidian-designers-republic', name: 'Obsidian — TDR',                color: '#ff0066', background: 'linear-gradient(135deg, #0a0a14 0%, #14142e 50%, #ff0066 100%)' },
{ id: 'obsidian-cyberpunk',          name: 'Obsidian — Cyberpunk',          color: '#fcee0a', background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #fcee0a 100%)' },
{ id: 'obsidian-dracula',            name: 'Obsidian — Dracula',            color: '#bd93f9', background: 'linear-gradient(135deg, #282a36 0%, #383a47 50%, #bd93f9 100%)' },
{ id: 'obsidian-nord',               name: 'Obsidian — Nord',               color: '#88c0d0', background: 'linear-gradient(135deg, #2e3440 0%, #3b4252 50%, #88c0d0 100%)' },
{ id: 'obsidian-monokai',            name: 'Obsidian — Monokai',            color: '#f92672', background: 'linear-gradient(135deg, #272822 0%, #3e3d32 50%, #f92672 100%)' },
{ id: 'obsidian-tokyo-night',        name: 'Obsidian — Tokyo Night',        color: '#7aa2f7', background: 'linear-gradient(135deg, #1a1b26 0%, #24283b 50%, #7aa2f7 100%)' },
{ id: 'obsidian-solarized-dark',     name: 'Obsidian — Solarized',          color: '#268bd2', background: 'linear-gradient(135deg, #002b36 0%, #073642 50%, #268bd2 100%)' },
{ id: 'obsidian-gruvbox',            name: 'Obsidian — Gruvbox',            color: '#fe8019', background: 'linear-gradient(135deg, #282828 0%, #3c3836 50%, #fe8019 100%)' },
{ id: 'obsidian-catppuccin',         name: 'Obsidian — Catppuccin',         color: '#cba6f7', background: 'linear-gradient(135deg, #1e1e2e 0%, #313244 50%, #cba6f7 100%)' },
{ id: 'obsidian-ayu',                name: 'Obsidian — Ayu',                color: '#ffcc66', background: 'linear-gradient(135deg, #1f2430 0%, #232834 50%, #ffcc66 100%)' },
```

---

## Theme union update

In `src/lib/settings.tsx:5`, extend the existing pipe-separated string union by appending the 12 new IDs. Final union:

```ts
export type Theme = 'pastel' | 'neumorphism' | 'neobrutalism' | 'terminal-orange' | 'terminal-green' | 'terminal-red' | 'terminal-cyan' | 'terminal-amber' | 'terminal-acid' | 'terminal-blue' | 'classic-uniform' | 'cosmic-manicure' | 'chibi-moon' | 'transformation-ribbon' | 'honey-lemon' | 'ai-pro' | 'cyber-scan' | 'starry-night' | 'designers-republic' | 'tdr-blue' | 'tdr-ember' | 'tdr-night' | 'tdr-warp' | 'tdr-acid' | 'obsidian' | 'obsidian-terminal-green' | 'obsidian-terminal-orange' | 'obsidian-designers-republic' | 'obsidian-cyberpunk' | 'obsidian-dracula' | 'obsidian-nord' | 'obsidian-monokai' | 'obsidian-tokyo-night' | 'obsidian-solarized-dark' | 'obsidian-gruvbox' | 'obsidian-catppuccin' | 'obsidian-ayu';
```

---

## What stays unchanged

- Existing themes (24 entries) — no edits
- `setAudioTheme` and `src/lib/sounds`
- Theme picker structure (still grouped: Sailor Moon, Terminal, Art, Modern & Experimental, Redesign)
- Hover preview logic
- Theme persistence (localStorage via `useSettings`)
- All existing components (each consumes CSS custom properties, automatically picks up new themes)

---

## Testing

No unit tests added. The change is pure data (CSS custom properties + a string union).

Manual smoke checklist:
- Open Settings → Theme picker → `Redesign` section shows 13 entries (original `obsidian` + 12 new variants)
- Each new entry shows a correct swatch (linear gradient + primary color)
- Hover each → live preview applies to whole app (sidebar, cards, buttons, text)
- Click each → theme persists across page reload (localStorage)
- `npx tsc --noEmit` reports zero errors (type union accepts new strings)
- `npm test` passes (no logic touched, all 144 existing tests stay green)
- Visual spot check: cards, buttons, inputs, sidebar, heatmaps render correctly in each new theme — no contrast disasters, no missing variables
