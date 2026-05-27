import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ChevronDown } from 'lucide-react'
import { TECHNIQUES } from '../lib/techniques'
import { getChaptersForSubject } from '../lib/chapters'
import type { Chapter } from '../lib/chapters'
import type { Subject } from '../lib/db'
import { buildQuickStartSession } from '../lib/obsidian-utils'
import TechniquePickerModal from './TechniquePickerModal'
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
  const [pickerOpen, setPickerOpen] = useState(false)

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
    if (!isNaN(parsed) && parsed > 0 && parsed <= 480) {
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
          <button className="oqs-close" onClick={handleClose} aria-label="Close modal"><X size={16} /></button>
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
          <button className="oqs-technique-btn" onClick={() => setPickerOpen(true)}>
            <span className="oqs-technique-name">
              {techniqueId ? (TECHNIQUES.find(t => t.id === techniqueId)?.name ?? '— none —') : '— none —'}
            </span>
            <ChevronDown size={14} />
          </button>
        </div>

        <div className="oqs-field">
          <label className="oqs-label" htmlFor="oqs-chapter">Chapter <span className="oqs-optional">(optional)</span></label>
          <select
            id="oqs-chapter"
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

      {pickerOpen && (
        <TechniquePickerModal
          onClose={() => setPickerOpen(false)}
          onSelect={(id) => {
            handleTechniqueChange(id)
            setPickerOpen(false)
          }}
          currentSelection={techniqueId}
        />
      )}
    </div>
  )
}
