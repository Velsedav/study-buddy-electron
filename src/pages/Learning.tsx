import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Sparkles, RotateCcw, Trophy, Lock, GraduationCap, Eye, EyeOff, PlusCircle } from 'lucide-react';
import { playSFX, SFX } from '../lib/sounds';
import { useSettings } from '../lib/settings';
import { curriculum } from '../lib/learningContent';
import type { Section, QuizOption } from '../lib/learningContent';
import { isDevMode, isDevNavUnlocked } from '../lib/devMode';
import { useTranslation } from '../lib/i18n';
import ObsidianLearning from './ObsidianLearning';
import './Learning.css';

// ── Spaced Repetition Types & Constants ──

export interface SRSEntry {
    level: number;
    lastCompleted: string;
    nextReviewAt: string;
    lockedUntil?: string;
}

export type SRSState = Record<string, SRSEntry>;

const SRS_INTERVALS_DAYS = [7, 14, 30, 90];
export const MAX_SRS_LEVEL = SRS_INTERVALS_DAYS.length;

export function getIntervalDays(level: number): number {
    if (level <= 0) return 0;
    return SRS_INTERVALS_DAYS[Math.min(level - 1, SRS_INTERVALS_DAYS.length - 1)];
}

export function addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

export function getNextDayStart(): Date {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return d;
}


export function getSectionQuestionIds(section: Section): number[] {
    return section.chapters.flatMap(ch => ch.lessons.map(l => l.question.id));
}

export function isSectionPerfect(section: Section, quizState: Record<number, Record<string, boolean>>): boolean {
    const qIds = getSectionQuestionIds(section);
    return qIds.every(qId => {
        const answers = quizState[qId];
        if (!answers) return false;
        return Object.values(answers).some(v => v === true);
    });
}

export function sectionHasWrongAnswer(section: Section, quizState: Record<number, Record<string, boolean>>): boolean {
    const qIds = getSectionQuestionIds(section);
    return qIds.some(qId => {
        const answers = quizState[qId];
        if (!answers) return false;
        return Object.values(answers).some(v => v === false);
    });
}

export function isSectionDue(srsEntry: SRSEntry | undefined): boolean {
    if (!srsEntry || srsEntry.level === 0) return false;
    return new Date().getTime() >= new Date(srsEntry.nextReviewAt).getTime();
}

export function isSectionLocked(srsEntry: SRSEntry | undefined): boolean {
    if (isDevMode()) return false;
    if (!srsEntry?.lockedUntil) return false;
    return new Date().getTime() < new Date(srsEntry.lockedUntil).getTime();
}

export function getTimeUntil(isoDateStr: string): string {
    const now = new Date().getTime();
    const target = new Date(isoDateStr).getTime();
    const diffMs = target - now;
    if (diffMs <= 0) return 'Now';
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return '1 day';
    if (diffDays < 7) return `${diffDays} days`;
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks === 1 && diffDays < 14) return '1 week';
    if (diffDays < 30) return `${diffWeeks}w ${diffDays % 7}d`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths === 1) return '~1 month';
    return `~${diffMonths} months`;
}

export function getLevelLabel(level: number): string {
    switch (level) {
        case 1: return 'Level 1 · 1 week';
        case 2: return 'Level 2 · 2 weeks';
        case 3: return 'Level 3 · 1 month';
        case 4: return 'Level 4 · 3 months';
        default: return 'New';
    }
}

export function isSectionGraduated(srsEntry: SRSEntry | undefined): boolean {
    return (srsEntry?.level ?? 0) >= MAX_SRS_LEVEL;
}

// ── localStorage helpers ──

export function loadQuizState(): Record<number, Record<string, boolean>> {
    try {
        const saved = localStorage.getItem('study-buddy-quiz-state');
        if (saved) return JSON.parse(saved);
    } catch { }
    return {};
}

export function loadSRSState(): SRSState {
    try {
        const saved = localStorage.getItem('study-buddy-srs-state');
        if (saved) return JSON.parse(saved);
    } catch { }
    return {};
}

// ── Observation Journal Types & Helpers ──

export interface LessonObservation {
    date: string; // ISO
    noticed: boolean | null; // true = noticed, false = not noticed, null = just journaled
    note: string;
}

export type ObservationsState = Record<string, LessonObservation[]>; // keyed by lessonId

export function loadObservationsState(): ObservationsState {
    try {
        const saved = localStorage.getItem('study-buddy-observations');
        if (saved) return JSON.parse(saved);
    } catch { }
    return {};
}

// ── Giant Sailor Moon Celebration ──

