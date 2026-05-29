# Obsidian Settings Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an obsidian-styled variant of the Settings page — left-rail nav with 4 categories (Look & feel, Learning, Audio, System), rendered when any `obsidian-*` theme is active. Default Settings stays unchanged for non-obsidian themes.

**Architecture:** Same pattern as `ObsidianHome` / `ObsidianAnalytics` / `ObsidianPlanner`. Top-level `SettingsTab` in `src/pages/Settings.tsx` becomes a thin theme gate that returns either `<DefaultSettings />` (renamed body of the current export) or `<ObsidianSettings />` (new component in `src/pages/ObsidianSettings.tsx`). All business logic stays in `src/lib/*` — the new component composes the same `useSettings()` hook, `CustomSelect`, `BingoModal`, theme picker grid, etc. No tests touched.

**Tech Stack:** React 19, TypeScript, CSS custom properties consuming the design system tokens (`docs/design-system.md`), Lucide icons.

---

## File Map

| File | Change |
|---|---|
| `src/pages/Settings.tsx` | Rename existing inner body to `DefaultSettings`; new exported `SettingsTab` becomes the theme gate. ~10-line wrapper diff plus the rename. |
| `src/pages/ObsidianSettings.tsx` | NEW. ~500 lines. Left rail + 4 content panels. Imports business logic from `src/lib/*` and reuses `THEME_GROUPS` data + helpers. |
| `src/pages/ObsidianSettings.css` | NEW. ~300 lines. Rail, panel, sections, responsive (< 900px collapsed rail). |
| `src/lib/i18n.ts` | Add 3 new strings per locale: `settings.look_and_feel`, `settings.learning`, `settings.system`. (`settings.audio` already exists.) |

**Mute toggle (mentioned in spec) is dropped for v1.** The current codebase has no `muted` state to wire to — adding one would require touching `src/lib/sounds`, settings storage, and every consumer. Master volume → 0 already mutes everything; that's the v1 mechanism. A dedicated toggle becomes a follow-up if the user wants it.

---

### Task 1: Refactor Settings.tsx + i18n strings

**Files:**
- Modify: `src/pages/Settings.tsx`
- Modify: `src/lib/i18n.ts`

This task does NOT change any UI. It rewires the export so that the existing 699-line body becomes `DefaultSettings`, and a new top-level `SettingsTab` returns `<DefaultSettings />` unconditionally (we wire the obsidian gate in Task 2 once `ObsidianSettings` exists, to keep this commit purely mechanical).

- [ ] **Step 1: Rename existing inner body**

Open `/home/html5ishard/.gemini/antigravity/scratch/study-buddy-electron/src/pages/Settings.tsx`. Find the existing line at the top:

```tsx
export default function SettingsTab() {
```

Replace with:

```tsx
function DefaultSettings() {
```

(Drop the `export default`. The function is no longer the default export.)

Scroll to the END of that function body — the closing `}` of `SettingsTab`. After it, add a new exported wrapper:

```tsx

export default function SettingsTab() {
    return <DefaultSettings />;
}
```

- [ ] **Step 2: Add i18n strings**

Open `/home/html5ishard/.gemini/antigravity/scratch/study-buddy-electron/src/lib/i18n.ts`. Find the existing `settings.*` block for the English locale (`en`). Add these keys near `settings.audio`:

```ts
'settings.look_and_feel': 'Look & feel',
'settings.learning': 'Learning',
'settings.system': 'System',
```

Do the same in every other locale block in the file (`fr`, `es`, `id`, `zh-CN`, `zh-TW`). Use these translations:

| Locale | look_and_feel | learning | system |
|---|---|---|---|
| `en` | Look & feel | Learning | System |
| `fr` | Apparence | Apprentissage | Système |
| `es` | Apariencia | Aprendizaje | Sistema |
| `id` | Tampilan | Pembelajaran | Sistem |
| `zh-CN` | 外观 | 学习 | 系统 |
| `zh-TW` | 外觀 | 學習 | 系統 |

If you cannot locate one of the locale blocks, add the keys to the locales you DO find and report which ones you skipped — the implementation continues. `t()` falls back to the key when the locale is missing.

- [ ] **Step 3: Type-check**

```bash
cd /home/html5ishard/.gemini/antigravity/scratch/study-buddy-electron
npx tsc --noEmit 2>&1 | head -10
```

Expected: zero errors. The exported `SettingsTab` still satisfies the route consumer.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Settings.tsx src/lib/i18n.ts
git commit -m "refactor(settings): wrap body in DefaultSettings, add new i18n keys

Prep for obsidian gate. The exported SettingsTab becomes a thin wrapper
returning DefaultSettings. No UI change. Adds settings.look_and_feel /
.learning / .system strings in every locale."
```

---

### Task 2: ObsidianSettings skeleton + CSS

**Files:**
- Create: `src/pages/ObsidianSettings.tsx`
- Create: `src/pages/ObsidianSettings.css`
- Modify: `src/pages/Settings.tsx` (add the obsidian gate)

After this task, switching to any `obsidian-*` theme shows the new layout shell — left rail with 4 categories, right panel showing the active category title only (empty body). Subsequent tasks fill the body.

- [ ] **Step 1: Create the CSS file**

Create `src/pages/ObsidianSettings.css` with:

```css
/* ════════════════════════════════════════════════════════════════
   Obsidian Settings — left-rail nav + 4 content panels
   ════════════════════════════════════════════════════════════════ */

.obs-settings-root {
    display: block;
    width: 100%;
    height: 100%;
    color: var(--text-dark);
}

.obs-settings-layout {
    display: flex;
    align-items: stretch;
    min-height: 100%;
}

/* ── Left rail ── */

.obs-settings-rail {
    flex: 0 0 220px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 24px 12px;
    border-right: 1px solid var(--border-color);
    background: var(--card-bg);
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
}

.obs-settings-rail-header {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: var(--text-muted);
    padding: 0 12px 12px;
}

.obs-settings-rail-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: transparent;
    border: none;
    border-left: 3px solid transparent;
    border-radius: 4px;
    color: var(--text-muted);
    font-family: inherit;
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 100ms ease, color 100ms ease;
    text-align: left;
    position: relative;
}

