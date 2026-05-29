# Unify on the Obsidian Redesign — Delete the Classic Theme System

**Date:** 2026-05-29
**Status:** Approved (big-bang execution)

## Goal

The Obsidian "Redesign" is now the preferred (and only desired) look. Convert
every remaining classic theme into an Obsidian token-variant (palette only),
migrate users off deleted theme IDs, then remove the entire classic system:
classic theme CSS, the classic `Layout` branch, the classic page bodies, and
the `isTerminal` structural special-casing.

Executed as a single change (big-bang), not phased.

## Decisions (locked)

- **Palette-only port.** Signature *structures* (Terminal monospace + CRT
  scanlines, TDR Swiss grid + zero-radius, Neumorphism soft shadows,
  Neobrutalism hard borders) are **dropped**. Only colors carry over.
- **Icon rail everywhere; Starry Night stays the lone exception** (wide
  painting sidebar + mascot, already built). No mascot on other themes.
- **Migration:** each deleted classic ID remaps to its color-equivalent
  Obsidian variant (silent, one-time, on settings load).
- **Default theme:** `pastel` → `obsidian-pastel`.
- **Labels drop the "Obsidian —" prefix** (Obsidian is the only system now).
- IDs keep the `obsidian-` prefix internally — `Layout` and pages gate on
  `theme.startsWith('obsidian')`.

## 1. Final theme list

24 classic themes map to Obsidian variants. **5 already exist** and need no new
CSS: `obsidian-terminal-green`, `obsidian-terminal-orange`,
`obsidian-designers-republic`, `obsidian-tdr-acid`, `obsidian-starry-night`.

**19 new variants to create** (palette source = the classic CSS block):

| New ID | Source classic | bg | primary | secondary | accent | text-dark | text-muted | mode |
|---|---|---|---|---|---|---|---|---|
| obsidian-pastel | pastel (:root) | #fce8f2 | #f08cb8 | #7ec8db | #f7c842 | #4a4453 | #6e6878 | light |
| obsidian-neumorphism | neumorphism | #e0e5ec | #9baec8 | #d1d9e6 | #ff914d | #3a4b63 | #6e84a3 | light |
| obsidian-neobrutalism | neobrutalism | #ffde59 | #ff5757 | #5ce1e6 | #5ce1e6 | #000000 | #333333 | light |
| obsidian-classic-uniform | classic-uniform | #f8f6fc | #c90928 | #fce31c | #fce31c | #121c3b | #576796 | light |
| obsidian-cosmic-manicure | cosmic-manicure | #1a0b33 | #ff1faa | #9024f2 | #00f0ff | #ffffff | #eaddf7 | dark |
| obsidian-chibi-moon | chibi-moon | #ffeff9 | #ff4db8 | #ffe16b | #e3002b | #5e1c44 | #a66a8e | light |
| obsidian-transformation-ribbon | transformation-ribbon | #e5d8f0 | #9d5ceb | #42b2b8 | #ffcc00 | #381f5e | #7354a6 | light |
| obsidian-honey-lemon | honey-lemon | #fff9c4 | #ffeb3b | #fbc02d | #ff5722 | #212121 | #757575 | light |
| obsidian-ai-pro | ai-pro | #070b14 | #7c3aed | #06b6d4 | #f59e0b | #e2e8f0 | #64748b | dark |
| obsidian-cyber-scan | cyber-scan | #050510 | #b8ff00 | #1133ff | #ff00aa | #d4ffaa | #4a6080 | dark |
| obsidian-terminal-red | terminal-red | #0d0000 | #ff1a1a | #cc0000 | #ff6666 | #e00000 | #cc0000 | dark |
| obsidian-terminal-cyan | terminal-cyan | #060a10 | #00d4ff | #0099bb | #00ffcc | #c8e8f0 | #4a7a8a | dark |
| obsidian-terminal-amber | terminal-amber | #100a00 | #ffaa00 | #cc7700 | #ff6600 | #f5d070 | #7a5a00 | dark |
| obsidian-terminal-acid | terminal-acid | #060a00 | #aaff00 | #77cc00 | #ccff66 | #aaff00 | #4d7300 | dark |
| obsidian-terminal-blue | terminal-blue | #00061a | #4499ff | #0066dd | #00ccff | #99ccff | #2a4a7a | dark |
| obsidian-tdr-blue | tdr-blue | #f0ede6 | #0055cc | #003d99 | #4488ee | #0d0d0d | #5a5a5a | light |
| obsidian-tdr-ember | tdr-ember | #f0ede6 | #e86000 | #bf4f00 | #ff9933 | #0d0d0d | #5a5a5a | light |
| obsidian-tdr-night | tdr-night | #0d0d0d | #ff1a2d | #cc0016 | #ff6677 | #f0ede6 | #888888 | dark |
| obsidian-tdr-warp | tdr-warp | #0d0d0d | #f5d000 | #c8aa00 | #ffe566 | #f0ede6 | #888888 | dark |

