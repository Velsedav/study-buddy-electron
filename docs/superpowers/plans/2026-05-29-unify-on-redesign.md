# Unify on the Obsidian Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert all 24 classic themes into Obsidian palette-variants, migrate saved themes, and delete the entire classic system (CSS, Layout branch, classic page bodies, `isTerminal` special-casing).

**Architecture:** Every theme becomes an `obsidian-*` ID rendered by the existing Obsidian layout + pages (gated on `theme.startsWith('obsidian')`). Classic themes are ported palette-only via the standard Obsidian-variant CSS template. A `migrateTheme()` lookup remaps deleted IDs on settings load. Order is chosen so the app compiles and runs after every task; destructive steps come after their references are gone.

**Tech Stack:** React + TypeScript, Vite, vitest, plain CSS custom properties (`[data-theme="…"]` blocks in `src/index.css`).

Spec: `docs/superpowers/specs/2026-05-29-unify-on-redesign-design.md`

---

## Conventions used in this plan

**Obsidian variant CSS template** (fill `<…>` per theme). `<MIX>` is `white` for
dark themes, `black` for light themes:

```css
[data-theme="<ID>"] {
  --font-main: 'IBM Plex Sans', sans-serif;
  --font-heading: 'IBM Plex Sans', sans-serif;
  --bg-color: <BG>;
  --bg-gradient: var(--bg-color);
  --card-bg: <CARD>;
  --surface-raised: color-mix(in srgb, var(--card-bg) 92%, <MIX>);
  --border-color: color-mix(in srgb, var(--card-bg) 82%, <MIX>);
  --primary: <PRIMARY>;
  --primary-rgb: <PRIMARY_RGB>;
  --primary-hover: color-mix(in srgb, var(--primary) 90%, <MIX>);
  --secondary: <SECONDARY>;
  --accent: <ACCENT>;
  --success: <SUCCESS>;
  --danger: <DANGER>;
  --text-dark: <TEXT_DARK>;
  --text-light: color-mix(in srgb, var(--text-dark) 94%, <MIX>);
  --text-muted: <TEXT_MUTED>;
  --border-radius: 6px;
  --border-radius-sm: 4px;
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, <SH>);
  --shadow-md: 0 1px 3px rgba(0, 0, 0, <SH>);
  --shadow-lg: 0 2px 6px rgba(0, 0, 0, <SH2>);
  --transition: all 0.15s ease;
  --sidebar-bg: var(--card-bg);
  --glass-border: var(--border-color);
  --input-border: var(--border-color);
  --input-bg-focus: var(--bg-color);
  --input-focus-ring: rgba(var(--primary-rgb), 0.2);
  --bubble-bg: var(--card-bg);
  --h-0: var(--card-bg);
  --h-1: color-mix(in srgb, var(--card-bg) 75%, var(--primary));
  --h-2: color-mix(in srgb, var(--card-bg) 50%, var(--primary));
  --h-3: var(--primary);
  --h-4: var(--primary-hover);
}
[data-theme="<ID>"] .glass { background: var(--card-bg); border: 1px solid var(--border-color); backdrop-filter: none; }
[data-theme="<ID>"] .btn { border-radius: var(--border-radius-sm); }
[data-theme="<ID>"] .btn-primary { background: var(--primary); color: var(--bg-color); }
[data-theme="<ID>"] .btn-primary:hover { background: var(--primary-hover); }
```

- Dark: `<SH>=0.4`, `<SH2>=0.5`. Light: `<SH>=0.12`, `<SH2>=0.16`.
- `<SUCCESS>` default `#3fb950`, `<DANGER>` default `#f85149` unless the row gives one.
- `.btn-secondary` needs no per-theme rule (covered by the global obsidian rule).

**Per-theme values** (ID, mode, BG, CARD, PRIMARY, PRIMARY_RGB, SECONDARY, ACCENT, TEXT_DARK, TEXT_MUTED, SUCCESS, DANGER):