.obs-settings-rail-item:hover {
    color: var(--text-dark);
    background: rgba(255, 255, 255, 0.04);
}

.obs-settings-rail-item--active {
    background: var(--card-bg);
    border-left-color: var(--primary);
    color: var(--text-light);
}

.obs-settings-rail-icon {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.obs-settings-rail-label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* ── Right panel ── */

.obs-settings-panel {
    flex: 1;
    min-width: 0;
    padding: 32px;
    overflow-y: auto;
    animation: obsSettingsFadeIn 180ms ease;
}

@keyframes obsSettingsFadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
}

.obs-settings-panel-content {
    max-width: 720px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 32px;
}

.obs-settings-panel-title {
    font-size: 1.6rem;
    font-weight: 700;
    margin: 0 0 4px;
    color: var(--text-dark);
}

.obs-settings-panel-subtitle {
    font-size: 0.85rem;
    color: var(--text-muted);
    margin: 0;
}

/* ── Section blocks inside a panel ── */

.obs-settings-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.obs-settings-section-label {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: var(--text-muted);
    margin: 0;
}

.obs-settings-hint {
    font-size: 0.78rem;
    color: var(--text-muted);
    margin: 4px 0 0;
}

.obs-settings-toggle {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    padding: 10px 0;
}

.obs-settings-toggle input[type="checkbox"] {
    margin-left: auto;
    width: 18px;
    height: 18px;
    accent-color: var(--primary);
    cursor: pointer;
}

.obs-settings-toggle-icon {
    color: var(--text-muted);
    flex-shrink: 0;
}

.obs-settings-row {
    display: flex;
    gap: 8px;
    align-items: center;
}

.obs-settings-danger-rule {
    border: 0;
    border-top: 1px solid var(--danger);
    opacity: 0.45;
    margin: 16px 0 8px;
}

/* ── Responsive: < 900px → collapsed rail ── */

@media (max-width: 899.98px) {
    .obs-settings-rail {
        flex-basis: 56px;
        padding: 16px 6px;
    }
    .obs-settings-rail-header,
    .obs-settings-rail-label {
        display: none;
    }
    .obs-settings-rail-item {
        justify-content: center;
        padding: 12px 6px;
        position: relative;
    }
    .obs-settings-rail-tooltip {
        position: absolute;
        left: calc(100% + 8px);
        top: 50%;
        transform: translateY(-50%);
        background: var(--surface-raised);
        color: var(--text-dark);
        padding: 6px 10px;
        font-size: 0.78rem;
        border-radius: 4px;
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        transition: opacity 120ms ease;
        box-shadow: var(--shadow-md);
        z-index: 10;
    }
    .obs-settings-rail-item:hover .obs-settings-rail-tooltip { opacity: 1; }
    .obs-settings-panel {
        padding: 24px;
    }
}

.obs-settings-rail-tooltip {
    display: none;
}

@media (max-width: 899.98px) {
    .obs-settings-rail-tooltip {
        display: block;
    }
}
```

- [ ] **Step 2: Create the component file**

Create `src/pages/ObsidianSettings.tsx` with the skeleton:

```tsx
import { useState } from 'react';
import { Palette, Brain, Volume2, Database } from 'lucide-react';
import { useTranslation } from '../lib/i18n';
import './ObsidianSettings.css';

type Category = 'look-and-feel' | 'learning' | 'audio' | 'system';

export default function ObsidianSettings() {
    const { t } = useTranslation();
    const [category, setCategory] = useState<Category>('look-and-feel');

    const railItems: { id: Category; icon: typeof Palette; label: string }[] = [
        { id: 'look-and-feel', icon: Palette, label: t('settings.look_and_feel') || 'Look & feel' },
        { id: 'learning', icon: Brain, label: t('settings.learning') || 'Learning' },
        { id: 'audio', icon: Volume2, label: t('settings.audio') || 'Audio' },
        { id: 'system', icon: Database, label: t('settings.system') || 'System' },
    ];

    return (
        <div className="obs-settings-root">
            <div className="obs-settings-layout">
                <nav className="obs-settings-rail" aria-label="Settings categories">
                    <div className="obs-settings-rail-header">Settings</div>
                    {railItems.map(({ id, icon: Icon, label }) => (
                        <button
                            key={id}
                            type="button"
                            className={`obs-settings-rail-item${category === id ? ' obs-settings-rail-item--active' : ''}`}
                            onClick={() => setCategory(id)}
                            aria-current={category === id ? 'page' : undefined}
                        >
                            <span className="obs-settings-rail-icon"><Icon size={16} /></span>
                            <span className="obs-settings-rail-label">{label}</span>
                            <span className="obs-settings-rail-tooltip">{label}</span>
                        </button>
                    ))}
                </nav>
                <main className="obs-settings-panel" key={category}>
                    <div className="obs-settings-panel-content">
                        {category === 'look-and-feel' && <LookAndFeelPanel />}
                        {category === 'learning' && <LearningPanel />}
                        {category === 'audio' && <AudioPanel />}
                        {category === 'system' && <SystemPanel />}
                    </div>
                </main>
            </div>
        </div>
    );
}

function LookAndFeelPanel() {
    const { t } = useTranslation();
    return (
        <>
            <h1 className="obs-settings-panel-title">{t('settings.look_and_feel') || 'Look & feel'}</h1>
            <p className="obs-settings-panel-subtitle">Theme, language, calendar, and system behavior.</p>
        </>
    );
}

function LearningPanel() {
    const { t } = useTranslation();
    return (
        <>
            <h1 className="obs-settings-panel-title">{t('settings.learning') || 'Learning'}</h1>
            <p className="obs-settings-panel-subtitle">Spaced repetition and keyboard shortcuts.</p>
        </>
    );
}

function AudioPanel() {
    const { t } = useTranslation();
    return (
        <>
            <h1 className="obs-settings-panel-title">{t('settings.audio') || 'Audio'}</h1>
            <p className="obs-settings-panel-subtitle">Master and per-effect volume.</p>
        </>
    );
}

