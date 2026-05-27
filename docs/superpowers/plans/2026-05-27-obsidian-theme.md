# Obsidian Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the "Obsidian" Dark Pro theme — a full layout + UX redesign delivered as a new theme selectable in Settings, without touching any other theme.

**Architecture:** CSS variables block + theme-conditional React branches in Layout and Home. Utility functions extracted to `src/lib/obsidian-utils.ts` for testability. Three home view modes (List/Board/Split) and a Quick-Start modal live in dedicated new files.

**Tech Stack:** React 19, TypeScript, Vitest, CSS custom properties (`data-theme="obsidian"`), localStorage for view-mode persistence, `react-router-dom` navigate for session launch.

---

## File Map

| Path | Status | Responsibility |
|---|---|---|
| `src/lib/settings.tsx` | Modify | Add `'obsidian'` to `Theme` union |
| `src/index.css` | Modify | Add `[data-theme="obsidian"]` CSS block |
| `src/pages/Settings.tsx` | Modify | Add "Redesign" theme group |
| `src/components/Layout.tsx` | Modify | Obsidian layout branch (compact sidebar + quote bar) |
| `src/components/Layout.css` | Modify | Obsidian sidebar + quote bar CSS |
| `src/lib/obsidian-utils.ts` | **Create** | Pure utility functions (groupByTag, retentionColor, buildSession) |
| `src/lib/__tests__/obsidian-utils.test.ts` | **Create** | Unit tests for utilities |
| `src/components/ObsidianQuickStart.tsx` | **Create** | Quick-start modal component |
| `src/components/ObsidianQuickStart.css` | **Create** | Quick-start modal styles |
| `src/pages/ObsidianHome.tsx` | **Create** | 3-view home page (List/Board/Split) |
| `src/pages/ObsidianHome.css` | **Create** | Obsidian home styles |
| `src/pages/Home.tsx` | Modify | Early-return to `<ObsidianHome>` when theme === 'obsidian' |

---

## Task 1: Register the theme

**Files:**
- Modify: `src/lib/settings.tsx`
- Modify: `src/index.css`
- Modify: `src/pages/Settings.tsx`

- [ ] **Step 1: Add 'obsidian' to Theme type in settings.tsx**

Open `src/lib/settings.tsx`. Find:
```ts
export type Theme = 'pastel' | 'neumorphism' | 'neobrutalism' | 'terminal-orange' | 'terminal-green' | 'terminal-red' | 'terminal-cyan' | 'terminal-amber' | 'terminal-acid' | 'terminal-blue' | 'classic-uniform' | 'cosmic-manicure' | 'chibi-moon' | 'transformation-ribbon' | 'honey-lemon' | 'ai-pro' | 'cyber-scan' | 'starry-night' | 'designers-republic' | 'tdr-blue' | 'tdr-ember' | 'tdr-night' | 'tdr-warp' | 'tdr-acid';
```

Replace with (append `| 'obsidian'` at the end):
```ts
export type Theme = 'pastel' | 'neumorphism' | 'neobrutalism' | 'terminal-orange' | 'terminal-green' | 'terminal-red' | 'terminal-cyan' | 'terminal-amber' | 'terminal-acid' | 'terminal-blue' | 'classic-uniform' | 'cosmic-manicure' | 'chibi-moon' | 'transformation-ribbon' | 'honey-lemon' | 'ai-pro' | 'cyber-scan' | 'starry-night' | 'designers-republic' | 'tdr-blue' | 'tdr-ember' | 'tdr-night' | 'tdr-warp' | 'tdr-acid' | 'obsidian';
```

- [ ] **Step 2: Add obsidian CSS block to index.css**

Append at the end of `src/index.css`:
```css
/* ── Obsidian — Dark Pro Redesign Theme ── */
[data-theme="obsidian"] {
  --font-main: 'IBM Plex Sans', sans-serif;
  --font-heading: 'IBM Plex Sans', sans-serif;

  --bg-color: #0d1117;
  --bg-gradient: #0d1117;
  --card-bg: #161b22;
  --surface-raised: #21262d;
  --border-color: #30363d;

  --primary: #58a6ff;
  --primary-rgb: 88, 166, 255;
  --primary-hover: #79b8ff;
  --secondary: #3fb950;
  --accent: #d29922;
  --success: #3fb950;
  --danger: #f85149;

  --text-dark: #e6edf3;
  --text-muted: #7d8590;
  --text-light: #ffffff;

  --border-radius: 6px;
  --border-radius-sm: 4px;

  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 1px 3px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 2px 6px rgba(0, 0, 0, 0.5);

  --transition: all 0.15s ease;

  --sidebar-bg: #161b22;
  --glass-border: #30363d;
  --input-border: #30363d;
  --input-bg-focus: #0d1117;
  --input-focus-ring: rgba(88, 166, 255, 0.2);
  --bubble-bg: #161b22;

  /* heatmap overrides */
  --h-0: #161b22;
  --h-1: #0e4429;
  --h-2: #006d32;
  --h-3: #26a641;
  --h-4: #39d353;
}

[data-theme="obsidian"] .glass {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  backdrop-filter: none;
}

[data-theme="obsidian"] .btn {
  border-radius: var(--border-radius-sm);
}

[data-theme="obsidian"] .btn-primary {
  background: var(--primary);
  color: #0d1117;
}

[data-theme="obsidian"] .btn-primary:hover {
  background: var(--primary-hover);
}
```

- [ ] **Step 3: Add "Redesign" theme group to Settings.tsx**

In `src/pages/Settings.tsx`, find the `THEME_GROUPS` array. It ends with the `'Modern & Experimental'` group. After that closing `}` (before the `] as const;`), add:
```ts
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

- [ ] **Step 4: Verify TypeScript compiles**

Run:
```bash
npm run build 2>&1 | grep -E "error TS|Error"
```
Expected: no TypeScript errors about `'obsidian'` type.

- [ ] **Step 5: Start dev server and verify theme appears in Settings**

Run:
```bash
npm run dev
```
Open Settings → Appearance → scroll to bottom. Verify "Redesign" group with "Obsidian" tile is visible. Click it — the app should switch to dark colors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/settings.tsx src/index.css src/pages/Settings.tsx
git commit -m "feat(obsidian): register theme type, CSS variables, and Settings entry"
```

---

## Task 2: Obsidian utility functions