```
obsidian-pastel                light  #fce8f2 #fff4f9 #f08cb8 240,140,184 #7ec8db #f7c842 #4a4453 #6e6878 #8ed85e #ca2200
obsidian-neumorphism           light  #e0e5ec #eef1f6 #9baec8 155,174,200 #d1d9e6 #ff914d #3a4b63 #6e84a3 (def)    (def)
obsidian-neobrutalism          light  #ffde59 #ffffff #ff5757 255,87,87   #5ce1e6 #5ce1e6 #1a1a1a #4a4a4a (def)    (def)
obsidian-classic-uniform       light  #f8f6fc #ffffff #c90928 201,9,40    #e0b800 #c90928 #121c3b #576796 (def)    (def)
obsidian-cosmic-manicure       dark   #1a0b33 #2a1550 #ff1faa 255,31,170  #9024f2 #00f0ff #f3e9ff #b89fd6 (def)    (def)
obsidian-chibi-moon            light  #ffeff9 #ffffff #ff4db8 255,77,184   #e0a800 #e3002b #5e1c44 #a66a8e (def)    #e3002b
obsidian-transformation-ribbon light  #e5d8f0 #f4eefb #9d5ceb 157,92,235  #42b2b8 #d9a800 #381f5e #7354a6 (def)    (def)
obsidian-honey-lemon           light  #fff9c4 #fffef2 #c79a00 199,154,0   #fbc02d #ff5722 #212121 #757575 (def)    #ff5722
obsidian-ai-pro                dark   #070b14 #131b2e #7c3aed 124,58,237  #06b6d4 #f59e0b #e2e8f0 #64748b #10b981 #ef4444
obsidian-cyber-scan            dark   #050510 #0e1430 #b8ff00 184,255,0   #1f4dff #ff00aa #d4ffaa #6a80a0 #00ff88 #ff2244
obsidian-terminal-red          dark   #0d0000 #1f0a0a #ff3b3b 255,59,59   #cc0000 #ff6666 #f5cccc #b07a7a (def)    #ff2244
obsidian-terminal-cyan         dark   #060a10 #101a28 #00d4ff 0,212,255   #0099bb #00ffcc #c8e8f0 #6a8a9a (def)    (def)
obsidian-terminal-amber        dark   #100a00 #221808 #ffaa00 255,170,0   #cc7700 #ff6600 #f5d070 #9a7a3a (def)    (def)
obsidian-terminal-acid         dark   #060a00 #131a08 #aaff00 170,255,0   #77cc00 #ccff66 #d4ffaa #6a8040 (def)    (def)
obsidian-terminal-blue         dark   #00061a #0a1430 #4499ff 68,153,255  #0066dd #00ccff #cfe2ff #5a7aaa (def)    (def)
obsidian-tdr-blue              light  #f0ede6 #ffffff #0055cc 0,85,204    #003d99 #4488ee #0d0d0d #5a5a5a (def)    (def)
obsidian-tdr-ember             light  #f0ede6 #ffffff #e86000 232,96,0    #bf4f00 #ff9933 #0d0d0d #5a5a5a (def)    (def)
obsidian-tdr-night             dark   #0d0d0d #1c1c1c #ff1a2d 255,26,45   #cc0016 #ff6677 #f0ede6 #888888 (def)    (def)
obsidian-tdr-warp              dark   #0d0d0d #1c1c1c #f5d000 245,208,0   #c8aa00 #ffe566 #f0ede6 #888888 (def)    (def)
```

Notes: some PRIMARY/TEXT_DARK values were nudged from the classic source for
readability on the new solid-surface cards (e.g. honey-lemon's yellow primary
darkened to `#c79a00` so white-text buttons read; neobrutalism black→`#1a1a1a`;
classic-uniform/chibi yellow secondary darkened). `(def)` = use the default
success/danger.

---

## Task 1: Add the 19 Obsidian palette-variant CSS blocks

**Files:**
- Modify: `src/index.css` (append after the last existing obsidian variant block — the `obsidian-starry-night` block near the end of the obsidian-variants region)

- [ ] **Step 1: Append all 19 blocks**

For each row in the per-theme table, instantiate the template. Worked example —
`obsidian-pastel` (light, `<MIX>=black`, `<SH>=0.12`, `<SH2>=0.16`):