function SystemPanel() {
    const { t } = useTranslation();
    return (
        <>
            <h1 className="obs-settings-panel-title">{t('settings.system') || 'System'}</h1>
            <p className="obs-settings-panel-subtitle">Backup, restore, and danger zone.</p>
        </>
    );
}
```

- [ ] **Step 3: Wire the obsidian gate in Settings.tsx**

Open `src/pages/Settings.tsx`. Add an import near the other page imports at the top of the file:

```tsx
import ObsidianSettings from './ObsidianSettings';
```

Find the wrapper added in Task 1:

```tsx
export default function SettingsTab() {
    return <DefaultSettings />;
}
```

Replace with:

```tsx
export default function SettingsTab() {
    const { theme } = useSettings();
    if (theme.startsWith('obsidian')) return <ObsidianSettings />;
    return <DefaultSettings />;
}
```

`useSettings` is already imported at the top of the file.

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -10
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/ObsidianSettings.tsx src/pages/ObsidianSettings.css src/pages/Settings.tsx
git commit -m "feat(settings): add ObsidianSettings skeleton + obsidian gate

Left rail with 4 category items + right panel that renders the active
category. Panel bodies are placeholder text — wiring real controls in
the next four tasks. Default Settings still serves all non-obsidian
themes."
```

---

### Task 3: Panel 1 — Look & feel

**Files:**
- Modify: `src/pages/ObsidianSettings.tsx`

`LookAndFeelPanel` becomes a real implementation: theme picker (reusing `THEME_GROUPS` from `Settings.tsx`), language dropdown, calendar dropdowns, system-behavior toggles. All controls bind to `useSettings()`.

The component needs `useState` (it already has) plus access to `useSettings`, `Theme`, `WeekStart`, `MetacognitionDay`, `CustomSelect`, `playSFX`, `SFX`, the theme-preview helpers, and the `THEME_GROUPS` data.

Since `THEME_GROUPS` is defined inline inside `DefaultSettings` in `src/pages/Settings.tsx`, extract it to a shared module so both panels can reuse it.

- [ ] **Step 1: Extract `THEME_GROUPS` to a shared module**

Create `src/pages/settingsThemeGroups.ts`:

```ts
import type { Theme } from '../lib/settings';

export interface ThemeOption {
    id: Theme;
    name: string;
    color: string;
    background?: string;
}

export const THEME_GROUPS: { name: string; themes: ThemeOption[] }[] = [
    {
        name: 'Sailor Moon',
        themes: [
            { id: 'classic-uniform', name: 'Classic Uniform', color: '#1c3272' },
            { id: 'cosmic-manicure', name: 'Cosmic Manicure', color: '#9024f2' },
            { id: 'chibi-moon', name: 'Chibi Moon', color: '#ffb3e1' },
            { id: 'transformation-ribbon', name: 'Transformation Ribbon', color: '#9d5ceb', background: 'linear-gradient(120deg, #b08dd9 0%, #63ccd4 100%)' },
        ]
    },
    {
        name: 'Terminal',
        themes: [
            { id: 'terminal-orange', name: 'Orange Terminal', color: '#ff8c00' },
            { id: 'terminal-green', name: 'Green Terminal', color: '#00ff00' },
            { id: 'terminal-red', name: 'Red Terminal', color: '#ff0000' },
            { id: 'terminal-cyan', name: 'CLI / Cyan', color: '#00d4ff' },
            { id: 'terminal-amber', name: 'Amber Terminal', color: '#ffaa00' },
            { id: 'terminal-acid', name: 'Acid Terminal', color: '#aaff00' },
            { id: 'terminal-blue', name: 'Blue Terminal', color: '#4499ff' },
        ]
    },
    {
        name: 'Art',
        themes: [
            { id: 'starry-night', name: 'Starry Night', color: '#e8c84a', background: 'linear-gradient(135deg, #0d1b3e 0%, #1e4888 55%, #e8c84a 100%)' },
            { id: 'designers-republic', name: 'TDR — Signal', color: '#e8001d', background: 'linear-gradient(135deg, #f0ede6 0%, #ffffff 45%, #e8001d 100%)' },
            { id: 'tdr-blue', name: 'TDR — Blueprint', color: '#0055cc', background: 'linear-gradient(135deg, #f0ede6 0%, #ffffff 45%, #0055cc 100%)' },
            { id: 'tdr-ember', name: 'TDR — Ember', color: '#e86000', background: 'linear-gradient(135deg, #f0ede6 0%, #ffffff 45%, #e86000 100%)' },
            { id: 'tdr-night', name: 'TDR — Night', color: '#ff1a2d', background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 45%, #ff1a2d 100%)' },
            { id: 'tdr-warp', name: 'TDR — Warp', color: '#f5d000', background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 45%, #f5d000 100%)' },
            { id: 'tdr-acid', name: 'TDR — Acid', color: '#aaff00', background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 45%, #aaff00 100%)' },
        ]
    },
    {
        name: 'Modern & Experimental',
        themes: [
            { id: 'pastel', name: 'Pastel Baseline', color: '#f08cb8' },
            { id: 'neumorphism', name: 'Neumorphism', color: '#9baec8' },
            { id: 'neobrutalism', name: 'Neobrutalism', color: '#ffde59' },
            { id: 'honey-lemon', name: 'Honey Lemon', color: '#ffeb3b' },
            { id: 'ai-pro', name: 'AI Pro', color: '#7c3aed', background: 'linear-gradient(135deg, #070b14 0%, #1a0a3d 50%, #06b6d4 100%)' },
            { id: 'cyber-scan', name: 'Cyber Scan', color: '#b8ff00', background: 'linear-gradient(135deg, #050510 0%, #0a0830 50%, #b8ff00 100%)' },
        ]
    },
    {
        name: 'Redesign',
        themes: [
            { id: 'obsidian', name: 'Obsidian', color: '#58a6ff', background: 'linear-gradient(135deg, #0d1117 0%, #161b22 50%, #58a6ff 100%)' },
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
];
```

Then in `src/pages/Settings.tsx`, find the inline `THEME_GROUPS` definition inside `DefaultSettings` (around lines 106–169) and replace it with an import at the top:

