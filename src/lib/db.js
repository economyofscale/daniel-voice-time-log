import { openDB } from 'idb';

const DB_NAME = 'voice-time-log';
const STORE = 'entries';

const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db) {
    const store = db.createObjectStore(STORE, { keyPath: 'id' });
    store.createIndex('by-date', 'date');
  },
});

/** Local date as YYYY-MM-DD (not UTC — entries belong to the user's local day). */
export function todayLocal(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Saves a parsed entry. `fields` = {project, task, description, minutes}.
 * `date` is the YYYY-MM-DD day the entry belongs to (defaults to today);
 * `timestamp` always records when it was actually saved.
 * Returns the stored Entry.
 */
export async function addEntry(fields, rawTranscript, date) {
  const now = new Date();
  const entry = {
    id: crypto.randomUUID(),
    date: date || todayLocal(now),
    timestamp: now.toISOString(),
    project: fields.project,
    task: fields.task,
    description: fields.description,
    minutes: fields.minutes,
    rawTranscript,
  };
  const db = await dbPromise;
  await db.add(STORE, entry);
  return entry;
}

/** All entries for a YYYY-MM-DD date, oldest first. */
export async function getEntriesByDate(date) {
  const db = await dbPromise;
  const entries = await db.getAllFromIndex(STORE, 'by-date', date);
  return entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export async function deleteEntry(id) {
  const db = await dbPromise;
  await db.delete(STORE, id);
}

/** Overwrites an existing entry (matched by entry.id). */
export async function updateEntry(entry) {
  const db = await dbPromise;
  await db.put(STORE, entry);
  return entry;
}

/** Every entry in the log, ordered by date then time. */
export async function getAllEntries() {
  const db = await dbPromise;
  const entries = await db.getAll(STORE);
  return entries.sort(
    (a, b) =>
      a.date.localeCompare(b.date) || a.timestamp.localeCompare(b.timestamp)
  );
}

/** Total minutes logged between two YYYY-MM-DD dates (inclusive). */
export async function getMinutesBetween(startDate, endDate) {
  const db = await dbPromise;
  const entries = await db.getAllFromIndex(
    STORE,
    'by-date',
    IDBKeyRange.bound(startDate, endDate)
  );
  return entries.reduce((sum, e) => sum + e.minutes, 0);
}

/** Set of YYYY-MM-DD dates that have at least one entry in the given month ('YYYY-MM'). */
export async function getDatesWithEntries(yearMonth) {
  const db = await dbPromise;
  const range = IDBKeyRange.bound(`${yearMonth}-00`, `${yearMonth}-99`);
  const entries = await db.getAllFromIndex(STORE, 'by-date', range);
  return new Set(entries.map((e) => e.date));
}
