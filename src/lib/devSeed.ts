/**
 * Dev-only seeding helpers.
 *
 * Inserts deterministic fake subjects, sessions, and metacognition logs so the
 * UI can be evaluated on an otherwise-empty profile. Every row created here
 * uses the `seed-` id prefix so `clearSeedData()` can purge only fake data
 * without touching real user records.
 */

import { getDb } from './db';
import type { Tag } from './db';

const SEED_PREFIX = 'seed-';
const CHAPTERS_LS_KEY = 'study-buddy-chapters';

// ── Deterministic RNG so re-runs look identical ─────────────────────────────

function mulberry32(seed: number) {
    let a = seed >>> 0;
    return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function pickInt(rand: () => number, min: number, max: number): number {
    return Math.floor(rand() * (max - min + 1)) + min;
}

function pick<T>(rand: () => number, arr: readonly T[]): T {
    return arr[Math.floor(rand() * arr.length)];
}

// ── Fixtures ────────────────────────────────────────────────────────────────

interface SeedSubjectFixture {
    name: string;
    tags: string[];
    subjectType: string | null;
    chapters: string[];
    deadlineDaysAhead: number | null;
}

const SUBJECT_FIXTURES: SeedSubjectFixture[] = [
    {
        name: 'Linear Algebra',
        tags: ['math', 'exam-prep'],
        subjectType: 'comprehension',
        chapters: ['Vector spaces', 'Linear maps', 'Eigenvalues', 'Inner products'],
        deadlineDaysAhead: 42,
    },
    {
        name: 'Organic Chemistry',
        tags: ['science', 'memorization'],
        subjectType: 'memorisation',
        chapters: ['Functional groups', 'Stereochemistry', 'Reaction mechanisms', 'Spectroscopy'],
        deadlineDaysAhead: 64,
    },
    {
        name: 'Spanish — B2',
        tags: ['languages'],
        subjectType: 'memorisation',
        chapters: ['Subjunctive mood', 'Conditional sentences', 'Reading: news', 'Listening practice'],
        deadlineDaysAhead: null,
    },
    {
        name: 'Algorithms & Data Structures',
        tags: ['cs', 'skill'],
        subjectType: 'skill',
        chapters: ['Big-O', 'Trees & graphs', 'Dynamic programming', 'Greedy algorithms'],
        deadlineDaysAhead: 28,
    },
    {
        name: 'Anatomy — Cardiovascular',
        tags: ['science', 'exam-prep'],
        subjectType: 'memorisation',
        chapters: ['Heart anatomy', 'Conduction system', 'Vasculature', 'Pathologies'],
        deadlineDaysAhead: 90,
    },
    {
        name: 'Piano — Bach Invention 4',
        tags: ['music', 'skill'],
        subjectType: 'skill',
        chapters: ['Measures 1-8', 'Measures 9-16', 'Measures 17-24', 'Full piece run-through'],
        deadlineDaysAhead: null,
    },
];

interface SeedChapter {
    id: string;
    subjectId: string;
    name: string;
    studyCount: number;
    lastStudiedAt: string | null;
    createdAt: string;
    focusType: 'skill' | 'comprehension' | 'memorisation' | null;
    spacingOverride?: string;
    totalMeasures?: number;
    currentMeasure?: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function isoOffsetDays(days: number, hour = 0, minute = 0): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
}

function loadSeedChapters(): SeedChapter[] {
    try {
        const raw = localStorage.getItem(CHAPTERS_LS_KEY);
        if (raw) return JSON.parse(raw);
    } catch { }
    return [];
}

function saveSeedChapters(all: SeedChapter[]) {
    localStorage.setItem(CHAPTERS_LS_KEY, JSON.stringify(all));
}

function focusTypeFor(subjectType: string | null): SeedChapter['focusType'] {
    if (subjectType === 'skill') return 'skill';
    if (subjectType === 'memorisation') return 'memorisation';
    if (subjectType === 'comprehension') return 'comprehension';
    return null;
}

function slugify(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Insert a fake subject + its tag links directly. Any tag we have to create
 * gets a `seed-tag-*` id so `clearSeedData()` can drop only fake tags. Real
 * tags with the same name are reused.
 */
async function insertSeedSubject(subject: {
    id: string;
    name: string;
    cover_path: string | null;
    pinned: boolean;
    created_at: string;
    last_studied_at: string | null;
    total_minutes: number;
    deadline: string | null;
    result: string | null;
    archived: boolean;
    subject_type: string | null;
}, tags: string[]) {
    const db = await getDb();
    await db.execute(
        `INSERT INTO subjects (id, name, cover_path, pinned, created_at, last_studied_at, total_minutes, deadline, result, archived, subject_type)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
            subject.id, subject.name, subject.cover_path,
            subject.pinned ? 1 : 0, subject.created_at, subject.last_studied_at,
            subject.total_minutes, subject.deadline, subject.result,
            subject.archived ? 1 : 0, subject.subject_type,
        ],
    );
    for (const tName of tags) {
        const normalized = tName.trim().toLowerCase();
        if (!normalized) continue;
        const existing = await db.select<Tag[]>(`SELECT * FROM tags WHERE LOWER(name) = $1`, [normalized]);
        let tagId = existing[0]?.id;
        if (!tagId) {
            tagId = `${SEED_PREFIX}tag-${slugify(normalized)}`;
            await db.execute(`INSERT OR IGNORE INTO tags (id, name) VALUES ($1, $2)`, [tagId, normalized]);
        }
        await db.execute(`INSERT OR IGNORE INTO subject_tags (subject_id, tag_id) VALUES ($1, $2)`, [subject.id, tagId]);
    }
}

// ── Public API ──────────────────────────────────────────────────────────────

export interface SeedSummary {
    subjects: number;
    chapters: number;
    sessions: number;
    metacognitionLogs: number;
}

export async function hasSeedData(): Promise<boolean> {
    try {
        const db = await getDb();
        const rows = await db.select<{ cnt: number }[]>(
            `SELECT COUNT(*) as cnt FROM subjects WHERE id LIKE $1`,
            [`${SEED_PREFIX}%`],
        );
        if ((rows[0]?.cnt ?? 0) > 0) return true;
        const sessRows = await db.select<{ cnt: number }[]>(
            `SELECT COUNT(*) as cnt FROM sessions WHERE id LIKE $1`,
            [`${SEED_PREFIX}%`],
        );
        if ((sessRows[0]?.cnt ?? 0) > 0) return true;
        const metaRows = await db.select<{ cnt: number }[]>(
            `SELECT COUNT(*) as cnt FROM metacognition_logs WHERE id LIKE $1`,
            [`${SEED_PREFIX}%`],
        );
        return (metaRows[0]?.cnt ?? 0) > 0;
    } catch {
        return false;
    }
}

export async function seedSubjectsAndChapters(): Promise<{ subjects: number; chapters: number }> {
    // Skip if already present — avoid duplicates on repeat clicks
    const existing = loadSeedChapters().filter(c => c.subjectId.startsWith(SEED_PREFIX));
    if (existing.length > 0) await clearSeedSubjects();

    const rand = mulberry32(20260529);
    const nowIso = new Date().toISOString();

    const chapters: SeedChapter[] = [];
    let subjectCount = 0;

    for (let i = 0; i < SUBJECT_FIXTURES.length; i++) {
        const fx = SUBJECT_FIXTURES[i];
        const subjectId = `${SEED_PREFIX}subj-${String(i + 1).padStart(2, '0')}`;
        const createdAt = isoOffsetDays(-pickInt(rand, 30, 120));
        const lastStudiedAt = isoOffsetDays(-pickInt(rand, 0, 3), 9 + pickInt(rand, 0, 8));
        const totalMinutes = pickInt(rand, 600, 4200);
        const deadline = fx.deadlineDaysAhead != null ? isoOffsetDays(fx.deadlineDaysAhead) : null;

        await insertSeedSubject(
            {
                id: subjectId,
                name: fx.name,
                cover_path: null,
                pinned: i === 0,
                created_at: createdAt,
                last_studied_at: lastStudiedAt,
                total_minutes: totalMinutes,
                deadline,
                result: null,
                archived: false,
                subject_type: fx.subjectType,
            },
            fx.tags,
        );
        subjectCount++;

        for (let cIdx = 0; cIdx < fx.chapters.length; cIdx++) {
            const isMusic = fx.subjectType === 'skill' && fx.name.toLowerCase().includes('piano');
            const studyCount = pickInt(rand, 0, 5);
            const lastStudiedDaysAgo = studyCount === 0 ? null : pickInt(rand, 0, 14);
            const chapter: SeedChapter = {
                id: `${SEED_PREFIX}ch-${i + 1}-${cIdx + 1}`,
                subjectId,
                name: fx.chapters[cIdx],
                studyCount,
                lastStudiedAt: lastStudiedDaysAgo == null
                    ? null
                    : isoOffsetDays(-lastStudiedDaysAgo, 10 + pickInt(rand, 0, 6)),
                createdAt: nowIso,
                focusType: focusTypeFor(fx.subjectType),
            };
            if (isMusic) {
                chapter.totalMeasures = 32;
                chapter.currentMeasure = pickInt(rand, 4, 32);
            }
            chapters.push(chapter);
        }
    }

    const allChapters = loadSeedChapters().filter(c => !c.subjectId.startsWith(SEED_PREFIX));
    saveSeedChapters([...allChapters, ...chapters]);

    return { subjects: subjectCount, chapters: chapters.length };
}

export async function seedSessions(daysBack = 70): Promise<number> {
    const db = await getDb();
    // Refuse to seed sessions without subjects to attach to
    const seedSubjects = await db.select<{ id: string; name: string }[]>(
        `SELECT id, name FROM subjects WHERE id LIKE $1`,
        [`${SEED_PREFIX}%`],
    );
    if (seedSubjects.length === 0) {
        await seedSubjectsAndChapters();
    }
    const subjects = await db.select<{ id: string }[]>(
        `SELECT id FROM subjects WHERE id LIKE $1`,
        [`${SEED_PREFIX}%`],
    );
    const subjectIds = subjects.map(s => s.id);
    const seedChaps = loadSeedChapters().filter(c => c.subjectId.startsWith(SEED_PREFIX));
    const chaptersBySubject = new Map<string, SeedChapter[]>();
    for (const ch of seedChaps) {
        const arr = chaptersBySubject.get(ch.subjectId) ?? [];
        arr.push(ch);
        chaptersBySubject.set(ch.subjectId, arr);
    }

    // Purge any prior seed sessions before reseeding
    await db.execute(`DELETE FROM session_blocks WHERE session_id LIKE $1`, [`${SEED_PREFIX}%`]);
    await db.execute(`DELETE FROM sessions WHERE id LIKE $1`, [`${SEED_PREFIX}%`]);

    const rand = mulberry32(11050529);
    const TECHNIQUE_IDS = ['active_recall', 'spaced_repetition', 'feynman', 'interleaving', 'pomodoro'];

    let sessionCount = 0;

    for (let dayOffset = -daysBack; dayOffset <= 0; dayOffset++) {
        // Skip ~30% of days to look organic
        if (rand() < 0.3) continue;
        const numSessions = pickInt(rand, 1, 3);

        for (let s = 0; s < numSessions; s++) {
            const subjectId = pick(rand, subjectIds);
            const startHour = pickInt(rand, 8, 21);
            const startMinute = pickInt(rand, 0, 59);
            const startedAt = isoOffsetDays(dayOffset, startHour, startMinute);

            const workMinutes = pickInt(rand, 20, 90);
            const breakMinutes = pickInt(rand, 5, 20);
            const repeats = pickInt(rand, 1, 3);
            const plannedTotal = (workMinutes + breakMinutes) * repeats;
            const actualTotal = Math.max(workMinutes, plannedTotal - pickInt(rand, 0, 15));

            const endDate = new Date(startedAt);
            endDate.setMinutes(endDate.getMinutes() + actualTotal);

            const sessionId = `${SEED_PREFIX}sess-${dayOffset}-${s}-${Math.floor(rand() * 1e6)}`;
            const template = pick(rand, ['pomodoro', 'deep-work', 'custom']);

            await db.execute(
                `INSERT INTO sessions (id, started_at, ended_at, template, repeats, planned_minutes, actual_minutes)
                 VALUES ($1,$2,$3,$4,$5,$6,$7)`,
                [sessionId, startedAt, endDate.toISOString(), template, repeats, plannedTotal, actualTotal],
            );

            const chapters = chaptersBySubject.get(subjectId) ?? [];
            const chapterName = chapters.length > 0 ? pick(rand, chapters).name : null;
            const technique = pick(rand, TECHNIQUE_IDS);
            const confidence = pickInt(rand, 2, 5);

            // WORK block(s)
            for (let r = 0; r < repeats; r++) {
                await db.execute(
                    `INSERT INTO session_blocks (id,session_id,idx,type,minutes,subject_id,technique_id,chapter_name,confidence_score)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
                    [crypto.randomUUID(), sessionId, r * 2, 'WORK', workMinutes, subjectId, technique, chapterName, confidence],
                );
                // BREAK block (except after last repeat)
                if (r < repeats - 1) {
                    await db.execute(
                        `INSERT INTO session_blocks (id,session_id,idx,type,minutes,subject_id,technique_id,chapter_name,confidence_score)
                         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
                        [crypto.randomUUID(), sessionId, r * 2 + 1, 'BREAK', breakMinutes, null, null, null, null],
                    );
                }
            }

            // Bump subject total + last_studied
            await db.execute(
                `UPDATE subjects SET total_minutes = total_minutes + $1, last_studied_at = $2 WHERE id = $3`,
                [workMinutes * repeats, startedAt, subjectId],
            );

            sessionCount++;
        }
    }

    return sessionCount;
}

const META_FIXTURES: { memorization_align: string; focus_drop: string; mechanical_fix: string; retention: string }[] = [
    {
        memorization_align: 'Linear Algebra (coef 3) + OChem (coef 2). Spanish on coast — 1 read-aloud per night.',
        focus_drop: "Crashed Thursday afternoon — phone slid into reach during the second pomodoro.",
        mechanical_fix: "Phone in another room before every WORK block. Non-negotiable.",
        retention: 'Eigenvalues feel shaky — review proof of spectral theorem first thing Monday.',
    },
    {
        memorization_align: 'OChem reaction mechanisms (coef 3). Linear Algebra holds at coef 2. Cardio anatomy: weekly skim only.',
        focus_drop: 'Started skipping the warm-up retrieval. Cold-starting the session = first 15 min wasted.',
        mechanical_fix: '2-min retrieval card pull before opening notes. Always.',
        retention: 'Stereochemistry — drawing chair-conformations from memory still slow.',
    },
    {
        memorization_align: 'Algorithms (coef 3) and OChem (coef 3). Drop Spanish to maintenance for the week.',
        focus_drop: 'Evenings ran long → cardio sessions skipped → BDNF crashed. Felt it on Wednesday afternoon.',
        mechanical_fix: 'Workout slot is a hard block on the calendar at 17:30. Treat like an exam.',
        retention: 'Dynamic programming — bottom-up vs top-down recall is fuzzy.',
    },
    {
        memorization_align: 'Cardio anatomy push (coef 3). Maintain LA + algorithms via SRS only.',
        focus_drop: 'Over-planned Sundays — couldn\'t finish the list, finished the week guilty.',
        mechanical_fix: "Sunday plan caps at 70% of weekly capacity. Buffer is sacred.",
        retention: 'Conduction system — re-read AV node section and re-draw the diagram from blank.',
    },
    {
        memorization_align: 'Piano scales (coef 2) + algorithms (coef 3). Spanish: 1 listening per day.',
        focus_drop: 'Got pulled into Discord twice mid-session. Both times lost the whole block.',
        mechanical_fix: 'DnD on phone and computer for any WORK block. Quitting Discord client during sessions.',
        retention: 'Greedy algorithms — proofs of optimality not internalized yet.',
    },
    {
        memorization_align: 'OChem spectroscopy (coef 3). All others maintenance.',
        focus_drop: 'Slept 5.5h average — direct hit on Friday\'s session quality.',
        mechanical_fix: 'Lights-out 23:30 weekdays. Phone outside the room.',
        retention: 'IR vs NMR signature confusion — make a side-by-side comparison card.',
    },
    {
        memorization_align: 'Spanish subjunctive (coef 3). Light maintenance on everything else.',
        focus_drop: 'Two coffees past 16h on Tuesday — slept badly, dragged the whole next day.',
        mechanical_fix: 'Caffeine cutoff at 14:00. No exceptions.',
        retention: 'Subjunctive after impersonal expressions — generate 20 sentences from blank.',
    },
    {
        memorization_align: 'Inner products + spectral theorem (coef 3). Drop OChem to coef 1 this week.',
        focus_drop: "Notion rabbit-holed me on Wednesday. Spent 40 min restructuring instead of studying.",
        mechanical_fix: 'No tool reconfiguration during study days — only on Sundays.',
        retention: 'Gram-Schmidt — derive the orthogonal projection formula by hand twice.',
    },
    {
        memorization_align: 'Maintenance week. Re-test every flagged chapter at least once.',
        focus_drop: 'Underestimated the deadline week — anxious sessions, less effective recall.',
        mechanical_fix: 'On deadline weeks: shorter blocks (40 min) with mandatory 10-min walk.',
        retention: 'Vasculature — collateral circulation routes need a clean diagram from scratch.',
    },
    {
        memorization_align: 'Reset week. Re-baseline coefficients next Sunday after exam.',
        focus_drop: 'Post-exam crash — lost two days. Expected, but planning didn\'t allow for it.',
        mechanical_fix: 'Bake a 2-day decompression buffer into post-exam weeks.',
        retention: 'Mostly stable. Run a "blind retrieval" sweep next Sunday to confirm.',
    },
    {
        memorization_align: 'Algorithms (coef 3), piano (coef 2). LA + OChem maintenance.',
        focus_drop: 'Music sessions ate into algorithm review — pushed both into the evening, both suffered.',
        mechanical_fix: 'Hard split: algo morning, piano evening. No swap.',
        retention: 'Trees & graphs — DFS vs BFS choice rules still hesitant.',
    },
    {
        memorization_align: 'Cardio anatomy push (coef 3). All other subjects coef 1.',
        focus_drop: 'Friday session = 0 — went out for a friend\'s birthday. Was the right call.',
        mechanical_fix: 'Plan around known social events at Sunday review, not after.',
        retention: 'Pathologies — re-read MI/ischemia section and quiz from blank.',
    },
];

export async function seedMetacognitionLogs(): Promise<number> {
    const db = await getDb();
    // Purge any prior seed metacognition logs before reseeding
    await db.execute(`DELETE FROM metacognition_logs WHERE id LIKE $1`, [`${SEED_PREFIX}%`]);

    const seedSubjects = await db.select<{ id: string }[]>(
        `SELECT id FROM subjects WHERE id LIKE $1`,
        [`${SEED_PREFIX}%`],
    );
    const subjectIds = seedSubjects.map(s => s.id);

    // 4 entries per month for the last 3 months = 12 entries
    let inserted = 0;
    for (let monthBack = 0; monthBack < 3; monthBack++) {
        for (let week = 0; week < 4; week++) {
            const fx = META_FIXTURES[(monthBack * 4 + week) % META_FIXTURES.length];
            const d = new Date();
            d.setMonth(d.getMonth() - monthBack);
            d.setDate(7 + week * 7);
            d.setHours(20, 30, 0, 0);

            const id = `${SEED_PREFIX}meta-${monthBack}-${week}`;
            const prioritySubjectIds = subjectIds.length > 0
                ? subjectIds.slice(0, Math.min(3, subjectIds.length)).join(',')
                : null;
            const freeTimeHours = 12 + (week % 3) * 2;

            await db.execute(
                `INSERT INTO metacognition_logs (id,created_at,retention,focus_drop,memorization_align,mechanical_fix,free_time_hours,priority_subject_ids)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
                [id, d.toISOString(), fx.retention, fx.focus_drop, fx.memorization_align, fx.mechanical_fix, freeTimeHours, prioritySubjectIds],
            );
            inserted++;
        }
    }
    return inserted;
}

export async function seedAll(): Promise<SeedSummary> {
    const { subjects, chapters } = await seedSubjectsAndChapters();
    const sessions = await seedSessions();
    const metacognitionLogs = await seedMetacognitionLogs();
    return { subjects, chapters, sessions, metacognitionLogs };
}

// ── Cleanup ─────────────────────────────────────────────────────────────────

async function clearSeedSubjects(): Promise<void> {
    const db = await getDb();
    await db.execute(`DELETE FROM subject_tags WHERE subject_id LIKE $1`, [`${SEED_PREFIX}%`]);
    // Drop any leftover links that point at a tag we created (in case a tag
    // was attached to a non-seed subject — shouldn't happen, but stay safe).
    await db.execute(`DELETE FROM subject_tags WHERE tag_id LIKE $1`, [`${SEED_PREFIX}tag-%`]);
    await db.execute(`DELETE FROM tags WHERE id LIKE $1`, [`${SEED_PREFIX}tag-%`]);
    await db.execute(`DELETE FROM subjects WHERE id LIKE $1`, [`${SEED_PREFIX}%`]);
    const remaining = loadSeedChapters().filter(c => !c.subjectId.startsWith(SEED_PREFIX));
    saveSeedChapters(remaining);
}

export async function clearSeedData(): Promise<void> {
    const db = await getDb();
    await db.execute(`DELETE FROM session_blocks WHERE session_id LIKE $1`, [`${SEED_PREFIX}%`]);
    await db.execute(`DELETE FROM sessions WHERE id LIKE $1`, [`${SEED_PREFIX}%`]);
    await db.execute(`DELETE FROM metacognition_logs WHERE id LIKE $1`, [`${SEED_PREFIX}%`]);
    await clearSeedSubjects();
}