For `terminal-acid`, primary == text-dark (`#aaff00`). When porting, keep
`--text-dark` as the bright acid green (used as body text on near-black bg, OK);
`--primary` same. The global `.btn-secondary` rule (surface bg + `--text-dark`)
keeps contrast.

`success`/`danger`: reuse the classic values where the block defined them
(ai-pro, cyber-scan, pastel); otherwise use the Obsidian defaults
(`--success: #3fb950`, `--danger: #f85149`).

## 2. Port mechanic (per variant)

Each new block follows the existing Obsidian-variant template:

```css
[data-theme="obsidian-<name>"] {
  --font-main: 'IBM Plex Sans', sans-serif;
  --font-heading: 'IBM Plex Sans', sans-serif;
  --bg-color: <bg>;
  --bg-gradient: var(--bg-color);
  --card-bg: <derived>;
  --surface-raised: color-mix(in srgb, var(--card-bg) 92%, <white|black>);
  --border-color: color-mix(in srgb, var(--card-bg) 82%, <white|black>);
  --primary: <p>; --primary-rgb: <r,g,b>;
  --primary-hover: color-mix(in srgb, var(--primary) 90%, <white|black>);
  --secondary: <s>; --accent: <a>; --success: <ok>; --danger: <bad>;
  --text-dark: <td>;
  --text-light: color-mix(in srgb, var(--text-dark) 94%, <white|black>);
  --text-muted: <tm>;
  --border-radius: 6px; --border-radius-sm: 4px;
  --shadow-sm/md/lg: <indigo/neutral>;
  --transition: all 0.15s ease;
  --sidebar-bg: var(--card-bg);
  --glass-border/--input-*/--bubble-bg/--h-0..4: <derived>;
}
[data-theme="obsidian-<name>"] .glass { background: var(--card-bg); border: 1px solid var(--border-color); backdrop-filter: none; }
[data-theme="obsidian-<name>"] .btn { border-radius: var(--border-radius-sm); }
[data-theme="obsidian-<name>"] .btn-primary { background: var(--primary); color: var(--bg-color); }
[data-theme="obsidian-<name>"] .btn-primary:hover { background: var(--primary-hover); }
```

- **Dark** variants mix surfaces toward `white`; **light** variants mix toward
  `black` (the Catppuccin-Latte pattern, proven readable).
- `--card-bg` derivation: for dark, lighten bg ~8–12%; for light, darken bg
  ~4–8%. Pick concrete hexes per theme so cards are visibly distinct from bg.
- `.btn-secondary` needs no per-theme rule — the global
  `[data-theme="obsidian"], [data-theme^="obsidian-"] .btn-secondary` rule
  already handles it via `--surface-raised` + `--text-dark`.

## 3. Migration map (settings load)

In the settings normalization path (where the saved theme is read), apply:

```
pastel                 → obsidian-pastel
neumorphism            → obsidian-neumorphism
neobrutalism           → obsidian-neobrutalism
classic-uniform        → obsidian-classic-uniform
cosmic-manicure        → obsidian-cosmic-manicure
chibi-moon             → obsidian-chibi-moon
transformation-ribbon  → obsidian-transformation-ribbon
honey-lemon            → obsidian-honey-lemon
ai-pro                 → obsidian-ai-pro
cyber-scan             → obsidian-cyber-scan
starry-night           → obsidian-starry-night
designers-republic     → obsidian-designers-republic
terminal-orange        → obsidian-terminal-orange
terminal-green         → obsidian-terminal-green
terminal-red           → obsidian-terminal-red
terminal-cyan          → obsidian-terminal-cyan
terminal-amber         → obsidian-terminal-amber
terminal-acid          → obsidian-terminal-acid
terminal-blue          → obsidian-terminal-blue
tdr-blue               → obsidian-tdr-blue
tdr-ember              → obsidian-tdr-ember
tdr-night              → obsidian-tdr-night
tdr-warp               → obsidian-tdr-warp
tdr-acid               → obsidian-tdr-acid
```

Implemented as a `const LEGACY_THEME_MAP: Record<string, Theme>` consulted when
loading settings; if the stored theme is a key, replace it (and persist).