**Files:**
- Create: `src/lib/obsidian-utils.ts`
- Create: `src/lib/__tests__/obsidian-utils.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/obsidian-utils.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { groupByTag, retentionColor, buildQuickStartSession } from '../obsidian-utils'
import type { Subject, Tag } from '../db'

// ── groupByTag ────────────────────────────────────────────────────────────────

const makeSubject = (id: string): Subject & { tags: Tag[] } => ({
  id,
  name: `Subject ${id}`,
  cover_path: null,
  pinned: 0,
  created_at: '2024-01-01T00:00:00.000Z',
  last_studied_at: null,
  total_minutes: 0,
  deadline: null,
  archived: 0,
  focus_type: null,
  chapters: null,
  result: null,
  deleted_at: null,
  subject_type: null,
  tags: [],
})

describe('groupByTag', () => {
  it('puts subjects with no tags into Ungrouped', () => {
    const subjects = [makeSubject('a'), makeSubject('b')]
    const groups = groupByTag(subjects)
    expect(groups).toHaveLength(1)
    expect(groups[0].tagName).toBe('Ungrouped')
    expect(groups[0].subjects).toHaveLength(2)
  })

  it('groups subjects by first tag', () => {
    const music: Tag = { id: 't1', name: 'music' }
    const science: Tag = { id: 't2', name: 'science' }
    const a = { ...makeSubject('a'), tags: [music] }
    const b = { ...makeSubject('b'), tags: [science] }
    const c = { ...makeSubject('c'), tags: [music, science] }
    const groups = groupByTag([a, b, c])
    const musicGroup = groups.find(g => g.tagName === 'music')
    const scienceGroup = groups.find(g => g.tagName === 'science')
    expect(musicGroup?.subjects.map(s => s.id)).toEqual(['a', 'c'])
    expect(scienceGroup?.subjects.map(s => s.id)).toEqual(['b'])
  })

  it('Ungrouped appears last', () => {
    const music: Tag = { id: 't1', name: 'music' }
    const a = { ...makeSubject('a'), tags: [music] }
    const b = makeSubject('b')
    const groups = groupByTag([a, b])
    expect(groups[groups.length - 1].tagName).toBe('Ungrouped')
  })

  it('returns empty array for empty input', () => {
    expect(groupByTag([])).toEqual([])
  })
})

// ── retentionColor ────────────────────────────────────────────────────────────

describe('retentionColor', () => {
  it('returns green for >= 80', () => {
    expect(retentionColor(80)).toBe('var(--success)')
    expect(retentionColor(100)).toBe('var(--success)')
  })

  it('returns amber for 50-79', () => {
    expect(retentionColor(50)).toBe('var(--accent)')
    expect(retentionColor(79)).toBe('var(--accent)')
  })

  it('returns danger for < 50', () => {
    expect(retentionColor(49)).toBe('var(--danger)')
    expect(retentionColor(0)).toBe('var(--danger)')
  })

  it('returns muted for null', () => {
    expect(retentionColor(null)).toBe('var(--text-muted)')
  })
})

// ── buildQuickStartSession ────────────────────────────────────────────────────

describe('buildQuickStartSession', () => {
  it('builds a valid activeSession object', () => {
    const session = buildQuickStartSession('sub-1', 25, 't1', 'Chapter 3')
    expect(session.nowBlockIdx).toBe(0)
    expect(session.paused).toBe(false)
    expect(session.remainingSeconds).toBe(25 * 60)
    expect(session.plannedMinutes).toBe(25)
    expect(session.draft).toHaveLength(1)
    expect(session.draft[0].type).toBe('WORK')
    expect(session.draft[0].subject_id).toBe('sub-1')
    expect(session.draft[0].minutes).toBe(25)
    expect(session.draft[0].technique_id).toBe('t1')
    expect(session.draft[0].chapter_name).toBe('Chapter 3')
  })

  it('handles null technique and chapter', () => {
    const session = buildQuickStartSession('sub-1', 50, null, null)
    expect(session.draft[0].technique_id).toBeNull()
    expect(session.draft[0].chapter_name).toBeNull()
  })

  it('sets template to Custom and repeats to 1', () => {
    const session = buildQuickStartSession('sub-1', 25, null, null)
    expect(session.template).toBe('Custom')
    expect(session.repeats).toBe(1)
    expect(session.fiveMinAlert).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- --run obsidian-utils 2>&1 | tail -20
```
Expected: FAIL with "Cannot find module '../obsidian-utils'"

- [ ] **Step 3: Create the utility module**

Create `src/lib/obsidian-utils.ts`:
```ts
import type { Subject, Tag } from './db'

export interface TagGroup {
  tagName: string
  subjects: (Subject & { tags: Tag[] })[]
}

export interface QuickStartBlock {
  id: string
  type: 'WORK'
  minutes: number
  subject_id: string
  technique_id: string | null
  chapter_name: string | null
  objective: string
}

export interface QuickStartSession {
  sessionId: string
  startedAt: string
  nowBlockIdx: number
  remainingSeconds: number
  paused: boolean
  draft: QuickStartBlock[]
  template: string
  repeats: number
  plannedMinutes: number
  fiveMinAlert: boolean
}

export function groupByTag(subjects: (Subject & { tags: Tag[] })[]): TagGroup[] {
  const map = new Map<string, (Subject & { tags: Tag[] })[]>()
  const ungrouped: (Subject & { tags: Tag[] })[] = []

  for (const subject of subjects) {
    if (subject.tags.length === 0) {
      ungrouped.push(subject)
    } else {
      const firstTag = subject.tags[0].name
      if (!map.has(firstTag)) map.set(firstTag, [])
      map.get(firstTag)!.push(subject)
    }
  }

  const groups: TagGroup[] = Array.from(map.entries()).map(([tagName, subs]) => ({
    tagName,
    subjects: subs,
  }))

  if (ungrouped.length > 0) {
    groups.push({ tagName: 'Ungrouped', subjects: ungrouped })
  }

  return groups
}

export function retentionColor(pct: number | null): string {
  if (pct === null) return 'var(--text-muted)'
  if (pct >= 80) return 'var(--success)'
  if (pct >= 50) return 'var(--accent)'
  return 'var(--danger)'
}

export function buildQuickStartSession(
  subjectId: string,
  minutes: number,
  techniqueId: string | null,
  chapterName: string | null,
): QuickStartSession {
  const blockId = crypto.randomUUID()
  const sessionId = crypto.randomUUID()
  return {
    sessionId,
    startedAt: new Date().toISOString(),
    nowBlockIdx: 0,
    remainingSeconds: minutes * 60,
    paused: false,
    draft: [{
      id: blockId,
      type: 'WORK',
      minutes,
      subject_id: subjectId,
      technique_id: techniqueId,
      chapter_name: chapterName,
      objective: '',
    }],
    template: 'Custom',
    repeats: 1,
    plannedMinutes: minutes,
    fiveMinAlert: false,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- --run obsidian-utils 2>&1 | tail -20
```
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/obsidian-utils.ts src/lib/__tests__/obsidian-utils.test.ts
git commit -m "feat(obsidian): add utility functions with tests (groupByTag, retentionColor, buildQuickStartSession)"
```

---

## Task 3: ObsidianQuickStart modal

**Files:**
- Create: `src/components/ObsidianQuickStart.tsx`
- Create: `src/components/ObsidianQuickStart.css`

- [ ] **Step 1: Create the component**

Create `src/components/ObsidianQuickStart.tsx`:
```tsx
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { TECHNIQUES } from '../lib/techniques'
import { getChaptersForSubject } from '../lib/chapters'
import type { Chapter } from '../lib/chapters'
import type { Subject } from '../lib/db'
import { buildQuickStartSession } from '../lib/obsidian-utils'
import './ObsidianQuickStart.css'