```css
[data-theme="obsidian-pastel"] {
  --font-main: 'IBM Plex Sans', sans-serif;
  --font-heading: 'IBM Plex Sans', sans-serif;
  --bg-color: #fce8f2;
  --bg-gradient: var(--bg-color);
  --card-bg: #fff4f9;
  --surface-raised: color-mix(in srgb, var(--card-bg) 92%, black);
  --border-color: color-mix(in srgb, var(--card-bg) 82%, black);
  --primary: #f08cb8;
  --primary-rgb: 240, 140, 184;
  --primary-hover: color-mix(in srgb, var(--primary) 90%, black);
  --secondary: #7ec8db;
  --accent: #f7c842;
  --success: #8ed85e;
  --danger: #ca2200;
  --text-dark: #4a4453;
  --text-light: color-mix(in srgb, var(--text-dark) 94%, black);
  --text-muted: #6e6878;
  --border-radius: 6px;
  --border-radius-sm: 4px;
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.12);
  --shadow-md: 0 1px 3px rgba(0, 0, 0, 0.12);
  --shadow-lg: 0 2px 6px rgba(0, 0, 0, 0.16);
  --transition: all 0.15s ease;
  --sidebar-bg: var(--card-bg);
  --glass-border: var(--border-color);
  --input-border: var(--border-color);
  --input-bg-focus: var(--bg-color);
  --input-focus-ring: rgba(var(--primary-rgb), 0.2);
  --bubble-bg: var(--card-bg);
  --h-0: var(--card-bg);
  --h-1: color-mix(in srgb, var(--card-bg) 75%, var(--primary));
  --h-2: color-mix(in srgb, var(--card-bg) 50%, var(--primary));
  --h-3: var(--primary);
  --h-4: var(--primary-hover);
}
[data-theme="obsidian-pastel"] .glass { background: var(--card-bg); border: 1px solid var(--border-color); backdrop-filter: none; }
[data-theme="obsidian-pastel"] .btn { border-radius: var(--border-radius-sm); }
[data-theme="obsidian-pastel"] .btn-primary { background: var(--primary); color: var(--bg-color); }
[data-theme="obsidian-pastel"] .btn-primary:hover { background: var(--primary-hover); }
```

Worked example — `obsidian-cyber-scan` (dark, `<MIX>=white`, `<SH>=0.4`, `<SH2>=0.5`):

```css
[data-theme="obsidian-cyber-scan"] {
  --font-main: 'IBM Plex Sans', sans-serif;
  --font-heading: 'IBM Plex Sans', sans-serif;
  --bg-color: #050510;
  --bg-gradient: var(--bg-color);
  --card-bg: #0e1430;
  --surface-raised: color-mix(in srgb, var(--card-bg) 92%, white);
  --border-color: color-mix(in srgb, var(--card-bg) 82%, white);
  --primary: #b8ff00;
  --primary-rgb: 184, 255, 0;
  --primary-hover: color-mix(in srgb, var(--primary) 90%, white);
  --secondary: #1f4dff;
  --accent: #ff00aa;
  --success: #00ff88;
  --danger: #ff2244;
  --text-dark: #d4ffaa;
  --text-light: color-mix(in srgb, var(--text-dark) 94%, white);
  --text-muted: #6a80a0;
  --border-radius: 6px;
  --border-radius-sm: 4px;
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 1px 3px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 2px 6px rgba(0, 0, 0, 0.5);
  --transition: all 0.15s ease;
  --sidebar-bg: var(--card-bg);
  --glass-border: var(--border-color);
  --input-border: var(--border-color);
  --input-bg-focus: var(--bg-color);
  --input-focus-ring: rgba(var(--primary-rgb), 0.2);
  --bubble-bg: var(--card-bg);
  --h-0: var(--card-bg);
  --h-1: color-mix(in srgb, var(--card-bg) 75%, var(--primary));
  --h-2: color-mix(in srgb, var(--card-bg) 50%, var(--primary));
  --h-3: var(--primary);
  --h-4: var(--primary-hover);
}
[data-theme="obsidian-cyber-scan"] .glass { background: var(--card-bg); border: 1px solid var(--border-color); backdrop-filter: none; }
[data-theme="obsidian-cyber-scan"] .btn { border-radius: var(--border-radius-sm); }
[data-theme="obsidian-cyber-scan"] .btn-primary { background: var(--primary); color: var(--bg-color); }
[data-theme="obsidian-cyber-scan"] .btn-primary:hover { background: var(--primary-hover); }
```

Produce the remaining 17 blocks the same way, taking values from the per-theme
table (light rows use `black`/`0.12`/`0.16`, dark rows use `white`/`0.4`/`0.5`).

- [ ] **Step 2: Verify CSS is well-formed**

Run: `npx vite build 2>&1 | tail -5` (or `npm run build` if defined)
Expected: build succeeds, no CSS parse error. (Alternatively confirm brace
balance: `grep -c 'obsidian-pastel' src/index.css` ≥ 4 etc.)

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat(themes): add 19 obsidian palette variants ported from classic themes"
```

---

## Task 2: Extend the `Theme` type with the 19 new IDs

Keep the classic IDs for now (they are removed in Task 9, after their last
references are deleted).

**Files:**
- Modify: `src/lib/settings.tsx:5`

- [ ] **Step 1: Add the new IDs to the union**

Append before the closing `;` of the `Theme` type (after `'obsidian-starry-night'`):

```ts
| 'obsidian-pastel' | 'obsidian-neumorphism' | 'obsidian-neobrutalism'
| 'obsidian-classic-uniform' | 'obsidian-cosmic-manicure' | 'obsidian-chibi-moon'
| 'obsidian-transformation-ribbon' | 'obsidian-honey-lemon' | 'obsidian-ai-pro'
| 'obsidian-cyber-scan' | 'obsidian-terminal-red' | 'obsidian-terminal-cyan'
| 'obsidian-terminal-amber' | 'obsidian-terminal-acid' | 'obsidian-terminal-blue'
| 'obsidian-tdr-blue' | 'obsidian-tdr-ember' | 'obsidian-tdr-night' | 'obsidian-tdr-warp'
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/settings.tsx
git commit -m "feat(themes): register 19 new obsidian theme ids"
```

---

## Task 3: Migration map + `migrateTheme()` + default change (TDD)

**Files:**
- Modify: `src/lib/settings.tsx`
- Test: `src/lib/__tests__/settings-migrate.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { migrateTheme } from '../settings';

