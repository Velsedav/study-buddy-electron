// Electron adapter — replaces Tauri SQL/FS with IPC calls
import { DEFAULT_QUOTES } from "./defaultQuotes";

const fsAPI = () => (window as any).electronAPI.fs
const dbAPI = () => (window as any).electronAPI.db

// ── DB adapter ────────────────────────────────────────────────────────────────

export async function getBingoDb() {
  return {
    execute: (sql: string, params?: unknown[]) =>
      dbAPI().execute('bingo', sql, params ?? []) as Promise<{ lastInsertRowid: number; changes: number }>,
    select: <T>(sql: string, params?: unknown[]) =>
      dbAPI().select<T>('bingo', sql, params ?? []),
  }
}

export async function closeBingoDb() {
  // no-op — managed by main process
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type Objective = {
  id: string;
  title: string;
  goal_kind: "count" | "metric" | "amount" | "manual";
  goal_target: number | null;
  goal_unit: string | null;
  cover_data: string | null;
  current_value: number;
  created_at: number;
  updated_at: number;
  pin_bottom: number;
  frequency_days: number | null;
};

export type SlotRow = { slot_index: number; objective_id: string | null };

export type Subobjective = {
  id: string;
  objective_id: string;
  title: string;
  note: string | null;
  target_total: number | null;
  progress_current: number;
  unit: string | null;
  is_done: number;
  created_at: number;
  updated_at: number;
};

export type MediaItem = {
  id: string;
  subobjective_id: string;
  kind: "quote" | "image" | "link";
  data: string;
  created_at: number;
};

export type QuoteRow = {
  id: string;
  text: string;
  created_at: number;
};

// ── Init (seed default quotes + slots on first run) ───────────────────────────

let seeded = false
export async function seedBingoDefaults() {
  if (seeded) return
  seeded = true
  const db = await getBingoDb()

  const qCount = await db.select<{ c: number }[]>("SELECT COUNT(*) as c FROM bingo_quotes")
  if ((qCount?.[0]?.c ?? 0) === 0) {
    for (const text of DEFAULT_QUOTES) {
      await db.execute(`INSERT INTO bingo_quotes (id, text, created_at) VALUES (?, ?, ?)`, [
        crypto.randomUUID(), text, Date.now()
      ])
    }
  }

  const slotCount = await db.select<{ c: number }[]>("SELECT COUNT(*) as c FROM slots")
  if ((slotCount?.[0]?.c ?? 0) === 0) {
    for (let i = 0; i < 16; i++) {
      await db.execute("INSERT INTO slots (slot_index, objective_id) VALUES (?, NULL)", [i])
    }
  }
}

// ── Bingo year slots ──────────────────────────────────────────────────────────

export async function ensureYearSlots(year: number): Promise<void> {
  const db = await getBingoDb()
  const existing = await db.select<{ c: number }[]>(
    `SELECT COUNT(*) as c FROM bingo_year_slots WHERE year = ?`, [year]
  )
  if ((existing?.[0]?.c ?? 0) >= 16) return

  const total = await db.select<{ c: number }[]>(`SELECT COUNT(*) as c FROM bingo_year_slots`)
  if ((total?.[0]?.c ?? 0) === 0) {
    const legacySlots = await db.select<SlotRow[]>(`SELECT * FROM slots ORDER BY slot_index ASC`)
    for (const s of legacySlots) {
      await db.execute(
        `INSERT OR IGNORE INTO bingo_year_slots (slot_index, year, objective_id) VALUES (?, ?, ?)`,
        [s.slot_index, year, s.objective_id ?? null]
      )
    }
  }

  for (let i = 0; i < 16; i++) {
    await db.execute(
      `INSERT OR IGNORE INTO bingo_year_slots (slot_index, year, objective_id) VALUES (?, ?, NULL)`,
      [i, year]
    )
  }
}

export async function listBingoYears(): Promise<number[]> {
  const db = await getBingoDb()
  const rows = await db.select<{ year: number }[]>(
    `SELECT DISTINCT year FROM bingo_year_slots ORDER BY year ASC`
  )
  return rows.map((r) => r.year)
}

export async function listSlotsWithObjectives() {
  const db = await getBingoDb()
  return db.select<(SlotRow & Partial<Objective>)[]>(
    `SELECT s.slot_index, s.objective_id,
            o.id, o.title, o.goal_kind, o.goal_target, o.goal_unit, o.cover_data,
            o.current_value, o.created_at, o.updated_at, o.pin_bottom, o.frequency_days
     FROM slots s
     LEFT JOIN objectives o ON o.id = s.objective_id
     ORDER BY s.slot_index ASC`
  )
}

export async function createObjectiveAndAssignSlot(
  slotIndex: number,
  patch: Partial<Objective> & { title: string },
  year: number
) {
  const db = await getBingoDb()
  const id = crypto.randomUUID()
  const t = Date.now()
  const goal_kind = (patch.goal_kind ?? "count") as Objective["goal_kind"]
  const goal_target = patch.goal_target ?? null
  const goal_unit = patch.goal_unit ?? null
  const cover_data = patch.cover_data ?? null

  await db.execute(
    `INSERT INTO objectives
     (id, title, goal_kind, goal_target, goal_unit, cover_data, current_value, created_at, updated_at, pin_bottom, frequency_days)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 0, NULL)`,
    [id, patch.title, goal_kind, goal_target, goal_unit, cover_data, t, t]
  )
  await db.execute(
    `UPDATE bingo_year_slots SET objective_id = ? WHERE slot_index = ? AND year = ?`,
    [id, slotIndex, year]
  )
  return id
}

export async function updateObjective(id: string, patch: Partial<Objective>) {
  const db = await getBingoDb()
  const t = Date.now()
  const existing = await db.select<Objective[]>(`SELECT * FROM objectives WHERE id = ?`, [id])
  if (!existing[0]) return
  const merged: Objective = { ...existing[0], ...patch, updated_at: t }
  await db.execute(
    `UPDATE objectives
     SET title=?, goal_kind=?, goal_target=?, goal_unit=?, cover_data=?, current_value=?,
         pin_bottom=?, frequency_days=?, updated_at=?
     WHERE id=?`,
    [merged.title, merged.goal_kind, merged.goal_target, merged.goal_unit,
     merged.cover_data ?? null, merged.current_value, merged.pin_bottom ?? 0,
     merged.frequency_days ?? null, merged.updated_at, id]
  )
}

export async function getObjective(id: string) {
  const db = await getBingoDb()
  const rows = await db.select<Objective[]>(`SELECT * FROM objectives WHERE id = ?`, [id])
  return rows[0] ?? null
}

export async function listSubobjectives(objectiveId: string) {
  const db = await getBingoDb()
  return db.select<Subobjective[]>(
    `SELECT * FROM subobjectives WHERE objective_id = ? ORDER BY created_at ASC`,
    [objectiveId]
  )
}

export async function createSubobjective(
  objectiveId: string,
  title: string,
  unit?: string | null,
  targetTotal?: number | null
) {
  const db = await getBingoDb()
  const id = crypto.randomUUID()
  const t = Date.now()
  await db.execute(
    `INSERT INTO subobjectives
     (id, objective_id, title, note, target_total, progress_current, unit, is_done, created_at, updated_at)
     VALUES (?, ?, ?, NULL, ?, 0, ?, 0, ?, ?)`,
    [id, objectiveId, title, targetTotal ?? null, unit ?? null, t, t]
  )
  return id
}

export async function updateSubobjective(id: string, patch: Partial<Subobjective>) {
  const db = await getBingoDb()
  const t = Date.now()
  const rows = await db.select<Subobjective[]>(`SELECT * FROM subobjectives WHERE id = ?`, [id])
  if (!rows[0]) return
  const merged = { ...rows[0], ...patch, updated_at: t }
  await db.execute(
    `UPDATE subobjectives
     SET title=?, note=?, target_total=?, progress_current=?, unit=?, is_done=?, updated_at=?
     WHERE id=?`,
    [merged.title, merged.note ?? null, merged.target_total ?? null,
     merged.progress_current ?? 0, merged.unit ?? null, merged.is_done ?? 0, merged.updated_at, id]
  )
}

export async function deleteSubobjective(id: string) {
  const db = await getBingoDb()
  await db.execute(`DELETE FROM subobjectives WHERE id = ?`, [id])
}

export async function addTimeSession(subobjectiveId: string, startedAt: number, endedAt: number) {
  const db = await getBingoDb()
  const id = crypto.randomUUID()
  const duration = Math.max(0, endedAt - startedAt)
  await db.execute(
    `INSERT INTO time_sessions (id, subobjective_id, started_at, ended_at, duration_ms) VALUES (?, ?, ?, ?, ?)`,
    [id, subobjectiveId, startedAt, endedAt, duration]
  )
}

export async function getTimeStatsForObjective(objectiveId: string) {
  const db = await getBingoDb()
  const rows = await db.select<{ total_ms: number; last_end: number | null }[]>(
    `SELECT COALESCE(SUM(ts.duration_ms), 0) as total_ms, MAX(ts.ended_at) as last_end
     FROM subobjectives so
     LEFT JOIN time_sessions ts ON ts.subobjective_id = so.id
     WHERE so.objective_id = ?`,
    [objectiveId]
  )
  return rows[0] ?? { total_ms: 0, last_end: null }
}

export async function getTimeStatsForSubobjectives(subIds: string[]) {
  if (subIds.length === 0) return new Map<string, { total_ms: number; last_end: number | null }>()
  const db = await getBingoDb()
  const q = `SELECT subobjective_id, COALESCE(SUM(duration_ms),0) as total_ms, MAX(ended_at) as last_end
             FROM time_sessions
             WHERE subobjective_id IN (${subIds.map(() => "?").join(",")})
             GROUP BY subobjective_id`
  const rows = await db.select<{ subobjective_id: string; total_ms: number; last_end: number | null }[]>(q, subIds)
  const map = new Map<string, { total_ms: number; last_end: number | null }>()
  for (const r of rows) map.set(r.subobjective_id, { total_ms: r.total_ms, last_end: r.last_end })
  return map
}

export async function listMediaForSubobjectives(subIds: string[]) {
  if (subIds.length === 0) return []
  const db = await getBingoDb()
  const q = `SELECT * FROM media_items
             WHERE subobjective_id IN (${subIds.map(() => "?").join(",")})
             ORDER BY created_at ASC`
  return db.select<MediaItem[]>(q, subIds)
}

export async function addQuote(subobjectiveId: string, quoteText: string) {
  const db = await getBingoDb()
  const id = crypto.randomUUID()
  await db.execute(
    `INSERT INTO media_items (id, subobjective_id, kind, data, created_at) VALUES (?, ?, 'quote', ?, ?)`,
    [id, subobjectiveId, quoteText, Date.now()]
  )
}

export async function addImage(subobjectiveId: string, dataUrl: string) {
  const db = await getBingoDb()
  const id = crypto.randomUUID()
  await db.execute(
    `INSERT INTO media_items (id, subobjective_id, kind, data, created_at) VALUES (?, ?, 'image', ?, ?)`,
    [id, subobjectiveId, dataUrl, Date.now()]
  )
}

export async function addLink(subobjectiveId: string, url: string, label: string) {
  const db = await getBingoDb()
  const id = crypto.randomUUID()
  await db.execute(
    `INSERT INTO media_items (id, subobjective_id, kind, data, created_at) VALUES (?, ?, 'link', ?, ?)`,
    [id, subobjectiveId, JSON.stringify({ url, label }), Date.now()]
  )
}

export type DashboardRow = (SlotRow & Partial<Objective>) & {
  total_ms: number;
  last_end: number | null;
};

export async function listDashboardRows(year: number): Promise<DashboardRow[]> {
  const db = await getBingoDb()
  return db.select<DashboardRow[]>(`
    SELECT
      s.slot_index, s.objective_id,
      o.id, o.title, o.goal_kind, o.goal_target, o.goal_unit, o.cover_data,
      o.current_value, o.created_at, o.updated_at, o.pin_bottom, o.frequency_days,
      COALESCE(SUM(ts.duration_ms), 0) AS total_ms,
      MAX(ts.ended_at) AS last_end
    FROM bingo_year_slots s
    LEFT JOIN objectives o ON o.id = s.objective_id
    LEFT JOIN subobjectives so ON so.objective_id = o.id
    LEFT JOIN time_sessions ts ON ts.subobjective_id = so.id
    WHERE s.year = ?
    GROUP BY s.slot_index, s.objective_id, o.id, o.title, o.goal_kind, o.goal_target,
             o.goal_unit, o.cover_data, o.current_value, o.created_at, o.updated_at,
             o.pin_bottom, o.frequency_days
    ORDER BY s.slot_index ASC
  `, [year])
}

export async function addManualTimeDelta(subobjectiveId: string, deltaMs: number) {
  const db = await getBingoDb()
  const id = crypto.randomUUID()
  const t = Date.now()
  await db.execute(
    `INSERT INTO time_sessions (id, subobjective_id, started_at, ended_at, duration_ms) VALUES (?, ?, ?, ?, ?)`,
    [id, subobjectiveId, t, t, Math.trunc(deltaMs)]
  )
}

export async function setSubobjectiveTotalTime(subobjectiveId: string, desiredTotalMs: number) {
  const db = await getBingoDb()
  const rows = await db.select<{ total_ms: number }[]>(
    `SELECT COALESCE(SUM(duration_ms), 0) as total_ms FROM time_sessions WHERE subobjective_id = ?`,
    [subobjectiveId]
  )
  const current = rows?.[0]?.total_ms ?? 0
  const delta = Math.trunc(desiredTotalMs - current)
  if (delta !== 0) await addManualTimeDelta(subobjectiveId, delta)
}

export async function deleteMediaItem(mediaId: string) {
  const db = await getBingoDb()
  await db.execute(`DELETE FROM media_items WHERE id = ?`, [mediaId])
}

export async function listBingoQuotes() {
  const db = await getBingoDb()
  return db.select<QuoteRow[]>(`SELECT * FROM bingo_quotes ORDER BY created_at ASC`)
}

export async function addBingoQuote(text: string) {
  const db = await getBingoDb()
  const id = crypto.randomUUID()
  await db.execute(`INSERT INTO bingo_quotes (id, text, created_at) VALUES (?, ?, ?)`, [id, text, Date.now()])
  return id
}

export async function deleteBingoQuote(id: string) {
  const db = await getBingoDb()
  await db.execute(`DELETE FROM bingo_quotes WHERE id = ?`, [id])
}

export async function exportBingoBackupTo(filePath: string) {
  const db = await getBingoDb()
  // VACUUM INTO runs in main process via db:execute IPC
  const escaped = filePath.replace(/'/g, "''")
  await db.execute(`VACUUM INTO '${escaped}'`)
}

export async function deleteAllBingoData() {
  const db = await getBingoDb()
  await db.execute(`DELETE FROM objectives`)
  await db.execute(`DELETE FROM slots`)
  await db.execute(`DELETE FROM bingo_year_slots`)
  await db.execute(`DELETE FROM bingo_quotes`)
}

export async function importBingoBackupFrom(filePath: string) {
  const srcBytes = await fsAPI().readFile(filePath) as Uint8Array
  const userData = await fsAPI().getUserDataPath() as string
  const path = userData + '/bingo.db'
  await fsAPI().writeFile(path, srcBytes)
  // DB reloads automatically on next getBingoDb() call
  seeded = false
}

export type ObjectiveMediaSummary = {
  objectiveId: string
  links: Array<{ url: string; label: string }>
  lastImageDataUrl: string | null
}

export async function listDashboardMediaSummaries(
  objectiveIds: string[]
): Promise<ObjectiveMediaSummary[]> {
  if (objectiveIds.length === 0) return []
  const db = await getBingoDb()
  const rows = await db.select<{ objective_id: string; kind: string; data: string; created_at: number }[]>(
    `SELECT so.objective_id, mi.kind, mi.data, mi.created_at
     FROM subobjectives so
     JOIN media_items mi ON mi.subobjective_id = so.id
     WHERE so.objective_id IN (${objectiveIds.map(() => '?').join(',')})
     AND mi.kind IN ('link', 'image')
     ORDER BY mi.created_at ASC`,
    objectiveIds
  )

  const map = new Map<string, { links: Array<{ url: string; label: string }>; lastImageDataUrl: string | null }>()
  for (const id of objectiveIds) map.set(id, { links: [], lastImageDataUrl: null })

  for (const r of rows) {
    const entry = map.get(r.objective_id)
    if (!entry) continue
    if (r.kind === 'link') {
      const parsed = (() => { try { return JSON.parse(r.data) } catch { return { url: r.data, label: '' } } })()
      entry.links.push({ url: String(parsed.url ?? r.data), label: String(parsed.label ?? '') })
    } else {
      // images are ordered ASC so last one wins
      entry.lastImageDataUrl = r.data
    }
  }

  return objectiveIds.map(id => {
    const entry = map.get(id)!
    return { objectiveId: id, links: entry.links, lastImageDataUrl: entry.lastImageDataUrl }
  })
}
