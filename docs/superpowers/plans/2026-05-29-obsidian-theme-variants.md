# Obsidian Theme Variants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 12 new `obsidian-<flavor>` theme variants to the app — each a self-contained CSS custom-property block + a picker entry + a `Theme` union string.

**Architecture:** Pure data work in 3 files. `src/index.css` gets 12 new `[data-theme="obsidian-X"] { ... }` blocks (each ~38 lines, identical structure, only the 8 given color tokens differ — derived tokens use CSS `color-mix()`). `src/lib/settings.tsx` gets 12 new union members. `src/pages/Settings.tsx` gets 12 new `ThemeOption` entries appended to the existing `Redesign` group. No logic touched, no tests added (existing 144 tests stay green).

**Tech Stack:** CSS custom properties, CSS `color-mix(in srgb, ...)` (Chromium 111+ — Electron 24+ ships this), TypeScript string union, React.

---

## File Map

| File | Change |
|---|---|
| `src/index.css` | Append 12 new `[data-theme="obsidian-X"] { ... }` blocks + their `.glass / .btn / .btn-primary / .btn-primary:hover` overrides at the end of the obsidian section. |
| `src/lib/settings.tsx` | Extend the `Theme` union (line 5) with 12 new string literals. |
| `src/pages/Settings.tsx` | Append 12 `ThemeOption` entries to the `Redesign` group's `themes` array (around line 159–168). |

---

## Per-theme CSS template

Every new theme uses this exact structure, substituting only the 8 given tokens (`BG`, `CARD`, `PRIMARY`, `PRIMARY_RGB`, `SECONDARY`, `ACCENT`, `SUCCESS`, `DANGER`, `TEXT_DARK`) and the theme name. Derived tokens use `color-mix()` so we don't precompute 200+ hex values by hand:

```css
[data-theme="THEME_NAME"] {
  --font-main: 'IBM Plex Sans', sans-serif;
  --font-heading: 'IBM Plex Sans', sans-serif;

  --bg-color: BG;
  --bg-gradient: var(--bg-color);
  --card-bg: CARD;
  --surface-raised: color-mix(in srgb, var(--card-bg) 92%, white);
  --border-color: color-mix(in srgb, var(--card-bg) 82%, white);

  --primary: PRIMARY;
  --primary-rgb: PRIMARY_RGB;
  --primary-hover: color-mix(in srgb, var(--primary) 90%, white);
  --secondary: SECONDARY;
  --accent: ACCENT;
  --success: SUCCESS;
  --danger: DANGER;

  --text-dark: TEXT_DARK;
  --text-light: color-mix(in srgb, var(--text-dark) 94%, white);
  --text-muted: color-mix(in srgb, var(--text-dark) 50%, var(--bg-color));

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

[data-theme="THEME_NAME"] .glass {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  backdrop-filter: none;
}

[data-theme="THEME_NAME"] .btn { border-radius: var(--border-radius-sm); }

[data-theme="THEME_NAME"] .btn-primary {
  background: var(--primary);
  color: var(--bg-color);
}

[data-theme="THEME_NAME"] .btn-primary:hover { background: var(--primary-hover); }
```

Each task below provides the substitutions for the themes it covers and embeds the full ready-to-paste CSS.

---

### Task 1: 4 required theme blocks (terminal-green, terminal-orange, designers-republic, cyberpunk)