describe('migrateTheme', () => {
  it('remaps each legacy classic id to its obsidian variant', () => {
    expect(migrateTheme('pastel')).toBe('obsidian-pastel');
    expect(migrateTheme('terminal-red')).toBe('obsidian-terminal-red');
    expect(migrateTheme('tdr-night')).toBe('obsidian-tdr-night');
    expect(migrateTheme('starry-night')).toBe('obsidian-starry-night');
    expect(migrateTheme('designers-republic')).toBe('obsidian-designers-republic');
    expect(migrateTheme('tdr-acid')).toBe('obsidian-tdr-acid');
    expect(migrateTheme('terminal-green')).toBe('obsidian-terminal-green');
  });

  it('passes through ids that are already obsidian', () => {
    expect(migrateTheme('obsidian')).toBe('obsidian');
    expect(migrateTheme('obsidian-dracula')).toBe('obsidian-dracula');
    expect(migrateTheme('obsidian-pastel')).toBe('obsidian-pastel');
  });

  it('falls back to the default for unknown ids', () => {
    expect(migrateTheme('does-not-exist')).toBe('obsidian-pastel');
  });
});
```

- [ ] **Step 2: Run it — expect FAIL**

Run: `npx vitest run src/lib/__tests__/settings-migrate.test.ts`
Expected: FAIL — `migrateTheme` is not exported.

- [ ] **Step 3: Implement `migrateTheme` + map**

In `src/lib/settings.tsx`, after the `Theme` type, add:

```ts
/** Classic theme ids removed in the redesign unification → obsidian equivalents. */
const LEGACY_THEME_MAP: Record<string, Theme> = {
  'pastel': 'obsidian-pastel',
  'neumorphism': 'obsidian-neumorphism',
  'neobrutalism': 'obsidian-neobrutalism',
  'classic-uniform': 'obsidian-classic-uniform',
  'cosmic-manicure': 'obsidian-cosmic-manicure',
  'chibi-moon': 'obsidian-chibi-moon',
  'transformation-ribbon': 'obsidian-transformation-ribbon',
  'honey-lemon': 'obsidian-honey-lemon',
  'ai-pro': 'obsidian-ai-pro',
  'cyber-scan': 'obsidian-cyber-scan',
  'starry-night': 'obsidian-starry-night',
  'designers-republic': 'obsidian-designers-republic',
  'terminal-orange': 'obsidian-terminal-orange',
  'terminal-green': 'obsidian-terminal-green',
  'terminal-red': 'obsidian-terminal-red',
  'terminal-cyan': 'obsidian-terminal-cyan',
  'terminal-amber': 'obsidian-terminal-amber',
  'terminal-acid': 'obsidian-terminal-acid',
  'terminal-blue': 'obsidian-terminal-blue',
  'tdr-blue': 'obsidian-tdr-blue',
  'tdr-ember': 'obsidian-tdr-ember',
  'tdr-night': 'obsidian-tdr-night',
  'tdr-warp': 'obsidian-tdr-warp',
  'tdr-acid': 'obsidian-tdr-acid',
};

/** Map a possibly-legacy stored theme id to a valid current Theme. */
export function migrateTheme(theme: string): Theme {
  if (theme in LEGACY_THEME_MAP) return LEGACY_THEME_MAP[theme];
  if (theme.startsWith('obsidian')) return theme as Theme;
  return 'obsidian-pastel';
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `npx vitest run src/lib/__tests__/settings-migrate.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Apply migration on load + change default**

In `src/lib/settings.tsx`:
- Change `defaultSettings.theme` from `'pastel'` to `'obsidian-pastel'`.
- In the `useState<Settings>` initializer, after parsing `saved`, run the
  stored theme through `migrateTheme`:

```ts
const [settings, setSettingsState] = useState<Settings>(() => {
    const saved = localStorage.getItem('study-buddy-settings');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            const merged = { ...defaultSettings, ...parsed };
            return { ...merged, theme: migrateTheme(merged.theme) };
        } catch (e) {
            console.error("Failed to parse settings", e);
        }
    }
    return defaultSettings;
});
```

- [ ] **Step 6: Typecheck + full test run**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no type errors; all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/settings.tsx src/lib/__tests__/settings-migrate.test.ts
git commit -m "feat(themes): migrate legacy theme ids on load; default to obsidian-pastel"
```