```tsx
import { THEME_GROUPS, type ThemeOption } from './settingsThemeGroups';
```

Delete the inline `interface ThemeOption` and the entire `const THEME_GROUPS: ...` block. The rest of `DefaultSettings` keeps using `THEME_GROUPS` exactly as before.

- [ ] **Step 2: Implement `LookAndFeelPanel`**

In `src/pages/ObsidianSettings.tsx`, update the imports at the top:

```tsx
import { useState } from 'react';
import { Palette, Brain, Volume2, Database, Power, Zap } from 'lucide-react';
import { useTranslation } from '../lib/i18n';
import { useSettings } from '../lib/settings';
import type { Theme, WeekStart, MetacognitionDay } from '../lib/settings';
import { getAutostart, setAutostart } from '../lib/autostart';
import { CustomSelect } from '../components/CustomSelect';
import { playSFX, SFX } from '../lib/sounds';
import { THEME_GROUPS } from './settingsThemeGroups';
import './ObsidianSettings.css';
```

Replace the `LookAndFeelPanel` placeholder with:

```tsx
function LookAndFeelPanel() {
    const { t } = useTranslation();
    const {
        theme, setTheme,
        language, setLanguage,
        weekStart, setWeekStart,
        metacognitionDay, setMetacognitionDay,
        performanceMode, setPerformanceMode,
    } = useSettings();
    const [previewThemeId, setPreviewThemeId] = useState<Theme | null>(null);
    const [autostartEnabled, setAutostartEnabled] = useState(false);

    useEffect(() => {
        getAutostart().then(setAutostartEnabled);
    }, []);

    const ALL_THEMES = THEME_GROUPS.flatMap(g => g.themes);
    const displayThemeId = previewThemeId ?? theme;
    const activeThemeObj = ALL_THEMES.find(t => t.id === displayThemeId) || ALL_THEMES[0];
    const activeThemeName = activeThemeObj.name;

    const handleThemeHover = (id: Theme) => {
        setPreviewThemeId(id);
        document.documentElement.setAttribute('data-theme', id);
    };
    const handleThemeLeave = () => {
        setPreviewThemeId(null);
        document.documentElement.setAttribute('data-theme', theme);
    };

    return (
        <>
            <h1 className="obs-settings-panel-title">{t('settings.look_and_feel') || 'Look & feel'}</h1>

            <section className="obs-settings-section">
                <h2 className="obs-settings-section-label">{t('settings.theme') || 'Theme'}</h2>
                <p className="obs-settings-hint">
                    {previewThemeId
                        ? `${t('settings.preview_theme') || 'Previewing'}: ${activeThemeName} — ${t('settings.click_to_apply') || 'click to apply'}`
                        : `${t('settings.select_theme') || 'Active'}: ${activeThemeName}`}
                </p>
                <div className="obs-settings-theme-grid" onMouseLeave={handleThemeLeave}>
                    {THEME_GROUPS.map((group) => (
                        <div key={group.name} className="theme-group">
                            <h4 className="theme-group-title">{group.name}</h4>
                            <div className="theme-group-grid">
                                {group.themes.map((th) => (
                                    <button
                                        key={th.id}
                                        type="button"
                                        className={`theme-color-select ${theme === th.id ? 'active' : ''}`}
                                        style={{ background: th.background || th.color }}
                                        onMouseEnter={() => { handleThemeHover(th.id); playSFX(SFX.HOVER); }}
                                        onClick={() => setTheme(th.id)}
                                        title={th.name}
                                        aria-label={th.name}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="obs-settings-section">
                <h2 className="obs-settings-section-label">{t('settings.language') || 'Language'}</h2>
                <CustomSelect
                    value={language}
                    onChange={(val) => setLanguage(val)}
                    options={[
                        { value: "en", label: "English" },
                        { value: "fr", label: "Français" },
                        { value: "es", label: "Español" },
                        { value: "id", label: "Bahasa Indonesia" },
                        { value: "zh-CN", label: "简体中文 (Simplified Chinese)" },
                        { value: "zh-TW", label: "繁體中文 (Traditional Chinese)" }
                    ]}
                />
            </section>

            <section className="obs-settings-section">
                <h2 className="obs-settings-section-label">{t('settings.preferences') || 'Calendar'}</h2>
                <div>
                    <p className="obs-settings-hint">{t('settings.first_day')}</p>
                    <CustomSelect
                        value={weekStart}
                        onChange={(val) => setWeekStart(val as WeekStart)}
                        options={[
                            { value: "monday", label: t('settings.monday') },
                            { value: "sunday", label: t('settings.sunday') }
                        ]}
                    />
                </div>
                <div>
                    <p className="obs-settings-hint">{t('settings.metacognition_day')}</p>
                    <CustomSelect
                        value={metacognitionDay}
                        onChange={(val) => setMetacognitionDay(val as MetacognitionDay)}
                        options={[
                            { value: "friday", label: t('settings.metacognition_day_friday') },
                            { value: "saturday", label: t('settings.metacognition_day_saturday') },
                            { value: "sunday", label: t('settings.metacognition_day_sunday') }
                        ]}
                    />
                </div>
            </section>

            <section className="obs-settings-section">
                <h2 className="obs-settings-section-label">{t('settings.system_behavior') || 'System behavior'}</h2>
                <label className="obs-settings-toggle">
                    <Power size={15} className="obs-settings-toggle-icon" />
                    {t('settings.launch_at_login')}
                    <input
                        type="checkbox"
                        checked={autostartEnabled}
                        onChange={async (e) => {
                            const val = e.target.checked;
                            setAutostartEnabled(val);
                            await setAutostart(val);
                        }}
                    />
                </label>
                <label className="obs-settings-toggle">
                    <Zap size={15} className="obs-settings-toggle-icon" />
                    {t('settings.performance_mode')}
                    <input
                        type="checkbox"
                        checked={performanceMode}
                        onChange={(e) => setPerformanceMode(e.target.checked)}
                    />
                </label>
                <p className="obs-settings-hint">{t('settings.performance_mode_hint')}</p>
            </section>
        </>
    );
}
```