**Files:**
- Modify: `src/styles/bingoals.css` — NO (wrong file, don't touch)
- Modify: `src/index.css` — append at end of file

- [ ] **Step 1: Append the four required theme blocks to `src/index.css`**

Open `/home/html5ishard/.gemini/antigravity/scratch/study-buddy-electron/src/index.css` and append at the END of the file:

```css

/* ════════════════════════════════════════════════════════════════
   OBSIDIAN VARIANTS — required four (terminal-green, terminal-orange,
   designers-republic, cyberpunk)
   ════════════════════════════════════════════════════════════════ */

[data-theme="obsidian-terminal-green"] {
  --font-main: 'IBM Plex Sans', sans-serif;
  --font-heading: 'IBM Plex Sans', sans-serif;
  --bg-color: #0a1a0c;
  --bg-gradient: var(--bg-color);
  --card-bg: #0f2412;
  --surface-raised: color-mix(in srgb, var(--card-bg) 92%, white);
  --border-color: color-mix(in srgb, var(--card-bg) 82%, white);
  --primary: #39ff14;
  --primary-rgb: 57, 255, 20;
  --primary-hover: color-mix(in srgb, var(--primary) 90%, white);
  --secondary: #00b85d;
  --accent: #84ff5c;
  --success: #39ff14;
  --danger: #ff5252;
  --text-dark: #c5fcc2;
  --text-light: color-mix(in srgb, var(--text-dark) 94%, white);
  --text-muted: color-mix(in srgb, var(--text-dark) 50%, var(--bg-color));
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
[data-theme="obsidian-terminal-green"] .glass { background: var(--card-bg); border: 1px solid var(--border-color); backdrop-filter: none; }
[data-theme="obsidian-terminal-green"] .btn { border-radius: var(--border-radius-sm); }
[data-theme="obsidian-terminal-green"] .btn-primary { background: var(--primary); color: var(--bg-color); }
[data-theme="obsidian-terminal-green"] .btn-primary:hover { background: var(--primary-hover); }

[data-theme="obsidian-terminal-orange"] {
  --font-main: 'IBM Plex Sans', sans-serif;
  --font-heading: 'IBM Plex Sans', sans-serif;
  --bg-color: #1a0f00;
  --bg-gradient: var(--bg-color);
  --card-bg: #261800;
  --surface-raised: color-mix(in srgb, var(--card-bg) 92%, white);
  --border-color: color-mix(in srgb, var(--card-bg) 82%, white);
  --primary: #ff9e1f;
  --primary-rgb: 255, 158, 31;
  --primary-hover: color-mix(in srgb, var(--primary) 90%, white);
  --secondary: #cc7a00;
  --accent: #ffd07a;
  --success: #66ff66;
  --danger: #ff4d4d;
  --text-dark: #ffe8c2;
  --text-light: color-mix(in srgb, var(--text-dark) 94%, white);
  --text-muted: color-mix(in srgb, var(--text-dark) 50%, var(--bg-color));
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
[data-theme="obsidian-terminal-orange"] .glass { background: var(--card-bg); border: 1px solid var(--border-color); backdrop-filter: none; }
[data-theme="obsidian-terminal-orange"] .btn { border-radius: var(--border-radius-sm); }
[data-theme="obsidian-terminal-orange"] .btn-primary { background: var(--primary); color: var(--bg-color); }
[data-theme="obsidian-terminal-orange"] .btn-primary:hover { background: var(--primary-hover); }

[data-theme="obsidian-designers-republic"] {
  --font-main: 'IBM Plex Sans', sans-serif;
  --font-heading: 'IBM Plex Sans', sans-serif;
  --bg-color: #0a0a14;
  --bg-gradient: var(--bg-color);
  --card-bg: #14142e;
  --surface-raised: color-mix(in srgb, var(--card-bg) 92%, white);
  --border-color: color-mix(in srgb, var(--card-bg) 82%, white);
  --primary: #ff0066;
  --primary-rgb: 255, 0, 102;
  --primary-hover: color-mix(in srgb, var(--primary) 90%, white);
  --secondary: #00d4ff;
  --accent: #fff200;
  --success: #00ff99;
  --danger: #ff3366;
  --text-dark: #f0f0ff;
  --text-light: color-mix(in srgb, var(--text-dark) 94%, white);
  --text-muted: color-mix(in srgb, var(--text-dark) 50%, var(--bg-color));
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
[data-theme="obsidian-designers-republic"] .glass { background: var(--card-bg); border: 1px solid var(--border-color); backdrop-filter: none; }
[data-theme="obsidian-designers-republic"] .btn { border-radius: var(--border-radius-sm); }
[data-theme="obsidian-designers-republic"] .btn-primary { background: var(--primary); color: var(--bg-color); }
[data-theme="obsidian-designers-republic"] .btn-primary:hover { background: var(--primary-hover); }

[data-theme="obsidian-cyberpunk"] {
  --font-main: 'IBM Plex Sans', sans-serif;
  --font-heading: 'IBM Plex Sans', sans-serif;
  --bg-color: #0a0a0a;
  --bg-gradient: var(--bg-color);
  --card-bg: #1a1a1a;
  --surface-raised: color-mix(in srgb, var(--card-bg) 92%, white);
  --border-color: color-mix(in srgb, var(--card-bg) 82%, white);
  --primary: #fcee0a;
  --primary-rgb: 252, 238, 10;
  --primary-hover: color-mix(in srgb, var(--primary) 90%, white);
  --secondary: #00f0ff;
  --accent: #ff003c;
  --success: #00f0ff;
  --danger: #ff003c;
  --text-dark: #f0f0f0;
  --text-light: color-mix(in srgb, var(--text-dark) 94%, white);
  --text-muted: color-mix(in srgb, var(--text-dark) 50%, var(--bg-color));
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
[data-theme="obsidian-cyberpunk"] .glass { background: var(--card-bg); border: 1px solid var(--border-color); backdrop-filter: none; }
[data-theme="obsidian-cyberpunk"] .btn { border-radius: var(--border-radius-sm); }
[data-theme="obsidian-cyberpunk"] .btn-primary { background: var(--primary); color: var(--bg-color); }
[data-theme="obsidian-cyberpunk"] .btn-primary:hover { background: var(--primary-hover); }
```

- [ ] **Step 2: Verify file grew**

```bash
cd /home/html5ishard/.gemini/antigravity/scratch/study-buddy-electron
wc -l src/index.css
```

Expected: significantly more lines than before the append.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat(themes): add 4 required obsidian variants

terminal-green, terminal-orange, designers-republic, cyberpunk.
Each defines its own full palette via CSS custom properties; derived
tokens use color-mix() to avoid hand-tuning 12 hex shades per theme.
The four palettes are TypeScript-orphan until Task 4 wires them into
the Theme union and the picker."
```

---

### Task 2: 4 dev-flavored theme blocks (dracula, nord, monokai, tokyo-night)

**Files:**
- Modify: `src/index.css` — append at end of file

- [ ] **Step 1: Append the four blocks to `src/index.css`**

Append at the END of the file:

```css

[data-theme="obsidian-dracula"] {
  --font-main: 'IBM Plex Sans', sans-serif;
  --font-heading: 'IBM Plex Sans', sans-serif;
  --bg-color: #282a36;
  --bg-gradient: var(--bg-color);
  --card-bg: #383a47;
  --surface-raised: color-mix(in srgb, var(--card-bg) 92%, white);
  --border-color: color-mix(in srgb, var(--card-bg) 82%, white);
  --primary: #bd93f9;
  --primary-rgb: 189, 147, 249;
  --primary-hover: color-mix(in srgb, var(--primary) 90%, white);
  --secondary: #ff79c6;
  --accent: #f1fa8c;
  --success: #50fa7b;
  --danger: #ff5555;
  --text-dark: #f8f8f2;
  --text-light: color-mix(in srgb, var(--text-dark) 94%, white);
  --text-muted: color-mix(in srgb, var(--text-dark) 50%, var(--bg-color));
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
[data-theme="obsidian-dracula"] .glass { background: var(--card-bg); border: 1px solid var(--border-color); backdrop-filter: none; }
[data-theme="obsidian-dracula"] .btn { border-radius: var(--border-radius-sm); }
[data-theme="obsidian-dracula"] .btn-primary { background: var(--primary); color: var(--bg-color); }
[data-theme="obsidian-dracula"] .btn-primary:hover { background: var(--primary-hover); }

[data-theme="obsidian-nord"] {
  --font-main: 'IBM Plex Sans', sans-serif;
  --font-heading: 'IBM Plex Sans', sans-serif;
  --bg-color: #2e3440;
  --bg-gradient: var(--bg-color);
  --card-bg: #3b4252;
  --surface-raised: color-mix(in srgb, var(--card-bg) 92%, white);
  --border-color: color-mix(in srgb, var(--card-bg) 82%, white);
  --primary: #88c0d0;
  --primary-rgb: 136, 192, 208;
  --primary-hover: color-mix(in srgb, var(--primary) 90%, white);
  --secondary: #81a1c1;
  --accent: #ebcb8b;
  --success: #a3be8c;
  --danger: #bf616a;
  --text-dark: #eceff4;
  --text-light: color-mix(in srgb, var(--text-dark) 94%, white);
  --text-muted: color-mix(in srgb, var(--text-dark) 50%, var(--bg-color));
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
[data-theme="obsidian-nord"] .glass { background: var(--card-bg); border: 1px solid var(--border-color); backdrop-filter: none; }
[data-theme="obsidian-nord"] .btn { border-radius: var(--border-radius-sm); }
[data-theme="obsidian-nord"] .btn-primary { background: var(--primary); color: var(--bg-color); }
[data-theme="obsidian-nord"] .btn-primary:hover { background: var(--primary-hover); }

[data-theme="obsidian-monokai"] {
  --font-main: 'IBM Plex Sans', sans-serif;
  --font-heading: 'IBM Plex Sans', sans-serif;
  --bg-color: #272822;
  --bg-gradient: var(--bg-color);
  --card-bg: #3e3d32;
  --surface-raised: color-mix(in srgb, var(--card-bg) 92%, white);
  --border-color: color-mix(in srgb, var(--card-bg) 82%, white);
  --primary: #f92672;
  --primary-rgb: 249, 38, 114;
  --primary-hover: color-mix(in srgb, var(--primary) 90%, white);
  --secondary: #66d9ef;
  --accent: #e6db74;
  --success: #a6e22e;
  --danger: #f92672;
  --text-dark: #f8f8f2;
  --text-light: color-mix(in srgb, var(--text-dark) 94%, white);
  --text-muted: color-mix(in srgb, var(--text-dark) 50%, var(--bg-color));
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
[data-theme="obsidian-monokai"] .glass { background: var(--card-bg); border: 1px solid var(--border-color); backdrop-filter: none; }
[data-theme="obsidian-monokai"] .btn { border-radius: var(--border-radius-sm); }
[data-theme="obsidian-monokai"] .btn-primary { background: var(--primary); color: var(--bg-color); }
[data-theme="obsidian-monokai"] .btn-primary:hover { background: var(--primary-hover); }

[data-theme="obsidian-tokyo-night"] {
  --font-main: 'IBM Plex Sans', sans-serif;
  --font-heading: 'IBM Plex Sans', sans-serif;
  --bg-color: #1a1b26;
  --bg-gradient: var(--bg-color);
  --card-bg: #24283b;
  --surface-raised: color-mix(in srgb, var(--card-bg) 92%, white);
  --border-color: color-mix(in srgb, var(--card-bg) 82%, white);
  --primary: #7aa2f7;
  --primary-rgb: 122, 162, 247;
  --primary-hover: color-mix(in srgb, var(--primary) 90%, white);
  --secondary: #bb9af7;
  --accent: #e0af68;
  --success: #9ece6a;
  --danger: #f7768e;
  --text-dark: #c0caf5;
  --text-light: color-mix(in srgb, var(--text-dark) 94%, white);
  --text-muted: color-mix(in srgb, var(--text-dark) 50%, var(--bg-color));
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
[data-theme="obsidian-tokyo-night"] .glass { background: var(--card-bg); border: 1px solid var(--border-color); backdrop-filter: none; }
[data-theme="obsidian-tokyo-night"] .btn { border-radius: var(--border-radius-sm); }
[data-theme="obsidian-tokyo-night"] .btn-primary { background: var(--primary); color: var(--bg-color); }
[data-theme="obsidian-tokyo-night"] .btn-primary:hover { background: var(--primary-hover); }
```

- [ ] **Step 2: Commit**

```bash
git add src/index.css
git commit -m "feat(themes): add 4 dev-flavored obsidian variants

dracula, nord, monokai, tokyo-night."
```

---

### Task 3: 4 misc theme blocks (solarized-dark, gruvbox, catppuccin, ayu)

**Files:**
- Modify: `src/index.css` — append at end of file

- [ ] **Step 1: Append the four blocks to `src/index.css`**

Append at the END of the file:

```css

[data-theme="obsidian-solarized-dark"] {
  --font-main: 'IBM Plex Sans', sans-serif;
  --font-heading: 'IBM Plex Sans', sans-serif;
  --bg-color: #002b36;
  --bg-gradient: var(--bg-color);
  --card-bg: #073642;
  --surface-raised: color-mix(in srgb, var(--card-bg) 92%, white);
  --border-color: color-mix(in srgb, var(--card-bg) 82%, white);
  --primary: #268bd2;
  --primary-rgb: 38, 139, 210;
  --primary-hover: color-mix(in srgb, var(--primary) 90%, white);
  --secondary: #2aa198;
  --accent: #b58900;
  --success: #859900;
  --danger: #dc322f;
  --text-dark: #fdf6e3;
  --text-light: color-mix(in srgb, var(--text-dark) 94%, white);
  --text-muted: color-mix(in srgb, var(--text-dark) 50%, var(--bg-color));
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
[data-theme="obsidian-solarized-dark"] .glass { background: var(--card-bg); border: 1px solid var(--border-color); backdrop-filter: none; }
[data-theme="obsidian-solarized-dark"] .btn { border-radius: var(--border-radius-sm); }
[data-theme="obsidian-solarized-dark"] .btn-primary { background: var(--primary); color: var(--bg-color); }
[data-theme="obsidian-solarized-dark"] .btn-primary:hover { background: var(--primary-hover); }

[data-theme="obsidian-gruvbox"] {
  --font-main: 'IBM Plex Sans', sans-serif;
  --font-heading: 'IBM Plex Sans', sans-serif;
  --bg-color: #282828;
  --bg-gradient: var(--bg-color);
  --card-bg: #3c3836;
  --surface-raised: color-mix(in srgb, var(--card-bg) 92%, white);
  --border-color: color-mix(in srgb, var(--card-bg) 82%, white);
  --primary: #fe8019;
  --primary-rgb: 254, 128, 25;
  --primary-hover: color-mix(in srgb, var(--primary) 90%, white);
  --secondary: #b8bb26;
  --accent: #fabd2f;
  --success: #b8bb26;
  --danger: #fb4934;
  --text-dark: #ebdbb2;
  --text-light: color-mix(in srgb, var(--text-dark) 94%, white);
  --text-muted: color-mix(in srgb, var(--text-dark) 50%, var(--bg-color));
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
[data-theme="obsidian-gruvbox"] .glass { background: var(--card-bg); border: 1px solid var(--border-color); backdrop-filter: none; }
[data-theme="obsidian-gruvbox"] .btn { border-radius: var(--border-radius-sm); }
[data-theme="obsidian-gruvbox"] .btn-primary { background: var(--primary); color: var(--bg-color); }
[data-theme="obsidian-gruvbox"] .btn-primary:hover { background: var(--primary-hover); }

[data-theme="obsidian-catppuccin"] {
  --font-main: 'IBM Plex Sans', sans-serif;
  --font-heading: 'IBM Plex Sans', sans-serif;
  --bg-color: #1e1e2e;
  --bg-gradient: var(--bg-color);
  --card-bg: #313244;
  --surface-raised: color-mix(in srgb, var(--card-bg) 92%, white);
  --border-color: color-mix(in srgb, var(--card-bg) 82%, white);
  --primary: #cba6f7;
  --primary-rgb: 203, 166, 247;
  --primary-hover: color-mix(in srgb, var(--primary) 90%, white);
  --secondary: #f5c2e7;
  --accent: #f9e2af;
  --success: #a6e3a1;
  --danger: #f38ba8;
  --text-dark: #cdd6f4;
  --text-light: color-mix(in srgb, var(--text-dark) 94%, white);
  --text-muted: color-mix(in srgb, var(--text-dark) 50%, var(--bg-color));
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
[data-theme="obsidian-catppuccin"] .glass { background: var(--card-bg); border: 1px solid var(--border-color); backdrop-filter: none; }
[data-theme="obsidian-catppuccin"] .btn { border-radius: var(--border-radius-sm); }
[data-theme="obsidian-catppuccin"] .btn-primary { background: var(--primary); color: var(--bg-color); }
[data-theme="obsidian-catppuccin"] .btn-primary:hover { background: var(--primary-hover); }

[data-theme="obsidian-ayu"] {
  --font-main: 'IBM Plex Sans', sans-serif;
  --font-heading: 'IBM Plex Sans', sans-serif;
  --bg-color: #1f2430;
  --bg-gradient: var(--bg-color);
  --card-bg: #232834;
  --surface-raised: color-mix(in srgb, var(--card-bg) 92%, white);
  --border-color: color-mix(in srgb, var(--card-bg) 82%, white);
  --primary: #ffcc66;
  --primary-rgb: 255, 204, 102;
  --primary-hover: color-mix(in srgb, var(--primary) 90%, white);
  --secondary: #5ccfe6;
  --accent: #ffae57;
  --success: #bae67e;
  --danger: #ff3333;
  --text-dark: #cbccc6;
  --text-light: color-mix(in srgb, var(--text-dark) 94%, white);
  --text-muted: color-mix(in srgb, var(--text-dark) 50%, var(--bg-color));
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
[data-theme="obsidian-ayu"] .glass { background: var(--card-bg); border: 1px solid var(--border-color); backdrop-filter: none; }
[data-theme="obsidian-ayu"] .btn { border-radius: var(--border-radius-sm); }
[data-theme="obsidian-ayu"] .btn-primary { background: var(--primary); color: var(--bg-color); }
[data-theme="obsidian-ayu"] .btn-primary:hover { background: var(--primary-hover); }
```

- [ ] **Step 2: Commit**

```bash
git add src/index.css
git commit -m "feat(themes): add 4 misc obsidian variants

solarized-dark, gruvbox, catppuccin, ayu."
```

---

### Task 4: Theme union update + picker entries

**Files:**
- Modify: `src/lib/settings.tsx` — extend Theme union (line 5)
- Modify: `src/pages/Settings.tsx` — extend Redesign group themes

- [ ] **Step 1: Extend the Theme union in `src/lib/settings.tsx`**

Open `/home/html5ishard/.gemini/antigravity/scratch/study-buddy-electron/src/lib/settings.tsx` and find this line (line 5):

```ts
export type Theme = 'pastel' | 'neumorphism' | 'neobrutalism' | 'terminal-orange' | 'terminal-green' | 'terminal-red' | 'terminal-cyan' | 'terminal-amber' | 'terminal-acid' | 'terminal-blue' | 'classic-uniform' | 'cosmic-manicure' | 'chibi-moon' | 'transformation-ribbon' | 'honey-lemon' | 'ai-pro' | 'cyber-scan' | 'starry-night' | 'designers-republic' | 'tdr-blue' | 'tdr-ember' | 'tdr-night' | 'tdr-warp' | 'tdr-acid' | 'obsidian';
```

Replace with:

```ts
export type Theme = 'pastel' | 'neumorphism' | 'neobrutalism' | 'terminal-orange' | 'terminal-green' | 'terminal-red' | 'terminal-cyan' | 'terminal-amber' | 'terminal-acid' | 'terminal-blue' | 'classic-uniform' | 'cosmic-manicure' | 'chibi-moon' | 'transformation-ribbon' | 'honey-lemon' | 'ai-pro' | 'cyber-scan' | 'starry-night' | 'designers-republic' | 'tdr-blue' | 'tdr-ember' | 'tdr-night' | 'tdr-warp' | 'tdr-acid' | 'obsidian' | 'obsidian-terminal-green' | 'obsidian-terminal-orange' | 'obsidian-designers-republic' | 'obsidian-cyberpunk' | 'obsidian-dracula' | 'obsidian-nord' | 'obsidian-monokai' | 'obsidian-tokyo-night' | 'obsidian-solarized-dark' | 'obsidian-gruvbox' | 'obsidian-catppuccin' | 'obsidian-ayu';
```

- [ ] **Step 2: Append picker entries to the Redesign group in `src/pages/Settings.tsx`**

Open `/home/html5ishard/.gemini/antigravity/scratch/study-buddy-electron/src/pages/Settings.tsx` and find this block (around lines 158–168):

```tsx
        {
            name: 'Redesign',
            themes: [
                {
                    id: 'obsidian' as Theme,
                    name: 'Obsidian',
                    color: '#58a6ff',
                    background: 'linear-gradient(135deg, #0d1117 0%, #161b22 50%, #58a6ff 100%)'
                }
            ]
        }
```

Replace with:

```tsx
        {
            name: 'Redesign',
            themes: [
                {
                    id: 'obsidian' as Theme,
                    name: 'Obsidian',
                    color: '#58a6ff',
                    background: 'linear-gradient(135deg, #0d1117 0%, #161b22 50%, #58a6ff 100%)'
                },
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
            ]
        }
```

The original `obsidian` entry is preserved first; the 12 new variants follow.

- [ ] **Step 3: Type-check**

```bash
cd /home/html5ishard/.gemini/antigravity/scratch/study-buddy-electron
npx tsc --noEmit 2>&1 | head -10
```

Expected: no errors. The new IDs in the picker now match the extended `Theme` union.

- [ ] **Step 4: Commit**

```bash
git add src/lib/settings.tsx src/pages/Settings.tsx
git commit -m "feat(themes): wire 12 obsidian variants into Theme union + picker

All 12 variants now show in the Settings picker under the Redesign
group, alongside the original obsidian entry."
```

---

### Task 5: Final type-check + tests + manual smoke

**Files:** None changed.

- [ ] **Step 1: Full type-check**

```bash
cd /home/html5ishard/.gemini/antigravity/scratch/study-buddy-electron
npx tsc --noEmit 2>&1
```

Expected: zero output.

- [ ] **Step 2: Full test suite**

```bash
npm test 2>&1 | tail -10
```

Expected: 144/144 tests passing (no logic touched).

- [ ] **Step 3: Manual smoke checklist**

Run `npm run dev`. Open Settings → Theme picker → scroll to the `Redesign` section.

- [ ] All 13 entries visible (original `Obsidian` + 12 `Obsidian — <flavor>` entries)
- [ ] Each entry shows a correct gradient swatch + accent color dot
- [ ] Hover each → live preview applies across sidebar, cards, buttons, text — no broken contrast, no missing variables
- [ ] Click each → theme persists across page reload (localStorage)
- [ ] `obsidian-terminal-green` looks phosphor-green
- [ ] `obsidian-terminal-orange` looks amber
- [ ] `obsidian-designers-republic` looks hot pink + cyan + yellow
- [ ] `obsidian-cyberpunk` looks Cyberpunk-2077-yellow on near-black
- [ ] `obsidian-dracula` looks purple-on-dark
- [ ] `obsidian-nord` looks frost-blue on slate
- [ ] `obsidian-monokai` looks magenta-on-olive
- [ ] `obsidian-tokyo-night` looks blue-purple on midnight
- [ ] `obsidian-solarized-dark` looks cyan on deep-blue
- [ ] `obsidian-gruvbox` looks orange on warm-dark
- [ ] `obsidian-catppuccin` looks mauve on indigo
- [ ] `obsidian-ayu` looks gold on slate
- [ ] Cards, buttons, inputs, sidebar, heatmaps render correctly in each
- [ ] Switching back to a non-obsidian theme (e.g., `pastel`) still works
- [ ] Switching back to the original `obsidian` still works

If any theme shows broken contrast or missing styling, fix the offending block in `src/index.css` and commit:

```bash
git add -p
git commit -m "fix(themes): polish <theme-name> from manual testing"
```

Otherwise no commit needed.