const DURATION_PRESETS = [25, 50, 90]
const LS_DURATION_KEY = 'obsidian-qs-duration'
const LS_TECHNIQUE_KEY = 'obsidian-qs-technique'

interface Props {
  subject: Subject
  onClose: () => void
}

export default function ObsidianQuickStart({ subject, onClose }: Props) {
  const navigate = useNavigate()
  const [duration, setDuration] = useState<number>(() => {
    const saved = localStorage.getItem(LS_DURATION_KEY)
    return saved ? parseInt(saved, 10) : 25
  })
  const [customDuration, setCustomDuration] = useState('')
  const [techniqueId, setTechniqueId] = useState<string>(() => {
    return localStorage.getItem(LS_TECHNIQUE_KEY) || TECHNIQUES[0].id
  })
  const [chapterName, setChapterName] = useState<string>('')
  const [chapters, setChapters] = useState<Chapter[]>([])

  useEffect(() => {
    setChapters(getChaptersForSubject(subject.id))
  }, [subject.id])

  const handleClose = useCallback(() => onClose(), [onClose])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleClose])

  function selectPreset(mins: number) {
    setDuration(mins)
    setCustomDuration('')
    localStorage.setItem(LS_DURATION_KEY, String(mins))
  }

  function handleCustomDuration(val: string) {
    setCustomDuration(val)
    const parsed = parseInt(val, 10)
    if (!isNaN(parsed) && parsed > 0) {
      setDuration(parsed)
      localStorage.setItem(LS_DURATION_KEY, String(parsed))
    }
  }

  function handleTechniqueChange(id: string) {
    setTechniqueId(id)
    localStorage.setItem(LS_TECHNIQUE_KEY, id)
  }

  function launch() {
    const session = buildQuickStartSession(
      subject.id,
      duration,
      techniqueId || null,
      chapterName || null,
    )
    localStorage.setItem('activeSession', JSON.stringify(session))
    navigate('/session')
  }

  const effectiveDuration = customDuration
    ? (parseInt(customDuration, 10) || duration)
    : duration

  return (
    <div className="oqs-overlay" onClick={handleClose}>
      <div className="oqs-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="oqs-header">
          <span className="oqs-title">Start: {subject.name}</span>
          <button className="oqs-close" onClick={handleClose}><X size={16} /></button>
        </div>

        <div className="oqs-field">
          <label className="oqs-label">Duration</label>
          <div className="oqs-duration-row">
            {DURATION_PRESETS.map(p => (
              <button
                key={p}
                className={`oqs-preset${effectiveDuration === p && !customDuration ? ' oqs-preset-active' : ''}`}
                onClick={() => selectPreset(p)}
              >
                {p}m
              </button>
            ))}
            <input
              className="oqs-custom-input"
              type="number"
              min={1}
              max={480}
              placeholder="custom"
              value={customDuration}
              onChange={e => handleCustomDuration(e.target.value)}
            />
          </div>
        </div>

        <div className="oqs-field">
          <label className="oqs-label">Technique</label>
          <select
            className="oqs-select"
            value={techniqueId}
            onChange={e => handleTechniqueChange(e.target.value)}
          >
            <option value="">— none —</option>
            {TECHNIQUES.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="oqs-field">
          <label className="oqs-label">Chapter <span className="oqs-optional">(optional)</span></label>
          <select
            className="oqs-select"
            value={chapterName}
            onChange={e => setChapterName(e.target.value)}
          >
            <option value="">— none —</option>
            {chapters.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>

        <button className="oqs-launch" onClick={launch}>
          Launch Session
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create the CSS**

Create `src/components/ObsidianQuickStart.css`:
```css
.oqs-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.oqs-modal {
  background: var(--card-bg, #161b22);
  border: 1px solid var(--border-color, #30363d);
  border-radius: var(--border-radius, 6px);
  padding: 20px 24px;
  width: 360px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
}

.oqs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.oqs-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-dark, #e6edf3);
}

.oqs-close {
  background: none;
  border: none;
  color: var(--text-muted, #7d8590);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  border-radius: 4px;
}

.oqs-close:hover {
  color: var(--text-dark, #e6edf3);
  background: var(--surface-raised, #21262d);
}

.oqs-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.oqs-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted, #7d8590);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.oqs-optional {
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
}

.oqs-duration-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.oqs-preset {
  padding: 6px 14px;
  border: 1px solid var(--border-color, #30363d);
  background: var(--surface-raised, #21262d);
  color: var(--text-dark, #e6edf3);
  border-radius: var(--border-radius-sm, 4px);
  cursor: pointer;
  font-size: 13px;
  font-family: 'JetBrains Mono', monospace;
  transition: border-color 0.1s;
}

.oqs-preset:hover {
  border-color: var(--primary, #58a6ff);
}

.oqs-preset-active {
  border-color: var(--primary, #58a6ff);
  color: var(--primary, #58a6ff);
  background: rgba(88, 166, 255, 0.1);
}

.oqs-custom-input {
  width: 80px;
  padding: 6px 8px;
  border: 1px solid var(--border-color, #30363d);
  background: var(--input-bg-focus, #0d1117);
  color: var(--text-dark, #e6edf3);
  border-radius: var(--border-radius-sm, 4px);
  font-size: 13px;
  font-family: 'JetBrains Mono', monospace;
  outline: none;
}

.oqs-custom-input:focus {
  border-color: var(--primary, #58a6ff);
}

.oqs-custom-input::placeholder {
  color: var(--text-muted, #7d8590);
}

.oqs-select {
  width: 100%;
  padding: 7px 10px;
  border: 1px solid var(--border-color, #30363d);
  background: var(--surface-raised, #21262d);
  color: var(--text-dark, #e6edf3);
  border-radius: var(--border-radius-sm, 4px);
  font-size: 13px;
  outline: none;
  cursor: pointer;
}

.oqs-select:focus {
  border-color: var(--primary, #58a6ff);
}

.oqs-launch {
  margin-top: 4px;
  width: 100%;
  padding: 9px;
  background: var(--primary, #58a6ff);
  color: #0d1117;
  border: none;
  border-radius: var(--border-radius-sm, 4px);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.1s;
}

.oqs-launch:hover {
  background: var(--primary-hover, #79b8ff);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ObsidianQuickStart.tsx src/components/ObsidianQuickStart.css
git commit -m "feat(obsidian): add ObsidianQuickStart modal component"
```

---

## Task 4: Compact icon sidebar + bottom quote bar (Layout.tsx)

**Files:**
- Modify: `src/components/Layout.tsx`
- Modify: `src/components/Layout.css`

- [ ] **Step 1: Add obsidian layout branch to Layout.tsx**

In `src/components/Layout.tsx`, find the main `return (` at the bottom of the `Layout()` function. Add an early return block **just before** it (after all the state/effects, before the regular return):

```tsx
    // ── Obsidian layout ─────────────────────────────────────────────────────
    if (theme === 'obsidian') {
        return (
            <div className="layout obsidian-layout">
                <nav className="obsidian-sidebar">
                    {navItems.map(item => {
                        const Icon = item.icon;
                        const active = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`obsidian-nav-link${active ? ' obsidian-nav-active' : ''}`}
                                title={item.label}
                                onClick={(e) => handleNavClick(e, item.path)}
                            >
                                <Icon size={20} />
                                {item.path === '/learning' && learningReviewDue && (
                                    <span className="nav-review-dot" aria-label="Review available" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="obsidian-main-wrapper">
                    <main className="main-content">
                        <div key={location.pathname} className="page-route-transition">
                            <Outlet />
                        </div>
                    </main>
                    <div className="obsidian-quote-bar">
                        <span className={`obsidian-quote-text ${animClass}`}>
                            {currentQuote}
                        </span>
                        <button
                            className="obsidian-quote-edit"
                            onClick={() => setEditorOpen(true)}
                            title="Edit quotes"
                        >
                            <Pencil size={12} />
                        </button>
                    </div>
                </div>

                {editorOpen && (
                    <QuoteEditorModal
                        onClose={() => setEditorOpen(false)}
                        onChanged={loadQuotes}
                    />
                )}

                <CloseOverlay />

                {navWarningStep !== 'none' && (
                    <div className="modal-overlay" onClick={() => { setNavWarningStep('none'); setPendingNavPath(null); }}>
                        <div className="modal-content confirm-modal-content" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
                            {navWarningStep === 'confirm-stop' && (
                                <>
                                    <h2 className="confirm-modal-title">⏸️ Stop studying?</h2>
                                    <p className="confirm-modal-text">Are you sure you want to end this session early?</p>
                                    <div className="confirm-modal-actions">
                                        <button className="btn btn-primary" onClick={() => { setNavWarningStep('none'); setPendingNavPath(null); }}>Keep studying</button>
                                        <button className="btn btn-secondary confirm-btn-danger" onClick={() => setNavWarningStep('confirm-save')}>Yes, stop</button>
                                    </div>
                                </>
                            )}
                            {navWarningStep === 'confirm-save' && (
                                <>
                                    <h2 className="confirm-modal-title">💾 Save your progress?</h2>
                                    <p className="confirm-modal-text">Do you want to record the time you studied so far?</p>
                                    <div className="confirm-modal-actions">
                                        <button className="btn btn-primary" onClick={() => finishSessionFromLayout(true)}>Save progress</button>
                                        <button className="btn btn-secondary" onClick={() => finishSessionFromLayout(false)}>Discard</button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }
    // ── end Obsidian layout ──────────────────────────────────────────────────
```

- [ ] **Step 2: Add obsidian sidebar + quote bar CSS to Layout.css**

Append at the end of `src/components/Layout.css`:
```css
/* ── Obsidian Layout ── */

.obsidian-layout {
  display: flex;
  flex-direction: row;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-color, #0d1117);
}

.obsidian-sidebar {
  width: 64px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
  gap: 4px;
  background: #161b22;
  border-right: 1px solid #30363d;
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
}

.obsidian-nav-link {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 6px;
  color: #7d8590;
  text-decoration: none;
  transition: color 0.1s, background 0.1s;
}

.obsidian-nav-link:hover {
  color: #e6edf3;
  background: #21262d;
}

.obsidian-nav-active {
  color: #58a6ff;
  background: rgba(88, 166, 255, 0.1);
}

.obsidian-nav-active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  background: #58a6ff;
  border-radius: 0 2px 2px 0;
}

.obsidian-main-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100vh;
  overflow: hidden;
}

.obsidian-main-wrapper .main-content {
  flex: 1;
  overflow-y: auto;
  background: var(--bg-color, #0d1117);
}

.obsidian-main-wrapper .top-decoration {
  display: none;
}

.obsidian-quote-bar {
  flex-shrink: 0;
  height: 28px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  background: #161b22;
  border-top: 1px solid #30363d;
  gap: 8px;
}

.obsidian-quote-text {
  flex: 1;
  font-size: 12px;
  font-style: italic;
  color: #7d8590;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.obsidian-quote-text.quote-exit {
  opacity: 0;
  transition: opacity 0.3s ease;
}

.obsidian-quote-text.quote-enter {
  opacity: 0;
  animation: obsidian-quote-in 0.5s ease forwards;
}

.obsidian-quote-text.quote-visible {
  opacity: 1;
}

@keyframes obsidian-quote-in {
  to { opacity: 1; }
}

.obsidian-quote-edit {
  background: none;
  border: none;
  color: #7d8590;
  cursor: pointer;
  padding: 2px 4px;
  display: flex;
  align-items: center;
  border-radius: 3px;
  flex-shrink: 0;
}

.obsidian-quote-edit:hover {
  color: #e6edf3;
  background: #21262d;
}
```

- [ ] **Step 3: Verify in dev server**

Switch to Obsidian theme in Settings. Verify:
- Sidebar is 64px wide with icon-only nav
- Active page shows blue highlight + left accent bar
- Bottom quote bar shows with rotating quotes and pencil edit button
- Other pages (Settings, Learning, etc.) render correctly with dark colors

- [ ] **Step 4: Commit**

```bash
git add src/components/Layout.tsx src/components/Layout.css
git commit -m "feat(obsidian): compact icon sidebar and bottom quote bar in Layout"
```

---

## Task 5: ObsidianHome — skeleton, data loading, top bar

**Files:**
- Create: `src/pages/ObsidianHome.tsx`
- Create: `src/pages/ObsidianHome.css`

- [ ] **Step 1: Create ObsidianHome with data loading and top bar**

Create `src/pages/ObsidianHome.tsx`:
```tsx
import { useState, useEffect, useMemo } from 'react'
import { List, LayoutGrid, Columns, Search } from 'lucide-react'
import type { Subject, Tag, Session } from '../lib/db'
import { getSubjects, getSubjectTags, getSessions } from '../lib/db'
import { getAllChapters, getRetentionPercent } from '../lib/chapters'
import type { Chapter } from '../lib/chapters'
import { groupByTag, retentionColor } from '../lib/obsidian-utils'
import ObsidianQuickStart from '../components/ObsidianQuickStart'
import SubjectEditorModal from '../components/SubjectEditorModal'
import './ObsidianHome.css'

type ViewMode = 'list' | 'board' | 'split'
const LS_VIEW_KEY = 'obsidian-home-view'

function useObsidianData() {
  const [subjects, setSubjects] = useState<(Subject & { tags: Tag[] })[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [allChapters, setAllChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [subs, fetchedSessions] = await Promise.all([getSubjects(), getSessions()])
      const withTags = await Promise.all(
        subs.filter(s => !s.deleted_at && !s.archived).map(async s => ({
          ...s,
          tags: await getSubjectTags(s.id),
        }))
      )
      const pinned = withTags.filter(s => s.pinned)
      const unpinned = withTags.filter(s => !s.pinned)
      setSubjects([...pinned, ...unpinned])
      setSessions(fetchedSessions)
      setAllChapters(getAllChapters())
      setLoading(false)
    }
    load()
  }, [])

  return { subjects, sessions, allChapters, loading, setSubjects }
}

function computeStats(sessions: Session[]) {
  const now = new Date()
  const todayStr = now.toDateString()

  const startOfWeek = new Date(now)
  const day = startOfWeek.getDay()
  startOfWeek.setDate(startOfWeek.getDate() - (day === 0 ? 6 : day - 1))
  startOfWeek.setHours(0, 0, 0, 0)

  let todayMins = 0
  let weekMins = 0
  for (const s of sessions) {
    const sd = new Date(s.started_at)
    if (sd.toDateString() === todayStr) todayMins += s.actual_minutes || 0
    if (sd >= startOfWeek) weekMins += s.actual_minutes || 0
  }
  return { todayHours: todayMins / 60, weekHours: weekMins / 60 }
}

function formatH(h: number): string {
  if (h <= 0) return '0m'
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  if (hh === 0) return `${mm}m`
  if (mm === 0) return `${hh}h`
  return `${hh}h ${mm}m`
}

export function getSubjectRetention(subjectId: string, chapters: Chapter[]): number | null {
  const subjectChapters = chapters.filter(c => c.subjectId === subjectId && c.studyCount > 0)
  if (subjectChapters.length === 0) return null
  const percents = subjectChapters.map(c => getRetentionPercent(c)).filter((p): p is number => p !== null)
  if (percents.length === 0) return null
  return Math.round(percents.reduce((a, b) => a + b, 0) / percents.length)
}

interface TopBarProps {
  todayHours: number
  weekHours: number
  filter: string
  onFilterChange: (v: string) => void
  view: ViewMode
  onViewChange: (v: ViewMode) => void
}

function TopBar({ todayHours, weekHours, filter, onFilterChange, view, onViewChange }: TopBarProps) {
  return (
    <div className="ohi-topbar">
      <div className="ohi-stats">
        <span className="ohi-stat"><span className="ohi-stat-val">{formatH(todayHours)}</span> today</span>
        <span className="ohi-stat-sep">·</span>
        <span className="ohi-stat"><span className="ohi-stat-val">{formatH(weekHours)}</span> this week</span>
      </div>
      <div className="ohi-filter-wrap">
        <Search size={14} className="ohi-filter-icon" />
        <input
          className="ohi-filter"
          type="text"
          placeholder="Filter subjects..."
          value={filter}
          onChange={e => onFilterChange(e.target.value)}
        />
      </div>
      <div className="ohi-view-toggle">
        <button className={`ohi-view-btn${view === 'list' ? ' ohi-view-active' : ''}`} title="List view" onClick={() => onViewChange('list')}><List size={16} /></button>
        <button className={`ohi-view-btn${view === 'board' ? ' ohi-view-active' : ''}`} title="Board view" onClick={() => onViewChange('board')}><LayoutGrid size={16} /></button>
        <button className={`ohi-view-btn${view === 'split' ? ' ohi-view-active' : ''}`} title="Split view" onClick={() => onViewChange('split')}><Columns size={16} /></button>
      </div>
    </div>
  )
}

export default function ObsidianHome() {
  const { subjects, sessions, allChapters, loading } = useObsidianData()
  const [view, setView] = useState<ViewMode>(() => {
    return (localStorage.getItem(LS_VIEW_KEY) as ViewMode) || 'list'
  })
  const [filter, setFilter] = useState('')
  const [quickStartSubject, setQuickStartSubject] = useState<Subject | null>(null)
  const [editingSubject, setEditingSubject] = useState<(Subject & { tags: Tag[] }) | null>(null)

  const { todayHours, weekHours } = useMemo(() => computeStats(sessions), [sessions])

  const filtered = useMemo(() => {
    const q = filter.toLowerCase()
    return subjects.filter(s => s.name.toLowerCase().includes(q))
  }, [subjects, filter])

  function handleViewChange(v: ViewMode) {
    setView(v)
    localStorage.setItem(LS_VIEW_KEY, v)
  }

  if (loading) {
    return <div className="ohi-loading">Loading...</div>
  }

  return (
    <div className="ohi-page">
      <TopBar
        todayHours={todayHours}
        weekHours={weekHours}
        filter={filter}
        onFilterChange={setFilter}
        view={view}
        onViewChange={handleViewChange}
      />

      <div className="ohi-content">
        {view === 'list' && (
          <ListView
            subjects={filtered}
            allChapters={allChapters}
            onStart={setQuickStartSubject}
            onEdit={setEditingSubject}
          />
        )}
        {view === 'board' && (
          <BoardView
            subjects={filtered}
            allChapters={allChapters}
            onStart={setQuickStartSubject}
          />
        )}
        {view === 'split' && (
          <SplitView
            subjects={filtered}
            allChapters={allChapters}
            onStart={setQuickStartSubject}
            onEdit={setEditingSubject}
          />
        )}
      </div>

      {quickStartSubject && (
        <ObsidianQuickStart
          subject={quickStartSubject}
          onClose={() => setQuickStartSubject(null)}
        />
      )}

      {editingSubject && (
        <SubjectEditorModal
          subject={editingSubject}
          onClose={() => setEditingSubject(null)}
          onSaved={() => {
            setEditingSubject(null)
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}

// ── ListView ──────────────────────────────────────────────────────────────────

type SortKey = 'name' | 'last_studied_at' | 'total_minutes' | 'retention'
type SortDir = 'asc' | 'desc'

interface ListViewProps {
  subjects: (Subject & { tags: Tag[] })[]
  allChapters: Chapter[]
  onStart: (s: Subject) => void
  onEdit: (s: Subject & { tags: Tag[] }) => void
}

function ListView({ subjects, allChapters, onStart, onEdit }: ListViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    return [...subjects].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name') {
        cmp = a.name.localeCompare(b.name)
      } else if (sortKey === 'last_studied_at') {
        const da = a.last_studied_at ? new Date(a.last_studied_at).getTime() : 0
        const db_ = b.last_studied_at ? new Date(b.last_studied_at).getTime() : 0
        cmp = da - db_
      } else if (sortKey === 'total_minutes') {
        cmp = a.total_minutes - b.total_minutes
      } else if (sortKey === 'retention') {
        const ra = getSubjectRetention(a.id, allChapters) ?? -1
        const rb = getSubjectRetention(b.id, allChapters) ?? -1
        cmp = ra - rb
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [subjects, sortKey, sortDir, allChapters])

  function SortHeader({ label, k }: { label: string; k: SortKey }) {
    const active = sortKey === k
    return (
      <th className={`ohi-th${active ? ' ohi-th-active' : ''}`} onClick={() => handleSort(k)}>
        {label}{active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
      </th>
    )
  }

  return (
    <div className="ohi-list-wrap">
      <table className="ohi-table">
        <thead>
          <tr>
            <SortHeader label="Name" k="name" />
            <th className="ohi-th ohi-th-tags">Tags</th>
            <SortHeader label="Last Studied" k="last_studied_at" />
            <SortHeader label="Hours" k="total_minutes" />
            <SortHeader label="Retention" k="retention" />
            <th className="ohi-th ohi-th-action" />
          </tr>
        </thead>
        <tbody>
          {sorted.map(subject => {
            const retention = getSubjectRetention(subject.id, allChapters)
            const hours = (subject.total_minutes / 60).toFixed(1)
            const lastStudied = subject.last_studied_at
              ? formatRelativeDate(subject.last_studied_at)
              : 'never'
            return (
              <tr key={subject.id} className="ohi-row" onClick={() => onEdit(subject)}>
                <td className="ohi-td ohi-td-name">{subject.name}</td>
                <td className="ohi-td ohi-td-tags">
                  {subject.tags.map(t => (
                    <span key={t.id} className="ohi-tag">#{t.name}</span>
                  ))}
                </td>
                <td className="ohi-td ohi-td-date">{lastStudied}</td>
                <td className="ohi-td ohi-td-mono">{hours}h</td>
                <td className="ohi-td ohi-td-mono" style={{ color: retentionColor(retention) }}>
                  {retention !== null ? `${retention}%` : '—'}
                </td>
                <td className="ohi-td ohi-td-action" onClick={e => e.stopPropagation()}>
                  <button className="ohi-start-btn" onClick={() => onStart(subject)}>▶ Start</button>
                </td>
              </tr>
            )
          })}
          {sorted.length === 0 && (
            <tr><td colSpan={6} className="ohi-empty">No subjects match your filter.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// ── BoardView ─────────────────────────────────────────────────────────────────

const LS_BOARD_COLLAPSED = 'obsidian-board-collapsed'

interface BoardViewProps {
  subjects: (Subject & { tags: Tag[] })[]
  allChapters: Chapter[]
  onStart: (s: Subject) => void
}

function BoardView({ subjects, allChapters, onStart }: BoardViewProps) {
  const groups = useMemo(() => groupByTag(subjects), [subjects])
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(LS_BOARD_COLLAPSED)
      return new Set(saved ? JSON.parse(saved) : [])
    } catch {
      return new Set()
    }
  })

  function toggleGroup(name: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      localStorage.setItem(LS_BOARD_COLLAPSED, JSON.stringify(Array.from(next)))
      return next
    })
  }

  return (
    <div className="ohi-board">
      {groups.map(group => {
        const isCollapsed = collapsed.has(group.tagName)
        return (
          <div key={group.tagName} className="ohi-board-group">
            <button className="ohi-board-group-header" onClick={() => toggleGroup(group.tagName)}>
              <span className="ohi-board-caret">{isCollapsed ? '▶' : '▼'}</span>
              <span className="ohi-board-group-name">#{group.tagName}</span>
              <span className="ohi-board-group-count">({group.subjects.length})</span>
            </button>
            {!isCollapsed && (
              <div className="ohi-board-rows">
                {group.subjects.map(subject => {
                  const retention = getSubjectRetention(subject.id, allChapters)
                  return (
                    <div key={subject.id} className="ohi-board-row">
                      <span className="ohi-board-name">{subject.name}</span>
                      <span className="ohi-board-ret" style={{ color: retentionColor(retention) }}>
                        {retention !== null ? `${retention}%` : '—'}
                      </span>
                      <button className="ohi-start-btn ohi-start-sm" onClick={() => onStart(subject)}>▶</button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
      {groups.length === 0 && <div className="ohi-empty">No subjects match your filter.</div>}
    </div>
  )
}

// ── SplitView ─────────────────────────────────────────────────────────────────

interface SplitViewProps {
  subjects: (Subject & { tags: Tag[] })[]
  allChapters: Chapter[]
  onStart: (s: Subject) => void
  onEdit: (s: Subject & { tags: Tag[] }) => void
}

function SplitView({ subjects, allChapters, onStart, onEdit }: SplitViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const pinned = subjects.find(s => s.pinned)
    return pinned?.id ?? subjects[0]?.id ?? null
  })

  const selected = useMemo(() => subjects.find(s => s.id === selectedId) ?? null, [subjects, selectedId])

  const selectedChapters = useMemo(
    () => allChapters.filter(c => c.subjectId === selectedId && c.studyCount > 0),
    [allChapters, selectedId]
  )

  const retention = selected ? getSubjectRetention(selected.id, allChapters) : null

  return (
    <div className="ohi-split">
      <div className="ohi-split-list">
        {subjects.map(subject => (
          <div
            key={subject.id}
            className={`ohi-split-row${selectedId === subject.id ? ' ohi-split-selected' : ''}`}
            onClick={() => setSelectedId(subject.id)}
          >
            <span className="ohi-split-name">{subject.name}</span>
            <button
              className="ohi-start-btn ohi-start-sm"
              onClick={e => { e.stopPropagation(); onStart(subject) }}
            >▶</button>
          </div>
        ))}
        {subjects.length === 0 && <div className="ohi-empty">No subjects match your filter.</div>}
      </div>

      <div className="ohi-split-detail">
        {selected ? (
          <>
            <h2 className="ohi-split-detail-title">{selected.name}</h2>
            <div className="ohi-split-detail-grid">
              <span className="ohi-split-label">Last studied</span>
              <span className="ohi-split-val">
                {selected.last_studied_at ? formatRelativeDate(selected.last_studied_at) : 'Never'}
              </span>
              <span className="ohi-split-label">Total time</span>
              <span className="ohi-split-val ohi-mono">{formatH(selected.total_minutes / 60)}</span>
              <span className="ohi-split-label">Retention</span>
              <span className="ohi-split-val ohi-mono" style={{ color: retentionColor(retention) }}>
                {retention !== null ? `${retention}%` : '—'}
              </span>
              <span className="ohi-split-label">Chapters</span>
              <span className="ohi-split-val">{selectedChapters.length} studied</span>
              {selected.tags.length > 0 && (
                <>
                  <span className="ohi-split-label">Tags</span>
                  <span className="ohi-split-val">
                    {selected.tags.map(t => <span key={t.id} className="ohi-tag">#{t.name}</span>)}
                  </span>
                </>
              )}
            </div>
            <div className="ohi-split-actions">
              <button className="ohi-launch-btn" onClick={() => onStart(selected)}>▶ Start Session</button>
              <button className="ohi-edit-btn" onClick={() => onEdit(selected)}>✎ Edit</button>
            </div>
          </>
        ) : (
          <div className="ohi-empty">Select a subject</div>
        )}
      </div>
    </div>
  )
}

// ── helpers ───────────────────────────────────────────────────────────────────

function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days}d ago`
}
```

- [ ] **Step 2: Create ObsidianHome CSS**

Create `src/pages/ObsidianHome.css`:
```css
.ohi-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-color, #0d1117);
  font-family: var(--font-main, 'IBM Plex Sans', sans-serif);
  color: var(--text-dark, #e6edf3);
}

.ohi-loading {
  padding: 48px;
  text-align: center;
  color: var(--text-muted, #7d8590);
  font-size: 14px;
}

/* ── Top Bar ── */

.ohi-topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 20px;
  border-bottom: 1px solid var(--border-color, #30363d);
  background: var(--card-bg, #161b22);
  flex-shrink: 0;
}

.ohi-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-muted, #7d8590);
  font-family: 'JetBrains Mono', monospace;
  white-space: nowrap;
}

.ohi-stat-val {
  color: var(--text-dark, #e6edf3);
  font-weight: 600;
}

.ohi-stat-sep {
  color: var(--border-color, #30363d);
}

.ohi-filter-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-color, #0d1117);
  border: 1px solid var(--border-color, #30363d);
  border-radius: var(--border-radius-sm, 4px);
  padding: 0 10px;
}

.ohi-filter-icon {
  color: var(--text-muted, #7d8590);
  flex-shrink: 0;
}

.ohi-filter {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-size: 13px;
  color: var(--text-dark, #e6edf3);
  padding: 6px 0;
}

.ohi-filter::placeholder {
  color: var(--text-muted, #7d8590);
}

.ohi-view-toggle {
  display: flex;
  gap: 2px;
  background: var(--bg-color, #0d1117);
  border: 1px solid var(--border-color, #30363d);
  border-radius: var(--border-radius-sm, 4px);
  padding: 2px;
}

.ohi-view-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 26px;
  background: none;
  border: none;
  color: var(--text-muted, #7d8590);
  cursor: pointer;
  border-radius: 3px;
  transition: background 0.1s, color 0.1s;
}

.ohi-view-btn:hover {
  color: var(--text-dark, #e6edf3);
  background: var(--surface-raised, #21262d);
}

.ohi-view-active {
  color: var(--primary, #58a6ff);
  background: rgba(88, 166, 255, 0.1);
}

.ohi-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ── List View ── */

.ohi-list-wrap {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.ohi-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.ohi-th {
  padding: 8px 16px;
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted, #7d8590);
  border-bottom: 1px solid var(--border-color, #30363d);
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
  position: sticky;
  top: 0;
  background: var(--card-bg, #161b22);
  z-index: 1;
}

.ohi-th:hover { color: var(--text-dark, #e6edf3); }
.ohi-th-active { color: var(--primary, #58a6ff); }
.ohi-th-tags, .ohi-th-action { cursor: default; }

.ohi-row {
  cursor: pointer;
  border-bottom: 1px solid rgba(48, 54, 61, 0.5);
  transition: background 0.1s;
}

.ohi-row:hover { background: var(--surface-raised, #21262d); }

.ohi-td {
  padding: 9px 16px;
  color: var(--text-dark, #e6edf3);
  vertical-align: middle;
}

.ohi-td-name { font-weight: 500; }
.ohi-td-tags { color: var(--text-muted, #7d8590); }
.ohi-td-date { color: var(--text-muted, #7d8590); font-size: 12px; white-space: nowrap; }
.ohi-td-mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
.ohi-td-action { width: 90px; text-align: right; }

.ohi-tag {
  display: inline-block;
  font-size: 11px;
  padding: 1px 6px;
  background: rgba(88, 166, 255, 0.1);
  color: var(--primary, #58a6ff);
  border-radius: 3px;
  margin-right: 4px;
}

.ohi-start-btn {
  padding: 4px 10px;
  background: none;
  border: 1px solid var(--border-color, #30363d);
  color: var(--primary, #58a6ff);
  border-radius: var(--border-radius-sm, 4px);
  cursor: pointer;
  font-size: 12px;
  white-space: nowrap;
  transition: background 0.1s, border-color 0.1s;
}

.ohi-start-btn:hover {
  background: rgba(88, 166, 255, 0.1);
  border-color: var(--primary, #58a6ff);
}

.ohi-start-sm { padding: 3px 8px; }

.ohi-empty {
  padding: 32px 16px;
  color: var(--text-muted, #7d8590);
  font-size: 13px;
  text-align: center;
}

/* ── Board View ── */

.ohi-board {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ohi-board-group {
  border: 1px solid var(--border-color, #30363d);
  border-radius: var(--border-radius, 6px);
  overflow: hidden;
}

.ohi-board-group-header {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--card-bg, #161b22);
  border: none;
  cursor: pointer;
  color: var(--text-dark, #e6edf3);
  font-size: 13px;
  font-weight: 500;
  text-align: left;
}

.ohi-board-group-header:hover { background: var(--surface-raised, #21262d); }

.ohi-board-caret { color: var(--text-muted, #7d8590); font-size: 10px; }
.ohi-board-group-name { color: var(--primary, #58a6ff); }
.ohi-board-group-count { color: var(--text-muted, #7d8590); font-size: 12px; }

.ohi-board-rows {
  border-top: 1px solid var(--border-color, #30363d);
}

.ohi-board-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 14px;
  border-bottom: 1px solid rgba(48, 54, 61, 0.4);
  background: var(--bg-color, #0d1117);
}

.ohi-board-row:last-child { border-bottom: none; }
.ohi-board-name { flex: 1; font-size: 13px; color: var(--text-dark, #e6edf3); }
.ohi-board-ret { font-family: 'JetBrains Mono', monospace; font-size: 12px; }

/* ── Split View ── */

.ohi-split {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.ohi-split-list {
  width: 260px;
  flex-shrink: 0;
  border-right: 1px solid var(--border-color, #30363d);
  overflow-y: auto;
}

.ohi-split-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  cursor: pointer;
  border-bottom: 1px solid rgba(48, 54, 61, 0.4);
  transition: background 0.1s;
}

.ohi-split-row:hover { background: var(--surface-raised, #21262d); }
.ohi-split-selected { background: rgba(88, 166, 255, 0.08); border-right: 2px solid var(--primary, #58a6ff); }
.ohi-split-name { flex: 1; font-size: 13px; color: var(--text-dark, #e6edf3); }

.ohi-split-detail {
  flex: 1;
  padding: 24px 28px;
  overflow-y: auto;
}

.ohi-split-detail-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-dark, #e6edf3);
  margin: 0 0 20px;
}

.ohi-split-detail-grid {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 10px 16px;
  margin-bottom: 24px;
}

.ohi-split-label {
  font-size: 12px;
  color: var(--text-muted, #7d8590);
  align-self: center;
}

.ohi-split-val {
  font-size: 13px;
  color: var(--text-dark, #e6edf3);
  align-self: center;
}

.ohi-mono { font-family: 'JetBrains Mono', monospace; }

.ohi-split-actions {
  display: flex;
  gap: 10px;
}

.ohi-launch-btn {
  padding: 8px 20px;
  background: var(--primary, #58a6ff);
  color: #0d1117;
  border: none;
  border-radius: var(--border-radius-sm, 4px);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.1s;
}

.ohi-launch-btn:hover { background: var(--primary-hover, #79b8ff); }

.ohi-edit-btn {
  padding: 8px 16px;
  background: none;
  border: 1px solid var(--border-color, #30363d);
  color: var(--text-muted, #7d8590);
  border-radius: var(--border-radius-sm, 4px);
  font-size: 14px;
  cursor: pointer;
  transition: border-color 0.1s, color 0.1s;
}

.ohi-edit-btn:hover {
  border-color: var(--text-muted, #7d8590);
  color: var(--text-dark, #e6edf3);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/ObsidianHome.tsx src/pages/ObsidianHome.css
git commit -m "feat(obsidian): add ObsidianHome with List/Board/Split views and top bar"
```

---

## Task 6: Wire ObsidianHome into Home.tsx

**Files:**
- Modify: `src/pages/Home.tsx`

- [ ] **Step 1: Add ObsidianHome import and early return to Home.tsx**

At the top of `src/pages/Home.tsx`, add import after existing imports:
```tsx
import ObsidianHome from './ObsidianHome'
```

In the `Home()` function, add the `useSettings` hook if not already destructured (it's already imported). Then, add an early return as the **first statement of the return block** — specifically, find the `useSettings` call in Home.tsx, confirm `theme` is already destructured. Then add just before the first `return (`:

```tsx
    if (theme === 'obsidian') {
        return <ObsidianHome />
    }
```

This is inside the component function, after all hooks but before the regular return.

- [ ] **Step 2: Verify Home.tsx still has useSettings importing theme**

Check that this line exists in Home.tsx:
```tsx
const { theme } = useSettings()
```
If `theme` is not destructured yet, add it to the existing `useSettings()` destructure.

- [ ] **Step 3: Run TypeScript check**

```bash
npm run build 2>&1 | grep -E "error TS|Error"
```
Expected: no errors.

- [ ] **Step 4: Verify in dev server with Obsidian theme active**

Switch to Obsidian theme in Settings. Navigate to the Subjects (Home) page. Verify:
- Top bar shows stats, filter, and 3 view toggle buttons
- List view shows subjects as compact rows with sortable columns
- Click a column header — rows re-sort
- Board view groups subjects by tag with collapse/expand
- Split view shows left list + right detail panel
- `▶ Start` / `▶` opens QuickStart modal with subject name in title
- QuickStart modal: presets work, dropdowns populate, "Launch Session" navigates to /session

- [ ] **Step 5: Run all tests**

```bash
npm run test:run 2>&1 | tail -30
```
Expected: all tests pass including the obsidian-utils tests.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Home.tsx
git commit -m "feat(obsidian): wire ObsidianHome into Home page via theme branch"
```

---

## Self-Review Checklist

After all tasks complete, verify against spec:

- [ ] `obsidian` in `Theme` union → Task 1
- [ ] CSS variables match spec palette → Task 1
- [ ] "Redesign" group in Settings → Task 1
- [ ] Compact 64px icon sidebar → Task 4
- [ ] Active nav: blue icon + left accent bar → Task 4
- [ ] Review-due dot preserved → Task 4 (inherited from navItems)
- [ ] Bottom quote bar always visible → Task 4
- [ ] Quote rotation + edit button → Task 4
- [ ] Home top bar: today/week stats, filter, view toggle → Task 5
- [ ] View mode persists to localStorage → Task 5
- [ ] List view: sortable columns, retention color, Start button → Task 5
- [ ] Board view: grouped by first tag, Ungrouped last, collapse persists → Task 5
- [ ] Split view: left list, right detail, default selects pinned → Task 5
- [ ] Quick-start modal: presets, technique, chapter dropdowns → Task 3
- [ ] Quick-start: launches session via `activeSession` localStorage → Task 3
- [ ] groupByTag, retentionColor, buildQuickStartSession tested → Task 2
- [ ] Other themes unaffected → verified by not touching non-obsidian code paths