## 4. Type + theme-picker changes

- `Theme` union (`src/lib/settings.tsx`): remove the 24 classic IDs, add the 19
  new `obsidian-*` IDs. Result: only `obsidian*` IDs remain.
- `DEFAULT_SETTINGS.theme` → `'obsidian-pastel'`.
- `src/pages/settingsThemeGroups.ts`: rebuild groups containing only Obsidian
  variants; relabel without the "Obsidian —" prefix; add swatches for the 19
  new variants. Suggested groups: **Core** (obsidian, pastel, ai-pro,
  cyber-scan), **Editor** (dracula, nord, monokai, tokyo-night, solarized,
  gruvbox, ayu, catppuccin ×4), **Terminal** (7), **TDR** (signal/blue/ember/
  night/warp/acid), **Sailor Moon** (classic-uniform, cosmic-manicure,
  chibi-moon, transformation-ribbon), **Art** (starry-night, kokedera),
  **Playful** (neumorphism, neobrutalism, honey-lemon). Grouping is cosmetic;
  finalize during implementation.

## 5. Deletions

- **`src/index.css`** — remove every classic `[data-theme="…"]` block listed in
  §1 (pastel via `:root`, neumorphism, neobrutalism, terminal-* ×7,
  classic-uniform, cosmic-manicure, chibi-moon, transformation-ribbon,
  honey-lemon, ai-pro, cyber-scan, starry-night, designers-republic, tdr-* ×5).
  **Keep** all base, theme-agnostic rules (`.btn`, `.glass`, `.mascot-*`,
  `.page-header`, `.icon-gold`, animations, etc.). Repoint `:root` token values
  to the Obsidian default palette so the unstyled fallback is dark-redesign.
- **`src/components/Layout.tsx`** — delete the classic `return (<div
  className="layout">…)` branch (now always dead since every theme is
  `obsidian*`). Remove classic-only state/logic it solely fed: terminal typed-
  quote effect, classic mascot block, `isTerminal`/`glitchVariant` usage.
  Keep the Obsidian branch (incl. the Starry mascot path).
- **Pages** — for each gated page (`Home`, `Analytics`, `Plan`, `Learning`,
  `MetacognitionLogs`, `Settings`, `Dev`): collapse to rendering only the
  Obsidian variant; delete the classic component body. Then delete the now-
  orphaned classic CSS files (`Home.css`, `Analytics.css`, `Plan.css`,
  `Learning.css`, `MetacognitionLogs.css`, `Settings.css`, `Dev.css`) **after**
  grepping that no surviving component imports them or uses a class defined only
  there. If a class is shared, move it to `index.css` base instead of deleting.

## 6. `isTerminal` cleanup

- `src/lib/settings.tsx`: remove `isTerminalTheme`, drop `isTerminal` from the
  settings context type + value (3 sites).
- Shared components keep only the non-terminal (glass) path; delete the
  `isTerminal ? … : …` branches: `Session.tsx` (15), `MetacognitionMode.tsx`
  (12), `SubjectCard.tsx` (5), `WeeklyCompass.tsx` (2). Branches inside the
  deleted classic page bodies (`Learning`, `MetacognitionLogs`, `Plan`) vanish
  with those bodies.
- `src/lib/sounds.ts`: `auto` profile no longer keys off `startsWith('terminal-')`.
  Behavior: `auto` → glass for all themes; the explicit **Terminal** audio
  profile still forces terminal sounds. *(Optional polish: `auto` → terminal
  when the theme ID contains `terminal`.)*
- Remove any other dead references surfaced by grep (`glitchVariant`,
  `terminal-glitch-*`, terminal-quote classes).

## 7. Verification

1. `npx tsc --noEmit` clean.
2. `grep` for every deleted classic ID across `src/` — zero hits outside the
   migration map and this spec.
3. `grep` for `isTerminal`, `isTerminalTheme`, `glitchVariant`,
   `terminal-glitch` — zero hits.
4. Launch app; spot-check a representative set renders correctly on the
   redesign: 2 light (obsidian-pastel, obsidian-tdr-blue) + 2 dark
   (obsidian-cyber-scan, obsidian-terminal-amber) + starry (sidebar/mascot
   intact).
5. Manually set the stored theme to a legacy ID (e.g. `tdr-night`), reload,
   confirm it migrates to `obsidian-tdr-night` and persists.

## Out of scope

- No new theme palettes beyond the 1:1 classic ports.
- No structural redesign of Obsidian pages.
- No changes to Session/SubjectDetail/bingoals beyond removing `isTerminal`.
