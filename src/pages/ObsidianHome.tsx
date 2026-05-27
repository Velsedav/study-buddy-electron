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
        <button className={`ohi-view-btn${view === 'list' ? ' ohi-view-active' : ''}`} title="List view" aria-label="List view" onClick={() => onViewChange('list')}><List size={16} /></button>
        <button className={`ohi-view-btn${view === 'board' ? ' ohi-view-active' : ''}`} title="Board view" aria-label="Board view" onClick={() => onViewChange('board')}><LayoutGrid size={16} /></button>
        <button className={`ohi-view-btn${view === 'split' ? ' ohi-view-active' : ''}`} title="Split view" aria-label="Split view" onClick={() => onViewChange('split')}><Columns size={16} /></button>
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
          editingSubject={editingSubject}
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