Also add `useEffect` to the React import at the top:

```tsx
import { useState, useEffect } from 'react';
```

- [ ] **Step 3: Add theme grid CSS scoped to obsidian settings**

Append to `src/pages/ObsidianSettings.css`:

```css
/* ── Theme picker grid inside the panel ── */
.obs-settings-theme-grid {
    display: flex;
    flex-direction: column;
    gap: 16px;
}
```

The `.theme-color-select`, `.theme-group`, `.theme-group-title`, `.theme-group-grid`, and `.active` rules are defined globally in `src/index.css` already — they get reused. If a visual gap appears (too-cramped or wrong color), revisit in Task 7.

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: zero errors. `useEffect`, `Power`, `Zap`, `WeekStart`, `MetacognitionDay`, `getAutostart`, `setAutostart`, `CustomSelect`, `playSFX`, `SFX`, `THEME_GROUPS` all imported.

- [ ] **Step 5: Commit**

```bash
git add src/pages/ObsidianSettings.tsx src/pages/ObsidianSettings.css src/pages/Settings.tsx src/pages/settingsThemeGroups.ts
git commit -m "feat(settings): wire Look & feel panel of ObsidianSettings

Theme picker (extracted THEME_GROUPS to settingsThemeGroups.ts so both
panels share it), language dropdown, calendar dropdowns, launch-at-login
toggle, performance-mode toggle. All controls bind to useSettings."
```

---

### Task 4: Panel 2 — Learning

**Files:**
- Modify: `src/pages/ObsidianSettings.tsx`

Replace the `LearningPanel` placeholder with a real implementation: spaced-repetition input + reset, and the read-only keyboard-shortcut list.

- [ ] **Step 1: Add imports for the spaced-repetition helpers**

In `src/pages/ObsidianSettings.tsx`, add to the existing imports near the top of the file:

```tsx
import { getDefaultSpacing, setDefaultSpacing, parseSpacing, DEFAULT_SPACING } from '../lib/chapters';
import { Keyboard } from 'lucide-react';
```

`Keyboard` is added to the same lucide-react import line that already has `Palette`, `Brain`, etc.

- [ ] **Step 2: Replace the LearningPanel placeholder**

Find and replace:

```tsx
function LearningPanel() {
    const { t } = useTranslation();
    return (
        <>
            <h1 className="obs-settings-panel-title">{t('settings.learning') || 'Learning'}</h1>
            <p className="obs-settings-panel-subtitle">Spaced repetition and keyboard shortcuts.</p>
        </>
    );
}
```

With:

```tsx
function LearningPanel() {
    const { t } = useTranslation();
    const [defaultSpacing, setDefaultSpacingState] = useState(() => getDefaultSpacing());
    const [spacingError, setSpacingError] = useState('');

    const handleSpacingChange = (val: string) => {
        setDefaultSpacingState(val);
        const parsed = parseSpacing(val);
        if (parsed.length === 0) {
            setSpacingError(t('settings.sr_error'));
        } else {
            setSpacingError('');
            setDefaultSpacing(val);
        }
    };

    return (
        <>
            <h1 className="obs-settings-panel-title">{t('settings.learning') || 'Learning'}</h1>

            <section className="obs-settings-section">
                <h2 className="obs-settings-section-label">{t('settings.spaced_repetition')}</h2>
                <p className="obs-settings-hint">{t('settings.sr_desc')}</p>
                <div>
                    <p className="obs-settings-hint">{t('settings.review_intervals')}</p>
                    <div className="obs-settings-row">
                        <input
                            type="text"
                            value={defaultSpacing}
                            onChange={e => handleSpacingChange(e.target.value)}
                            placeholder={DEFAULT_SPACING}
                            style={{ flex: 1 }}
                        />
                        <button
                            className="btn btn-secondary"
                            style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                            onMouseEnter={() => playSFX(SFX.HOVER)}
                            onClick={() => handleSpacingChange(DEFAULT_SPACING)}
                        >
                            {t('settings.reset')}
                        </button>
                    </div>
                    {spacingError && (
                        <p className="obs-settings-hint" style={{ color: 'var(--danger)' }}>{spacingError}</p>
                    )}
                </div>
            </section>

            <section className="obs-settings-section">
                <h2 className="obs-settings-section-label">
                    <Keyboard size={14} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--text-muted)' }} />
                    {t('settings.shortcuts')}
                </h2>
                <ShortcutList />
            </section>
        </>
    );
}

function ShortcutList() {
    const { t } = useTranslation();
    const shortcuts: { key: string; label: string }[] = [
        { key: 'Cmd/Ctrl + K', label: t('settings.shortcut_search') || 'Quick search' },
        { key: 'Cmd/Ctrl + Enter', label: t('settings.shortcut_save') || 'Save current form' },
        { key: 'Esc', label: t('settings.shortcut_dismiss') || 'Dismiss modal / overlay' },
        { key: 'Space', label: t('settings.shortcut_play') || 'Toggle timer / slideshow' },
    ];
    return (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {shortcuts.map(s => (
                <li key={s.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                    <code style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-dark)' }}>{s.key}</code>
                </li>
            ))}
        </ul>
    );
}
```

`ShortcutList` defines the visible shortcut entries locally. If `settings.shortcut_*` keys are missing in i18n, the fallback strings render — no broken UI. This list is a v1 approximation of the existing default Settings shortcut block; expand later if the user wants more shortcuts visible.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -10
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/ObsidianSettings.tsx
git commit -m "feat(settings): wire Learning panel of ObsidianSettings