---

## Task 4: Rebuild the theme picker (obsidian-only, relabeled)

**Files:**
- Modify: `src/pages/settingsThemeGroups.ts`

- [ ] **Step 1: Replace `THEME_GROUPS` with an obsidian-only list**

Remove every classic entry. Keep all `obsidian-*` IDs. Drop the "Obsidian — "
prefix from `name`. Add swatches for the 19 new IDs. Use the existing swatch
`color`/`background` style. Suggested final structure (colors: use each theme's
PRIMARY; `background` optional gradient like existing entries):

```ts
export const THEME_GROUPS: { name: string; themes: ThemeOption[] }[] = [
  { name: 'Core', themes: [
    { id: 'obsidian', name: 'Obsidian', color: '#58a6ff' },
    { id: 'obsidian-pastel', name: 'Pastel', color: '#f08cb8' },
    { id: 'obsidian-ai-pro', name: 'AI Pro', color: '#7c3aed' },
    { id: 'obsidian-cyber-scan', name: 'Cyber Scan', color: '#b8ff00' },
  ]},
  { name: 'Editor', themes: [
    { id: 'obsidian-dracula', name: 'Dracula', color: '#bd93f9' },
    { id: 'obsidian-nord', name: 'Nord', color: '#88c0d0' },
    { id: 'obsidian-monokai', name: 'Monokai', color: '#f92672' },
    { id: 'obsidian-tokyo-night', name: 'Tokyo Night', color: '#7aa2f7' },
    { id: 'obsidian-solarized-dark', name: 'Solarized', color: '#268bd2' },
    { id: 'obsidian-gruvbox', name: 'Gruvbox', color: '#fe8019' },
    { id: 'obsidian-ayu', name: 'Ayu', color: '#ffcc66' },
    { id: 'obsidian-catppuccin', name: 'Catppuccin Mocha', color: '#cba6f7' },
    { id: 'obsidian-catppuccin-latte', name: 'Catppuccin Latte', color: '#8839ef' },
    { id: 'obsidian-catppuccin-frappe', name: 'Catppuccin Frappé', color: '#ca9ee6' },
    { id: 'obsidian-catppuccin-macchiato', name: 'Catppuccin Macchiato', color: '#c6a0f6' },
  ]},
  { name: 'Terminal', themes: [
    { id: 'obsidian-terminal-green', name: 'Terminal Green', color: '#39ff14' },
    { id: 'obsidian-terminal-orange', name: 'Terminal Orange', color: '#ff9e1f' },
    { id: 'obsidian-terminal-red', name: 'Terminal Red', color: '#ff3b3b' },
    { id: 'obsidian-terminal-cyan', name: 'Terminal Cyan', color: '#00d4ff' },
    { id: 'obsidian-terminal-amber', name: 'Terminal Amber', color: '#ffaa00' },
    { id: 'obsidian-terminal-acid', name: 'Terminal Acid', color: '#aaff00' },
    { id: 'obsidian-terminal-blue', name: 'Terminal Blue', color: '#4499ff' },
  ]},
  { name: 'TDR', themes: [
    { id: 'obsidian-designers-republic', name: 'TDR Signal', color: '#ff0066' },
    { id: 'obsidian-tdr-acid', name: 'TDR Acid', color: '#aaff00' },
    { id: 'obsidian-tdr-blue', name: 'TDR Blueprint', color: '#0055cc' },
    { id: 'obsidian-tdr-ember', name: 'TDR Ember', color: '#e86000' },
    { id: 'obsidian-tdr-night', name: 'TDR Night', color: '#ff1a2d' },
    { id: 'obsidian-tdr-warp', name: 'TDR Warp', color: '#f5d000' },
  ]},
  { name: 'Sailor Moon', themes: [
    { id: 'obsidian-classic-uniform', name: 'Classic Uniform', color: '#c90928' },
    { id: 'obsidian-cosmic-manicure', name: 'Cosmic Manicure', color: '#ff1faa' },
    { id: 'obsidian-chibi-moon', name: 'Chibi Moon', color: '#ff4db8' },
    { id: 'obsidian-transformation-ribbon', name: 'Transformation Ribbon', color: '#9d5ceb' },
  ]},
  { name: 'Art', themes: [
    { id: 'obsidian-starry-night', name: 'Starry Night', color: '#e8c84a', background: 'linear-gradient(135deg, #0d1b3e 0%, #1a3060 50%, #e8c84a 100%)' },
    { id: 'obsidian-kokedera', name: 'Kokedera', color: '#5ae65a' },
  ]},
  { name: 'Playful', themes: [
    { id: 'obsidian-neumorphism', name: 'Neumorphism', color: '#9baec8' },
    { id: 'obsidian-neobrutalism', name: 'Neobrutalism', color: '#ff5757' },
    { id: 'obsidian-honey-lemon', name: 'Honey Lemon', color: '#c79a00' },
    { id: 'obsidian-cyberpunk', name: 'Cyberpunk', color: '#fcee0a' },
  ]},
];
```

