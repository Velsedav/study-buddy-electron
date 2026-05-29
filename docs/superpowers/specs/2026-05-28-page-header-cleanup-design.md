# Page Header Cleanup — Design Spec

## Goal

Remove the redundant `.page-header` block (icon-wrapper + h1 title) from `Learning`, `BingoDashboard`, `MetacognitionLogs`, and `Settings` so the sidebar stays the single source of "where am I" navigation context.

## Context

Every page renders `<div className="page-header"><div className="page-title-group"><div className="icon-wrapper bg-X"><Icon /></div><h1>Page Name</h1></div></div>` at its top. The sidebar nav already highlights the active page, so the icon + title block duplicates that information and wastes vertical space — especially on the 1080×2560 portrait monitor.

`BingoObjectivePage` already uses a custom `objPage-header` and doesn't have this issue. `BingoDashboard` has a year-nav widget nested inside its `.page-header` that must be preserved.

## Scope

In scope:
- `src/pages/Learning.tsx`
- `src/pages/MetacognitionLogs.tsx`
- `src/pages/Settings.tsx`
- `src/pages/bingoals/BingoDashboard.tsx`

Out of scope:
- Sidebar navigation
- Other pages with `.page-header` (`Home`, `Analytics`, `Dev`, `Plan`, `ObsidianPlanner`, `BingoObjectivePage`)
- `.page-header` global CSS rules (left intact — still used elsewhere)
- Settings menu restructure (handled in a separate brainstorm)

---

## Changes per file

### `src/pages/Learning.tsx`

Delete the `.page-header` block at lines 1041–1046:

```tsx
<div className="page-header">
    <div className="page-title-group">
        <div className="icon-wrapper bg-accent"><Sparkles size={20} /></div>
        <h1>Learning Center</h1>
    </div>
</div>
```

The `learning-tab` block immediately below becomes the first child.

Remove the unused `Sparkles` import if it's not referenced elsewhere in the file.

### `src/pages/MetacognitionLogs.tsx`

Delete the `.page-header.metacognition-logs-header` block at lines 69–74:

```tsx
<div className="page-header metacognition-logs-header">
    <div className="page-title-group">
        <div className="icon-wrapper bg-orange"><Wrench size={20} /></div>
        <h1>{t('nav.metacognition_logs')}</h1>
    </div>
</div>
```

Keep the `Wrench` import — it's still used in the empty-state block.

The `metacognition-logs-content` block below becomes the first child.

### `src/pages/Settings.tsx`

Delete the `.page-header` block at lines 256–261:

```tsx
<div className="page-header">
    <div className="page-title-group">
        <div className="icon-wrapper bg-orange"><SettingsIcon size={20} /></div>
        <h1>{t('nav.settings')}</h1>
    </div>
</div>
```

Remove the `SettingsIcon` alias import only if it's not used in any settings section header — check before deleting.

### `src/pages/bingoals/BingoDashboard.tsx`

The `.page-header` here also contains the `.bingo-year-nav` widget. Replace the whole `.page-header` block (around lines 132–roughly 160 depending on year-nav length) with a slimmer toolbar that keeps only the year nav:

Before:
```tsx
<div className="page-header">
    <div className="page-title-group">
      <div className="icon-wrapper bg-blue"><Target size={20} /></div>
      <h1 className="page-header-title">
        {t('bingoals.page_title')} <span className="bingo-title-year">{selectedYear}</span>
      </h1>
    </div>
    <div className="bingo-year-nav">
      ...year buttons...
    </div>
</div>
```

After:
```tsx
<div className="bingo-toolbar">
    <div className="bingo-year-nav">
      ...year buttons unchanged...
    </div>
</div>
```

Drop the now-unused `Target` icon import if it's not referenced elsewhere on the page.

The current page title text included `selectedYear`. The year-nav buttons already display the active year, so no replacement label is added — drop the title outright.

---

## New CSS

Add one new class to `src/styles/bingoals.css`:

```css
.bingoals-root .bingo-toolbar {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    margin-bottom: 16px;
    gap: 12px;
}
```

No other CSS changes. Global `.page-header` rules in `src/index.css` are left alone (still used by Home, Analytics, etc.).

---

## Testing

No unit tests touched — pure structural change, no logic affected.

Manual smoke checklist:
- Navigate to Learning — page content starts at top, no broken layout
- Navigate to Metacognition Logs — same
- Navigate to Settings — sections render normally, no broken hierarchy
- Navigate to Bingoals (dashboard) — year nav still visible and functional (forward/back, return-to-current-year when applicable), grid renders below
- Sidebar still highlights the active page on each
- Vertical space at top of each page reduced (matches BingoObjectivePage / ObsidianHome style)
- `npm test` and `npx tsc --noEmit` both clean (no test/type regressions from removing imports)