export function CelebrationOverlay({ onDone }: { onDone: () => void }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [showText, setShowText] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        // Massive particle setup
        const particles: {
            x: number; y: number; vx: number; vy: number;
            size: number; color: string; rotation: number; rotSpeed: number;
            life: number; maxLife: number; shape: 'circle' | 'rect' | 'star' | 'heart' | 'sparkle';
            trail: { x: number; y: number; alpha: number }[];
        }[] = [];

        const colors = [
            '#FFD700', '#FF69B4', '#FF1493', '#FF6B6B', '#4ECDC4',
            '#45B7D1', '#96CEB4', '#FF9F1C', '#E8A1E8', '#89CFF0',
            '#F0E68C', '#DDA0DD', '#FF7F50', '#98FB98', '#ADD8E6',
            '#FFB6C1', '#FFA07A', '#87CEEB', '#DA70D6', '#FFDAB9',
        ];

        // Wave 1: Massive center burst
        for (let i = 0; i < 200; i++) {
            const angle = (Math.random() * Math.PI * 2);
            const speed = 4 + Math.random() * 14;
            particles.push({
                x: cx, y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 6,
                size: 5 + Math.random() * 14,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 15,
                life: 0,
                maxLife: 100 + Math.random() * 100,
                shape: (['circle', 'rect', 'star', 'heart', 'sparkle'] as const)[Math.floor(Math.random() * 5)],
                trail: [],
            });
        }

        // Wave 2: Side fountains
        for (let i = 0; i < 80; i++) {
            const side = i % 2 === 0 ? 0 : canvas.width;
            const angle = side === 0 ? (-Math.PI / 4 + Math.random() * Math.PI / 2) : (Math.PI / 2 + Math.PI / 4 + Math.random() * Math.PI / 2);
            const speed = 6 + Math.random() * 10;
            particles.push({
                x: side, y: canvas.height * 0.7,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 8,
                size: 4 + Math.random() * 10,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 12,
                life: -Math.random() * 20,
                maxLife: 80 + Math.random() * 60,
                shape: (['circle', 'star', 'heart', 'sparkle'] as const)[Math.floor(Math.random() * 4)],
                trail: [],
            });
        }

        // Wave 3: Top rain
        for (let i = 0; i < 100; i++) {
            particles.push({
                x: Math.random() * canvas.width, y: -20 - Math.random() * 100,
                vx: (Math.random() - 0.5) * 3,
                vy: 2 + Math.random() * 5,
                size: 3 + Math.random() * 8,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 10,
                life: -10 - Math.random() * 40,
                maxLife: 120 + Math.random() * 60,
                shape: (['circle', 'rect', 'sparkle'] as const)[Math.floor(Math.random() * 3)],
                trail: [],
            });
        }

        let frame = 0;
        const maxFrame = 220;

        // Show celebration text after a short delay
        setTimeout(() => setShowText(true), 300);

        const drawHeart = (ctx: CanvasRenderingContext2D, size: number) => {
            const s = size * 0.5;
            ctx.beginPath();
            ctx.moveTo(0, s * 0.4);
            ctx.bezierCurveTo(-s, -s * 0.4, -s * 0.5, -s, 0, -s * 0.6);
            ctx.bezierCurveTo(s * 0.5, -s, s, -s * 0.4, 0, s * 0.4);
            ctx.fill();
        };

        const drawSparkle = (ctx: CanvasRenderingContext2D, size: number) => {
            const s = size * 0.5;
            ctx.beginPath();
            for (let i = 0; i < 4; i++) {
                const angle = (i * Math.PI) / 2;
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(angle) * s, Math.sin(angle) * s);
                ctx.lineTo(Math.cos(angle + Math.PI / 4) * s * 0.3, Math.sin(angle + Math.PI / 4) * s * 0.3);
            }
            ctx.closePath();
            ctx.fill();
        };

        const drawStar = (ctx: CanvasRenderingContext2D, size: number) => {
            ctx.beginPath();
            for (let j = 0; j < 5; j++) {
                const a = (j * 4 * Math.PI) / 5 - Math.PI / 2;
                ctx.lineTo(Math.cos(a) * size * 0.5, Math.sin(a) * size * 0.5);
                const a2 = a + (2 * Math.PI) / 10;
                ctx.lineTo(Math.cos(a2) * size * 0.2, Math.sin(a2) * size * 0.2);
            }
            ctx.closePath();
            ctx.fill();
        };

        const animate = () => {
            frame++;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Radial glow background pulse
            if (frame < 60) {
                const glowAlpha = Math.sin((frame / 60) * Math.PI) * 0.15;
                const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, canvas.width * 0.6);
                gradient.addColorStop(0, `rgba(255, 215, 0, ${glowAlpha})`);
                gradient.addColorStop(0.5, `rgba(255, 105, 180, ${glowAlpha * 0.5})`);
                gradient.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            for (const p of particles) {
                if (p.life < 0) { p.life++; continue; }
                p.life++;
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.1;
                p.vx *= 0.995;
                p.rotation += p.rotSpeed;

                // Trail
                if (p.life % 2 === 0 && p.trail.length < 6) {
                    p.trail.push({ x: p.x, y: p.y, alpha: 0.4 });
                }
                for (let t = p.trail.length - 1; t >= 0; t--) {
                    p.trail[t].alpha -= 0.06;
                    if (p.trail[t].alpha <= 0) p.trail.splice(t, 1);
                }

                const alpha = Math.max(0, 1 - p.life / p.maxLife);
                if (alpha <= 0) continue;

                // Draw trail
                for (const t of p.trail) {
                    ctx.save();
                    ctx.globalAlpha = t.alpha * alpha;
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.arc(t.x, t.y, p.size * 0.3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }

                // Draw particle
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.globalAlpha = alpha;
                ctx.fillStyle = p.color;

                if (p.shape === 'circle') {
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
                    ctx.fill();
                } else if (p.shape === 'rect') {
                    ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
                } else if (p.shape === 'star') {
                    drawStar(ctx, p.size);
                } else if (p.shape === 'heart') {
                    drawHeart(ctx, p.size);
                } else {
                    drawSparkle(ctx, p.size);
                }

                // Glow effect
                ctx.shadowBlur = 8;
                ctx.shadowColor = p.color;
                ctx.fill();
                ctx.shadowBlur = 0;

                ctx.restore();
            }

            if (frame < maxFrame) {
                requestAnimationFrame(animate);
            } else {
                setShowText(false);
                setTimeout(onDone, 500);
            }
        };

        animate();
    }, [onDone]);

    return (
        <>
            <canvas ref={canvasRef} className="celebration-canvas" />
            {showText && (
                <div className="celebration-text">
                    <div className="celebration-text-inner">
                        ✨ Perfect Score! ✨
                    </div>
                </div>
            )}
        </>
    );
}