Confirm every `obsidian-*` ID in the `Theme` union appears exactly once across
the groups (obsidian, the 18 prior variants, the 19 new = 38 total).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (all `id`s are valid `Theme`s).

- [ ] **Step 3: Commit**

```bash
git add src/pages/settingsThemeGroups.ts
git commit -m "feat(themes): obsidian-only theme picker, drop 'Obsidian —' label prefix"
```

---

## Task 5: Delete the classic `Layout` branch

**Files:**
- Modify: `src/components/Layout.tsx`

- [ ] **Step 1: Remove the classic return branch**

Delete the entire `return ( <div className="layout"> … )` block that follows the
Obsidian branch's closing `}` (the non-obsidian sidebar with `.glass.sidebar`,
the classic logo, `.nav-links` with labels, the terminal-quote container, and
the classic `.mascot-container`). The Obsidian branch (`if
(theme.startsWith('obsidian')) { return (…) }`) now handles every theme, so make
it an unconditional `return` (remove the `if` guard but keep the body, including
the `starry` logic).

- [ ] **Step 2: Remove now-dead classic-only logic**

In the same file remove state/effects used ONLY by the deleted branch:
- the terminal typed-quote effect and `typedText`/`glitchVariant` state,
- `isTerminal` destructured from `useSettings()` (Layout had 6 uses; all were in
  the deleted branch or the terminal-quote effect),
- any imports left unused (e.g. classic-only icons). Let the compiler guide you.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors, no unused-var errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/Layout.tsx
git commit -m "refactor(layout): remove classic sidebar branch; obsidian layout is unconditional"
```

---

## Task 6: Collapse gated pages to their Obsidian variant

For each of the 7 pages, the default export currently does
`if (theme.startsWith('obsidian')) return <ObsidianX/>; return <ClassicX/>;`.
Since every theme is now `obsidian*`, replace the body with just
`return <ObsidianX/>` and delete the classic component(s) in the file.

**Files (one commit per page is fine, or batch):**
- `src/pages/Home.tsx` (+ remove classic body) — keep `ObsidianHome`
- `src/pages/Analytics.tsx` — keep `ObsidianAnalytics`
- `src/pages/Plan.tsx` — keep `ObsidianPlanner`
- `src/pages/Learning.tsx` — keep `ObsidianLearning`, delete `LearningTabClassic`
- `src/pages/MetacognitionLogs.tsx` — keep `ObsidianMetacognitionLogs`
- `src/pages/Settings.tsx` — keep `ObsidianSettings`
- `src/pages/Dev.tsx` — keep `ObsidianDev`, delete `DevPageClassic`

- [ ] **Step 1: Rewrite each page's default export**

Example — `src/pages/Dev.tsx`. Replace:

```tsx
export default function DevPage() {
    const { theme } = useSettings();
    if (theme.startsWith('obsidian')) return <ObsidianDev />;
    return <DevPageClassic />;
}
function DevPageClassic() { /* … big classic body … */ }
```

with:

```tsx
export default function ObsidianDevPage() {
    return <ObsidianDev />;
}
```

Then delete the `DevPageClassic` function and any imports/state used only by it.
Apply the analogous change to the other 6 files (delete the classic component
where the file defines one inline; for files that only re-export, just drop the
`if`/`useSettings` and return the Obsidian variant).

- [ ] **Step 2: Remove now-unused imports**

Delete imports that only the classic bodies used (e.g. `useSettings` if no longer
referenced, classic CSS imports like `import './Dev.css'` — but only if Step in
Task 7 confirms the file is deletable; for now leave the CSS import, Task 7
handles file deletion).

- [ ] **Step 3: Typecheck after each file**

Run: `npx tsc --noEmit`
Expected: no errors. Fix unused-import errors as they surface.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Home.tsx src/pages/Analytics.tsx src/pages/Plan.tsx \
        src/pages/Learning.tsx src/pages/MetacognitionLogs.tsx \
        src/pages/Settings.tsx src/pages/Dev.tsx
git commit -m "refactor(pages): render obsidian variants unconditionally; drop classic page bodies"
```

