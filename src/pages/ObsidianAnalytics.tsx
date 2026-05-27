import { useState, useEffect, useMemo } from 'react'
import { AlignJustify, Columns2, Minimize2 } from 'lucide-react'
import { getSessions, getSubjects, getAllSessionBlocks, getAllSubjectTagsMap } from '../lib/db'
import type { Session, Subject, SessionBlock } from '../lib/db'
import { getRatings } from '../lib/chapters'
import { TECHNIQUES } from '../lib/techniques'
import { useSettings } from '../lib/settings'
import {
  computeStreaks, computeWeeklyStats, computeSubjectBreakdown,
  computeDeadlineUrgency, computeFocusTypeBreakdown, computeTechTierBreakdown,
  computeTimeOfDay, computeTimeline, computeCalibration, computeTagBreakdown,
  computeWeekTrend,
  type SubjectRow, type DeadlineRow, type TierBreakdown, type FocusBreakdown,
  type TimelineResult, type CalibrationResult, type TagBreakdown as TagBreakdownData,
  type TimeOfDay, type Streaks, type WeeklyStats, type WeekTrend,
} from '../lib/analytics-utils'
import './ObsidianAnalytics.css'

type AnalyticsView = 'command' | 'narrative' | 'minimal'
const LS_VIEW_KEY = 'obsidian-analytics-view'
const LS_TIMELINE_KEY = 'obsidian-analytics-timeline'

export interface DerivedAnalytics {
  streaks: Streaks
  weekly: WeeklyStats
  trend: WeekTrend
  avgSession: number
  subjectRows: SubjectRow[]
  deadlineRows: DeadlineRow[]
  focusBreakdown: FocusBreakdown
  techTiers: TierBreakdown
  timeOfDay: TimeOfDay
  timeline: TimelineResult
  calibration: CalibrationResult | null
  tags: TagBreakdownData
  subjects: Subject[]
  sessions: Session[]
  blocks: SessionBlock[]
  subjectTagsMap: Map<string, string[]>
}

export default function ObsidianAnalytics() {
  const { weekStart } = useSettings()
  const [view, setView] = useState<AnalyticsView>(
    () => (localStorage.getItem(LS_VIEW_KEY) as AnalyticsView | null) ?? 'command'
  )
  const [timelineFilter, setTimelineFilter] = useState(
    () => parseFloat(localStorage.getItem(LS_TIMELINE_KEY) ?? '1')
  )
  const [sessions, setSessions] = useState<Session[]>([])
  const [blocks, setBlocks] = useState<SessionBlock[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [subjectTagsMap, setSubjectTagsMap] = useState<Map<string, string[]>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    Promise.all([getSessions(), getSubjects(), getAllSessionBlocks(), getAllSubjectTagsMap()]).then(
      ([sess, subs, blks, tagsMap]) => {
        if (!mounted) return
        setSessions(sess)
        setSubjects(subs.filter(s => !s.deleted_at && !s.archived))
        setBlocks(blks)
        setSubjectTagsMap(tagsMap)
        setLoading(false)
      }
    )
    return () => { mounted = false }
  }, [])

  function changeView(v: AnalyticsView) {
    setView(v)
    localStorage.setItem(LS_VIEW_KEY, v)
  }

  function changeTimeline(v: number) {
    setTimelineFilter(v)
    localStorage.setItem(LS_TIMELINE_KEY, String(v))
  }

  const derived = useMemo<DerivedAnalytics | null>(() => {
    if (loading) return null
    const weekly = computeWeeklyStats(sessions, weekStart)
    return {
      streaks: computeStreaks(sessions),
      weekly,
      trend: computeWeekTrend(sessions, weekly, weekStart),
      avgSession: sessions.length > 0
        ? Math.round(sessions.reduce((a, s) => a + s.actual_minutes, 0) / sessions.length)
        : 0,
      subjectRows: computeSubjectBreakdown(blocks, subjects, sessions),
      deadlineRows: computeDeadlineUrgency(subjects, blocks),
      focusBreakdown: computeFocusTypeBreakdown(blocks, TECHNIQUES),
      techTiers: computeTechTierBreakdown(blocks, sessions, TECHNIQUES),
      timeOfDay: computeTimeOfDay(sessions),
      timeline: computeTimeline(sessions, timelineFilter),
      calibration: computeCalibration(getRatings()),
      tags: computeTagBreakdown(blocks, sessions, subjectTagsMap),
      subjects,
      sessions,
      blocks,
      subjectTagsMap,
    }
  }, [sessions, blocks, subjects, subjectTagsMap, weekStart, timelineFilter, loading])

  if (loading || !derived) {
    return (
      <div className="oa-root">
        <div className="oa-loading">Loading analytics…</div>
      </div>
    )
  }

  return (
    <div className="oa-root">
      <div className="oa-topbar">
        <div className="oa-view-pills">
          <button
            className={`oa-view-pill${view === 'command' ? ' oa-view-pill-active' : ''}`}
            onClick={() => changeView('command')}
            title="Everything at once — grounding stats, deadline radar, full breakdown"
          >
            <AlignJustify size={14} /> Command
          </button>
          <button
            className={`oa-view-pill${view === 'narrative' ? ' oa-view-pill-active' : ''}`}
            onClick={() => changeView('narrative')}
            title="Story top to bottom — each section answers one question"
          >
            <Columns2 size={14} /> Narrative
          </button>
          <button
            className={`oa-view-pill${view === 'minimal' ? ' oa-view-pill-active' : ''}`}
            onClick={() => changeView('minimal')}
            title="Just what matters — time, streak, subjects, techniques"
          >
            <Minimize2 size={14} /> Minimal
          </button>
        </div>
      </div>
      <div className="oa-content">
        {view === 'command' && (
          <CommandView derived={derived} timelineFilter={timelineFilter} onTimelineChange={changeTimeline} />
        )}
        {view === 'narrative' && (
          <NarrativeView derived={derived} timelineFilter={timelineFilter} onTimelineChange={changeTimeline} />
        )}
        {view === 'minimal' && (
          <MinimalView derived={derived} timelineFilter={timelineFilter} onTimelineChange={changeTimeline} />
        )}
      </div>
    </div>
  )
}

function CommandView(_p: { derived: DerivedAnalytics; timelineFilter: number; onTimelineChange: (v: number) => void }) {
  return <div className="oa-view-placeholder">Command view coming soon</div>
}
function NarrativeView(_p: { derived: DerivedAnalytics; timelineFilter: number; onTimelineChange: (v: number) => void }) {
  return <div className="oa-view-placeholder">Narrative view coming soon</div>
}
function MinimalView(_p: { derived: DerivedAnalytics; timelineFilter: number; onTimelineChange: (v: number) => void }) {
  return <div className="oa-view-placeholder">Minimal view coming soon</div>
}