Spaced repetition input + reset + validation error display + the
read-only shortcut list."
```

---

### Task 5: Panel 3 — Audio

**Files:**
- Modify: `src/pages/ObsidianSettings.tsx`

Replace `AudioPanel` placeholder with the real implementation: master volume slider + per-SFX grouped sliders + Test buttons. Reuses the existing `SFX_GROUPS`, `SFX_LABELS`, `loadVolumeSettings`, `saveVolumeSettings`, `testSFX` helpers from `src/lib/sounds`.

- [ ] **Step 1: Add imports for audio helpers**

In `src/pages/ObsidianSettings.tsx`, add to the existing `../lib/sounds` import:

```tsx
import { SFX, SFX_LABELS, SFX_GROUPS, loadVolumeSettings, saveVolumeSettings, testSFX, playSFX } from '../lib/sounds';
import type { SoundEffect, VolumeSettings } from '../lib/sounds';
```

(`playSFX` and `SFX` are already imported; just expand the import line.)

Also add `Play` to the lucide-react import:

```tsx
import { Palette, Brain, Volume2, Database, Power, Zap, Keyboard, Play } from 'lucide-react';
```

- [ ] **Step 2: Replace AudioPanel placeholder**

```tsx
function AudioPanel() {
    const { t } = useTranslation();
    const [volumeSettings, setVolumeSettings] = useState<VolumeSettings>(loadVolumeSettings);

    useEffect(() => {
        saveVolumeSettings(volumeSettings);
    }, [volumeSettings]);

    const handleMasterVolume = (val: number) => {
        setVolumeSettings(prev => ({ ...prev, master: val }));
    };
    const handleIndividualVolume = (effect: SoundEffect, val: number) => {
        setVolumeSettings(prev => ({
            ...prev,
            individual: { ...prev.individual, [effect]: val }
        }));
    };

    return (
        <>
            <h1 className="obs-settings-panel-title">{t('settings.audio') || 'Audio'}</h1>

            <section className="obs-settings-section">
                <h2 className="obs-settings-section-label">{t('settings.master_volume') || 'Master volume'}</h2>
                <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={volumeSettings.master}
                    onChange={(e) => handleMasterVolume(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--primary)' }}
                />
                <p className="obs-settings-hint">
                    {Math.round(volumeSettings.master * 100)}% — {t('settings.master_volume_hint') || 'set to 0 to mute everything'}
                </p>
            </section>

            {Object.entries(SFX_GROUPS).map(([groupName, sfxList]) => (
                <section key={groupName} className="obs-settings-section">
                    <h2 className="obs-settings-section-label">{groupName}</h2>
                    {(sfxList as SoundEffect[]).map((effect) => {
                        const label = SFX_LABELS[effect] || effect;
                        const value = volumeSettings.individual[effect] ?? 1;
                        return (
                            <div key={effect} className="obs-settings-row" style={{ gap: 12, padding: '4px 0' }}>
                                <span style={{ flex: '0 0 140px', fontSize: '0.82rem', color: 'var(--text-dark)' }}>{label}</span>
                                <input
                                    type="range"
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={value}
                                    onChange={(e) => handleIndividualVolume(effect, Number(e.target.value))}
                                    style={{ flex: 1, accentColor: 'var(--primary)' }}
                                />
                                <span style={{ flex: '0 0 36px', fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                                    {Math.round(value * 100)}%
                                </span>
                                <button
                                    type="button"
                                    className="btn btn-icon"
                                    onClick={() => testSFX(effect)}
                                    onMouseEnter={() => playSFX(SFX.HOVER)}
                                    aria-label={t('settings.test') || 'Test'}
                                    title={t('settings.test') || 'Test'}
                                >
                                    <Play size={14} />
                                </button>
                            </div>
                        );
                    })}
                </section>
            ))}
        </>
    );
}
```

The grouping iteration uses `Object.entries(SFX_GROUPS)` — same as the existing `DefaultSettings` code path. If the underlying type is `Partial<Record<string, SoundEffect[]>>`, the `as SoundEffect[]` cast keeps things tidy.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: zero errors. If `SFX_GROUPS` is typed differently and the cast fails, mirror the iteration shape from `src/pages/Settings.tsx:524+` (the original audio section). Read that block to copy the exact iteration.

- [ ] **Step 4: Commit**

```bash
git add src/pages/ObsidianSettings.tsx
git commit -m "feat(settings): wire Audio panel of ObsidianSettings

Master volume slider, per-SFX grouped sliders with Test buttons.
Mute toggle deferred (master volume = 0 already mutes; adding a
dedicated mute state requires touching src/lib/sounds and isn't in
scope)."
```

---

### Task 6: Panel 4 — System (backup + danger + modals)

**Files:**
- Modify: `src/pages/ObsidianSettings.tsx`

Replace `SystemPanel` placeholder with backup form + danger zone with two delete-all flows. Modals are rendered as siblings of the panel content so they cover the whole page when open.

- [ ] **Step 1: Add imports**

In `src/pages/ObsidianSettings.tsx`, add to the imports:

```tsx
import { AlertTriangle, Trash2, FolderOpen, X } from 'lucide-react';
import { deleteAllData } from '../lib/db';
import { deleteAllBingoData } from '../lib/bingoals/db';
import {
    getExportConfig, saveExportConfig,
    getLastExportTime,
    exportToConfiguredPaths,
    pickExportFolder, pickImportFilePath,
    importBackup,
} from '../lib/export';
```

(Merge `AlertTriangle`, `Trash2`, `FolderOpen`, `X` into the existing lucide-react import line.)

- [ ] **Step 2: Lift modal state to the top-level `ObsidianSettings` component**

The two delete modals must overlay the whole page (rail + panel). They render at the root of `ObsidianSettings`, not inside `SystemPanel`. Move the modal state up:

Edit `ObsidianSettings`:

```tsx
export default function ObsidianSettings() {
    const { t } = useTranslation();
    const [category, setCategory] = useState<Category>('look-and-feel');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteInput, setDeleteInput] = useState('');
    const [showDeleteBingoModal, setShowDeleteBingoModal] = useState(false);
    const [deleteBingoInput, setDeleteBingoInput] = useState('');

    async function handleDeleteAll() {
        await deleteAllData();
        setShowDeleteModal(false);
        setDeleteInput('');
        window.location.reload();
    }
    async function handleDeleteBingo() {
        await deleteAllBingoData();
        setShowDeleteBingoModal(false);
        setDeleteBingoInput('');
        window.location.reload();
    }

    const railItems: { id: Category; icon: typeof Palette; label: string }[] = [
        // unchanged
    ];

    return (
        <div className="obs-settings-root">
            {/* delete-all-data modal */}
            {showDeleteModal && (
                <div className="modal-overlay">
                    <div className="modal-content danger-modal">
                        <div className="settings-header danger-modal-header">
                            <AlertTriangle size={24} />
                            <h2>{t('settings.danger_zone')}</h2>
                        </div>
                        <p className="danger-modal-text">
                            {t('settings.delete_confirm_msg')}
                            <br /><br />
                            <strong>{t('settings.delete_keyword')}</strong>
                        </p>
                        <input
                            type="text"
                            value={deleteInput}
                            onChange={(e) => setDeleteInput(e.target.value)}
                            placeholder={t('settings.delete_keyword')}
                            className="danger-modal-input"
                        />
                        <div className="danger-modal-actions">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onMouseEnter={() => playSFX(SFX.HOVER)}
                                onClick={() => { setShowDeleteModal(false); setDeleteInput(''); }}
                            >
                                {t('settings.cancel')}
                            </button>
                            <button
                                type="button"
                                className="btn btn-danger-outline btn-danger-outline-solid"
                                disabled={deleteInput.toLowerCase() !== t('settings.delete_keyword').toLowerCase()}
                                onMouseEnter={() => playSFX(SFX.HOVER)}
                                onClick={handleDeleteAll}
                            >
                                <Trash2 size={18} style={{ marginRight: '8px' }} />
                                {t('settings.confirm_delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* delete-all-bingoals modal */}
            {showDeleteBingoModal && (
                <div className="modal-overlay">
                    <div className="modal-content danger-modal">
                        <div className="settings-header danger-modal-header">
                            <AlertTriangle size={24} />
                            <h2>{t('settings.danger_zone')}</h2>
                        </div>
                        <p className="danger-modal-text">
                            {t('settings.delete_bingo_confirm_msg') || t('settings.delete_confirm_msg')}
                            <br /><br />
                            <strong>{t('settings.delete_keyword')}</strong>
                        </p>
                        <input
                            type="text"
                            value={deleteBingoInput}
                            onChange={(e) => setDeleteBingoInput(e.target.value)}
                            placeholder={t('settings.delete_keyword')}
                            className="danger-modal-input"
                        />
                        <div className="danger-modal-actions">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onMouseEnter={() => playSFX(SFX.HOVER)}
                                onClick={() => { setShowDeleteBingoModal(false); setDeleteBingoInput(''); }}
                            >
                                {t('settings.cancel')}
                            </button>
                            <button
                                type="button"
                                className="btn btn-danger-outline btn-danger-outline-solid"
                                disabled={deleteBingoInput.toLowerCase() !== t('settings.delete_keyword').toLowerCase()}
                                onMouseEnter={() => playSFX(SFX.HOVER)}
                                onClick={handleDeleteBingo}
                            >
                                <Trash2 size={18} style={{ marginRight: '8px' }} />
                                {t('settings.confirm_delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="obs-settings-layout">
                {/* rail unchanged */}
                {/* panel with key=category */}
                <main className="obs-settings-panel" key={category}>
                    <div className="obs-settings-panel-content">
                        {category === 'look-and-feel' && <LookAndFeelPanel />}
                        {category === 'learning' && <LearningPanel />}
                        {category === 'audio' && <AudioPanel />}
                        {category === 'system' && (
                            <SystemPanel
                                onRequestDeleteAll={() => setShowDeleteModal(true)}
                                onRequestDeleteBingo={() => setShowDeleteBingoModal(true)}
                            />
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
```

- [ ] **Step 3: Implement `SystemPanel`**

Replace the existing `SystemPanel` placeholder with:

```tsx
function SystemPanel(props: { onRequestDeleteAll: () => void; onRequestDeleteBingo: () => void }) {
    const { t } = useTranslation();
    const { onRequestDeleteAll, onRequestDeleteBingo } = props;
    const [exportPath1, setExportPath1] = useState(() => getExportConfig().path1);
    const [exportPath2, setExportPath2] = useState(() => getExportConfig().path2);
    const [lastExportTime, setLastExportTime] = useState(() => getLastExportTime());
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    function flashStatus(type: 'success' | 'error', message: string) {
        setStatus({ type, message });
        setTimeout(() => setStatus(null), 4000);
    }

    function persistPaths(p1: string, p2: string) {
        saveExportConfig({ path1: p1, path2: p2 });
    }

    async function handlePickPath(slot: 1 | 2) {
        const folder = await pickExportFolder();
        if (!folder) return;
        if (slot === 1) {
            setExportPath1(folder);
            persistPaths(folder, exportPath2);
        } else {
            setExportPath2(folder);
            persistPaths(exportPath1, folder);
        }
    }
    function handleClearPath(slot: 1 | 2) {
        if (slot === 1) {
            setExportPath1('');
            persistPaths('', exportPath2);
        } else {
            setExportPath2('');
            persistPaths(exportPath1, '');
        }
    }

    async function handleExportNow() {
        const result = await exportToConfiguredPaths();
        setLastExportTime(getLastExportTime());
        if (result.successCount > 0) flashStatus('success', t('settings.export_success') || 'Exported');
        else flashStatus('error', t('settings.export_error') || 'Export failed');
    }

    async function handleImport() {
        const file = await pickImportFilePath();
        if (!file) return;
        try {
            await importBackup(file);
            flashStatus('success', t('settings.import_success') || 'Imported');
        } catch (e) {
            flashStatus('error', String(e));
        }
    }

    return (
        <>
            <h1 className="obs-settings-panel-title">{t('settings.system') || 'System'}</h1>

            <section className="obs-settings-section">
                <h2 className="obs-settings-section-label">{t('settings.data_management')}</h2>
                <p className="obs-settings-hint">{t('settings.export_path') || 'Export folder'} 1</p>
                <div className="obs-settings-row">
                    <input type="text" value={exportPath1} readOnly placeholder={t('settings.no_path') || 'No folder set'} style={{ flex: 1 }} />
                    <button type="button" className="btn btn-icon" onClick={() => handlePickPath(1)} aria-label={t('settings.pick_folder')} title={t('settings.pick_folder')}>
                        <FolderOpen size={14} />
                    </button>
                    {exportPath1 && (
                        <button type="button" className="btn btn-icon" onClick={() => handleClearPath(1)} aria-label={t('settings.clear_path')} title={t('settings.clear_path')}>
                            <X size={14} />
                        </button>
                    )}
                </div>
                <p className="obs-settings-hint">{t('settings.export_path') || 'Export folder'} 2</p>
                <div className="obs-settings-row">
                    <input type="text" value={exportPath2} readOnly placeholder={t('settings.no_path') || 'No folder set'} style={{ flex: 1 }} />
                    <button type="button" className="btn btn-icon" onClick={() => handlePickPath(2)} aria-label={t('settings.pick_folder')} title={t('settings.pick_folder')}>
                        <FolderOpen size={14} />
                    </button>
                    {exportPath2 && (
                        <button type="button" className="btn btn-icon" onClick={() => handleClearPath(2)} aria-label={t('settings.clear_path')} title={t('settings.clear_path')}>
                            <X size={14} />
                        </button>
                    )}
                </div>

                <div className="obs-settings-row" style={{ marginTop: 12 }}>
                    <button type="button" className="btn btn-primary" onClick={handleExportNow} onMouseEnter={() => playSFX(SFX.HOVER)}>
                        {t('settings.export_now') || 'Export now'}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={handleImport} onMouseEnter={() => playSFX(SFX.HOVER)}>
                        {t('settings.import') || 'Import backup'}
                    </button>
                </div>

                {lastExportTime && (
                    <p className="obs-settings-hint">
                        {(t('settings.last_export') || 'Last export')}: {new Date(lastExportTime).toLocaleString()}
                    </p>
                )}
                {status && (
                    <p className="obs-settings-hint" style={{ color: status.type === 'success' ? 'var(--success)' : 'var(--danger)' }}>
                        {status.message}
                    </p>
                )}
            </section>

            <section className="obs-settings-section">
                <hr className="obs-settings-danger-rule" />
                <h2 className="obs-settings-section-label" style={{ color: 'var(--danger)' }}>
                    <AlertTriangle size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                    {t('settings.danger_zone')}
                </h2>
                <p className="obs-settings-hint">{t('settings.danger_warning') || 'These actions are irreversible.'}</p>
                <div className="obs-settings-row">
                    <button type="button" className="btn btn-danger-outline" onClick={onRequestDeleteAll} onMouseEnter={() => playSFX(SFX.HOVER)}>
                        <Trash2 size={14} style={{ marginRight: 6 }} />
                        {t('settings.delete_all') || 'Delete all data'}
                    </button>
                    <button type="button" className="btn btn-danger-outline" onClick={onRequestDeleteBingo} onMouseEnter={() => playSFX(SFX.HOVER)}>
                        <Trash2 size={14} style={{ marginRight: 6 }} />
                        {t('settings.delete_all_bingo') || 'Delete all Bingoals data'}
                    </button>
                </div>
            </section>
        </>
    );
}
```

The `SystemPanel` receives the two `onRequest*` callbacks from `ObsidianSettings` (modals live at the root level so they overlay the rail too).

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: zero errors. If a particular `exportToConfiguredPaths` return shape differs from `{ successCount: number }`, adapt — read `src/lib/export.ts` to confirm the actual return type.

- [ ] **Step 5: Commit**

```bash
git add src/pages/ObsidianSettings.tsx
git commit -m "feat(settings): wire System panel + danger modals of ObsidianSettings

Backup/restore (2 export paths, export now, import), danger zone with
two delete-all flows. Modals lifted to ObsidianSettings root so they
overlay the rail. SystemPanel receives onRequest* callbacks."
```

---

### Task 7: Final type-check + tests + manual smoke

**Files:** None changed.

- [ ] **Step 1: Full type-check**

```bash
cd /home/html5ishard/.gemini/antigravity/scratch/study-buddy-electron
npx tsc --noEmit 2>&1
```

Expected: zero output (zero errors).

- [ ] **Step 2: Full test suite**

```bash
npm test 2>&1 | tail -10
```

Expected: 144/144 tests passing (no test files touched).

- [ ] **Step 3: Manual smoke checklist**

Run `npm run dev`. Switch to any `obsidian-*` theme, then navigate to `/settings`.

- [ ] Left rail visible with 4 items: Look & feel (active), Learning, Audio, System
- [ ] Click each rail item → right panel fades in with the matching title + content
- [ ] **Look & feel panel:**
    - [ ] Theme picker grid renders all 5 groups (Sailor Moon, Terminal, Art, Modern & Experimental, Redesign with 13 obsidian entries)
    - [ ] Hover a theme → live preview applies; mouse-leave the grid → reverts to active theme
    - [ ] Click a theme → activated and persisted across reload
    - [ ] Language dropdown changes UI strings
    - [ ] First-day-of-week + Metacognition-day dropdowns persist
    - [ ] Launch-at-login toggle works
    - [ ] Performance-mode toggle works + hint text shown
- [ ] **Learning panel:**
    - [ ] Spaced-repetition input shows current value; typing invalid input shows the error in red; Reset restores default
    - [ ] Shortcut list renders
- [ ] **Audio panel:**
    - [ ] Master volume slider moves and persists; setting to 0 stops sounds
    - [ ] Each SFX group renders with sliders + Test buttons; Test plays the sound
- [ ] **System panel:**
    - [ ] Export folder pickers work; clearing a path works
    - [ ] Export now triggers the export and shows last-export-time
    - [ ] Import backup picks a file
    - [ ] Delete-all-data → modal opens; typed "delete" enables Confirm; Confirm clears + reloads
    - [ ] Delete-all-bingoals → modal opens; typed "delete" enables Confirm; Confirm clears + reloads
- [ ] Switch to a non-obsidian theme (e.g., `pastel`) → `/settings` reverts to the old `DefaultSettings` UI

If any panel control regresses (state doesn't persist, sound doesn't play, modal doesn't dismiss), fix the offending block and commit:

```bash
git add -p
git commit -m "fix(settings): <specific regression>"
```

Otherwise no commit needed.