---

## Task 7: Delete orphaned classic page CSS files

**Files (candidates):** `src/pages/Home.css`, `Analytics.css`, `Plan.css`,
`Learning.css`, `MetacognitionLogs.css`, `Settings.css`, `Dev.css`.

- [ ] **Step 1: For each candidate, confirm no surviving import**

Run for each file `X.css`:
`grep -rn "import './X.css'\|X.css" src/ --include="*.tsx" --include="*.ts"`
Expected: only the now-classic page file (which no longer needs it) references
it. If an Obsidian page imports it, DO NOT delete — instead leave it.

- [ ] **Step 2: For each safe file, check class sharing**

For a class-name sample defined in the file, grep usage:
`grep -rn "<a representative classname>" src/ --include="*.tsx"`
If a surviving component uses the class, move that rule into `src/index.css`
base section instead of deleting it. Otherwise the file is safe to remove.

- [ ] **Step 3: Remove the import line and delete the file**

For each safe file, delete its `import './X.css';` line from the page `.tsx`
and `git rm src/pages/X.css`.

- [ ] **Step 4: Typecheck + build**

Run: `npx tsc --noEmit && npx vite build 2>&1 | tail -5`
Expected: no errors; build succeeds.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(pages): delete orphaned classic page stylesheets"
```

---

## Task 8: Remove `isTerminal` special-casing

**Files:**
- `src/lib/settings.tsx`
- `src/lib/sounds.ts`
- `src/pages/Session.tsx`
- `src/components/MetacognitionMode.tsx`
- `src/components/SubjectCard.tsx`
- `src/components/WeeklyCompass.tsx`

- [ ] **Step 1: Simplify the audio auto-profile in `sounds.ts`**

Find (around line 203): `else wantTerminal = theme.startsWith('terminal-');`
Replace with: `else wantTerminal = theme.includes('terminal');`
(So `auto` still gives terminal sounds for the `obsidian-terminal-*` family;
explicit glass/terminal profiles unchanged.)

- [ ] **Step 2: Remove `isTerminal` from shared components**

In `Session.tsx`, `MetacognitionMode.tsx`, `SubjectCard.tsx`,
`WeeklyCompass.tsx`: delete `isTerminal` from the `useSettings()` destructure and
collapse each `isTerminal ? A : B` to `B` (the glass/non-terminal branch), and
each `isTerminal && X` to nothing. Remove resulting dead vars/imports.

Example pattern (Session.tsx):
```tsx
// before
{isTerminal ? '[?]' : '🌑'} {t('session.zone_ombre_label')}
// after
🌑 {t('session.zone_ombre_label')}
```

- [ ] **Step 3: Remove `isTerminalTheme` + context `isTerminal`**

In `src/lib/settings.tsx`:
- delete the `isTerminalTheme` function,
- remove `isTerminal: boolean;` from `SettingsContextType`,
- remove `isTerminal: isTerminalTheme(settings.theme),` from the provider value.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. Any remaining `isTerminal` reference will surface here — fix
by removing it.

- [ ] **Step 5: Verify no references remain**

Run: `grep -rn "isTerminal\|isTerminalTheme\|glitchVariant\|terminal-glitch" src/`
Expected: zero hits.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: remove isTerminal special-casing; auto audio keys off 'terminal' in id"
```

---

## Task 9: Remove classic IDs from the `Theme` type

By now nothing references the classic IDs except `LEGACY_THEME_MAP` keys (plain
strings, not the type).

**Files:**
- Modify: `src/lib/settings.tsx:5`

- [ ] **Step 1: Strip classic IDs from the union**

Edit the `Theme` type so it contains ONLY `obsidian*` IDs (remove `'pastel'`
through `'tdr-acid'` — every non-`obsidian` member). The `LEGACY_THEME_MAP`
keys stay as string literals (the `Record<string, Theme>` key type is `string`).