// ── Observation Panel ──

export function ObservationPanel({ lessonId: _lessonId, observations, onAdd, t, theme }: {
    lessonId: string;
    observations: LessonObservation[];
    onAdd: (obs: LessonObservation) => void;
    t: (key: string) => string;
    theme: string;
}) {
    const [open, setOpen] = useState(false);
    const [noticed, setNoticed] = useState<boolean | null>(null);
    const [note, setNote] = useState('');

    function submit() {
        if (!note.trim() && noticed === null) return;
        onAdd({ date: new Date().toISOString(), noticed, note: note.trim() });
        setNote('');
        setNoticed(null);
        setOpen(false);
        playSFX(SFX.CHECK, theme);
    }

    return (
        <div className="observation-panel">
            {observations.length === 0 ? (
                <div className="observation-prompt">
                    <Eye size={14} />
                    <span>{t('learning.observe_prompt')}</span>
                </div>
            ) : (
                <div className="observation-log">
                    {observations.map((obs, i) => (
                        <div key={i} className="observation-entry">
                            <span className={`observation-noticed-badge${obs.noticed === true ? ' yes' : obs.noticed === false ? ' no' : ' neutral'}`}>
                                {obs.noticed === true ? t('learning.noticed_yes') : obs.noticed === false ? t('learning.noticed_no') : '·'}
                            </span>
                            <span className="observation-date">{new Date(obs.date).toLocaleDateString()}</span>
                            {obs.note && <span className="observation-note">{obs.note}</span>}
                        </div>
                    ))}
                </div>
            )}
            {!open ? (
                <button className="btn-text observation-add-btn" onClick={() => setOpen(true)}>
                    <PlusCircle size={13} />
                    {t('learning.add_observation')}
                </button>
            ) : (
                <div className="observation-form">
                    <div className="observation-form-noticed">
                        <span className="observation-form-label">{t('learning.noticed_question')}</span>
                        <div className="observation-noticed-btns">
                            <button className={`btn-noticed${noticed === true ? ' active-yes' : ''}`} onClick={() => setNoticed(noticed === true ? null : true)}>
                                <Eye size={12} /> {t('learning.noticed_yes')}
                            </button>
                            <button className={`btn-noticed${noticed === false ? ' active-no' : ''}`} onClick={() => setNoticed(noticed === false ? null : false)}>
                                <EyeOff size={12} /> {t('learning.noticed_no')}
                            </button>
                        </div>
                    </div>
                    <textarea
                        className="observation-textarea"
                        placeholder={t('learning.observation_placeholder')}
                        value={note}
                        rows={2}
                        onChange={(e) => setNote(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
                    />
                    <div className="observation-form-actions">
                        <button className="btn btn-secondary" onClick={() => setOpen(false)}>{t('learning.observation_cancel')}</button>
                        <button className="btn btn-primary" onClick={submit} disabled={!note.trim() && noticed === null}>{t('learning.observation_save')}</button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Main Component ──

export default function LearningTab() {
    return <ObsidianLearning />;
}