- [ ] **Step 2: Typecheck + tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no errors; migrate tests still pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/settings.tsx
git commit -m "refactor(themes): drop classic theme ids from Theme union"
```

---

## Task 10: Delete classic theme CSS blocks from `index.css`

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Delete each classic `[data-theme]` block + its rules**

Remove ALL rules whose selector targets a classic theme. For each ID in this
list, delete the `[data-theme="ID"] { … }` block AND every following
`[data-theme="ID"] …` rule, plus the family selectors
`[data-theme^="terminal-"]`, `[data-theme="designers-republic"]`,
`[data-theme^="tdr-"]`:

```
pastel(:root—see Step 2) neumorphism neobrutalism
terminal-orange terminal-green terminal-red terminal-cyan terminal-amber terminal-acid terminal-blue
[data-theme^="terminal-"]
classic-uniform cosmic-manicure chibi-moon transformation-ribbon honey-lemon
ai-pro cyber-scan starry-night
designers-republic [data-theme^="tdr-"] tdr-blue tdr-ember tdr-night tdr-warp tdr-acid
```

Do NOT touch any `[data-theme="obsidian…"]` rule, nor theme-agnostic base rules
(`.btn`, `.glass`, `.mascot-*`, `.page-header`, `.icon-gold`, `@keyframes`,
scrollbars without a theme prefix, etc.).

Locate them with: `grep -n '\[data-theme="\(pastel\|neumorphism\|...\)"\]' src/index.css`
and the family greps `grep -n '\[data-theme\^="terminal-"\]' src/index.css`,
`grep -n '\[data-theme\^="tdr-"\]' src/index.css`,
`grep -n '\[data-theme="designers-republic"\]' src/index.css`.

- [ ] **Step 2: Repoint `:root` to the obsidian default palette**

The `:root` block (lines ~8+) currently holds the pastel palette as the base
fallback. Replace its palette values with the `obsidian` theme's values
(copy the custom-property values from the `[data-theme="obsidian"]` block:
`--bg-color:#0d1117; --card-bg:#161b22; --primary:#58a6ff; …`) so the unstyled
fallback is the dark redesign. Keep any non-palette base tokens that other base
rules rely on.

- [ ] **Step 3: Build + verify no classic selectors remain**

Run: `grep -rn '\[data-theme="\(pastel\|neumorphism\|neobrutalism\|classic-uniform\|cosmic-manicure\|chibi-moon\|transformation-ribbon\|honey-lemon\|ai-pro\|cyber-scan\|starry-night\|designers-republic\)"\]\|\[data-theme\^="terminal-"\]\|\[data-theme\^="tdr-"\]\|\[data-theme="tdr-\|\[data-theme="terminal-' src/index.css`
Expected: zero hits.
Run: `npx vite build 2>&1 | tail -5`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "chore(themes): delete classic theme css; repoint :root to obsidian defaults"
```

---

## Task 11: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Typecheck + tests + build**

Run: `npx tsc --noEmit && npx vitest run && npx vite build 2>&1 | tail -5`
Expected: all clean.

- [ ] **Step 2: No deleted IDs referenced anywhere**

Run: `grep -rn "'pastel'\|'neumorphism'\|'neobrutalism'\|'classic-uniform'\|'cosmic-manicure'\|'chibi-moon'\|'transformation-ribbon'\|'honey-lemon'\|'ai-pro'\|'cyber-scan'\|'starry-night'\|'designers-republic'\|'terminal-\|'tdr-" src/ --include="*.ts" --include="*.tsx"`
Expected: hits ONLY inside `LEGACY_THEME_MAP` in `settings.tsx`.

- [ ] **Step 3: No terminal special-casing remains**

Run: `grep -rn "isTerminal\|glitchVariant\|terminal-glitch\|terminal-quote\|typedText" src/`
Expected: zero hits.

- [ ] **Step 4: Manual smoke test (launch app)**

Launch the app. Switch through and confirm each renders on the redesign with
correct colors and readable buttons:
- light: `obsidian-pastel`, `obsidian-tdr-blue`
- dark: `obsidian-cyber-scan`, `obsidian-terminal-amber`
- `obsidian-starry-night`: wide painting sidebar + mascot intact
Confirm `.btn-secondary` (Pause, + Ajouter, etc.) is readable on each.

- [ ] **Step 5: Migration smoke test**

In devtools console: `localStorage.setItem('study-buddy-settings', JSON.stringify({theme:'tdr-night'}))`, reload.
Expected: app loads on `obsidian-tdr-night`; `data-theme` attribute on
`<html>` equals `obsidian-tdr-night`.

- [ ] **Step 6: Final commit (if any verification fixes were made)**

```bash
git add -A && git commit -m "test: verification fixes for redesign unification"
```

---

## Notes for the implementer

- After every task, the app compiles and runs — tasks are ordered so deletions
  follow the removal of their references.
- The only automated tests are for `migrateTheme` (Task 3). CSS/visual changes
  are verified by build + the manual smoke tests in Task 11.
- If a ported palette looks low-contrast in the smoke test, adjust that theme's
  `--card-bg`/`--text-dark` in its Task 1 block — do not reintroduce classic CSS.
