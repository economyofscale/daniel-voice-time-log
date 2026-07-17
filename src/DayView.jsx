import { useEffect, useState } from 'react';
import {
  getEntriesByDate,
  getMinutesBetween,
  deleteEntry,
  updateEntry,
  todayLocal,
} from './lib/db.js';
import { buildDaySummary } from './lib/daySummary.js';
import { useSpeechSynthesis } from './useSpeechSynthesis.js';
import ProgressRing from './ProgressRing.jsx';

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTotal(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return `${h} h ${m} min`;
}

/** 90 -> "01:30" */
function formatHM(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Nearest 15-minute step: 40 -> 45, 35 -> 30. */
function roundToQuarter(minutes) {
  return Math.round(minutes / 15) * 15;
}

const WEEKLY_TARGET_MINUTES = 40 * 60;

/** Monday and Sunday (YYYY-MM-DD) of the week containing the given date. */
function weekBounds(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  const dayIndex = (d.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(d);
  monday.setDate(d.getDate() - dayIndex);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return [todayLocal(monday), todayLocal(sunday)];
}

function dayTitle(date) {
  if (date === todayLocal()) return 'Today';
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/** Inline editor rendered inside a table row. */
function EntryEditor({ entry, onSave, onCancel }) {
  const [fields, setFields] = useState({
    project: entry.project,
    task: entry.task,
    description: entry.description,
    minutes: entry.minutes,
  });

  const set = (name) => (e) =>
    setFields((f) => ({ ...f, [name]: e.target.value }));

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      ...entry,
      project: String(fields.project).trim(),
      task: String(fields.task).trim(),
      description: String(fields.description).trim(),
      minutes: Math.max(0, Math.round(Number(fields.minutes)) || 0),
    });
  }

  return (
    <form className="entry-editor" onSubmit={handleSubmit}>
      <div className="entry-editor-row">
        <input
          type="text"
          placeholder="Project"
          value={fields.project}
          onChange={set('project')}
        />
        <input
          type="text"
          placeholder="Task"
          value={fields.task}
          onChange={set('task')}
        />
        <input
          type="number"
          min="0"
          step="1"
          className="entry-editor-minutes"
          value={fields.minutes}
          onChange={set('minutes')}
        />
      </div>
      <textarea
        rows={2}
        placeholder="Description"
        value={fields.description}
        onChange={set('description')}
      />
      <div className="entry-editor-actions">
        <button type="submit" className="save-btn small">
          Save
        </button>
        <button type="button" className="discard-btn small" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

/** Selected day's log: progress ring, read-aloud controls, and the entry table. */
export default function DayView({ date, refreshKey, onEntriesChanged, lang = 'en-US' }) {
  const [entries, setEntries] = useState([]);
  const [weeklyMinutes, setWeeklyMinutes] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const { isSupported: canSpeak, speaking, paused, speak, pause, resume, stop } =
    useSpeechSynthesis();

  useEffect(() => {
    let cancelled = false;
    getEntriesByDate(date).then((rows) => {
      if (!cancelled) setEntries(rows);
    });
    const [monday, sunday] = weekBounds(date);
    getMinutesBetween(monday, sunday).then((minutes) => {
      if (!cancelled) setWeeklyMinutes(minutes);
    });
    return () => {
      cancelled = true;
    };
  }, [date, refreshKey]);

  // Don't keep reading yesterday's summary after switching days.
  useEffect(() => {
    stop();
  }, [date, stop]);

  function handleReadDay() {
    speak(buildDaySummary(entries, lang), lang);
  }

  async function handleDelete(id) {
    await deleteEntry(id);
    setEntries((rows) => rows.filter((e) => e.id !== id));
    onEntriesChanged?.();
  }

  async function handleUpdate(updated) {
    await updateEntry(updated);
    setEntries((rows) => rows.map((e) => (e.id === updated.id ? updated : e)));
    setEditingId(null);
    onEntriesChanged?.();
  }

  const total = entries.reduce((sum, e) => sum + e.minutes, 0);
  // Totals column sums the per-entry rounded values (like a billing sheet),
  // not the rounded exact total — the two can differ.
  const roundedTotal = entries.reduce(
    (sum, e) => sum + roundToQuarter(e.minutes),
    0
  );

  const byProject = new Map();
  for (const e of entries) {
    const key = e.project || 'No project';
    byProject.set(key, (byProject.get(key) || 0) + e.minutes);
  }

  const totalRow = (
    <tr className="total-row">
      <td colSpan={4}>Total</td>
      <td className="num">{total}</td>
      <td className="num">{formatHM(total)}</td>
      <td className="num">{formatHM(roundedTotal)}</td>
      <td />
    </tr>
  );

  return (
    <section className="day-view">
      <div className="day-summary">
        <ProgressRing minutes={total} caption="Daily" />
        <ProgressRing
          minutes={weeklyMinutes}
          targetMinutes={WEEKLY_TARGET_MINUTES}
          variant="ring-weekly"
          caption="Weekly"
        />
        <div className="day-summary-info">
          <h2>{dayTitle(date)}</h2>
          <div className="day-view-tools">
            {canSpeak && entries.length > 0 && !speaking && (
              <button className="speak-btn" onClick={handleReadDay}>
                🔊 Read day
              </button>
            )}
            {speaking && (
              <>
                <button className="speak-btn" onClick={paused ? resume : pause}>
                  {paused ? '▶ Resume' : '⏸ Pause'}
                </button>
                <button className="speak-btn" onClick={stop}>
                  ⏹ Stop
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {byProject.size > 1 && (
        <p className="project-subtotals">
          {[...byProject.entries()].map(([project, minutes]) => (
            <span key={project} className="project-subtotal">
              {project}: {formatTotal(minutes)}
            </span>
          ))}
        </p>
      )}

      {entries.length === 0 ? (
        <p className="placeholder">No entries on this day.</p>
      ) : (
        <div className="table-wrap">
          <table className="log-table">
            <thead>
              {totalRow}
              <tr className="col-head">
                <th>Timestamp</th>
                <th>Project</th>
                <th>Task</th>
                <th>Description</th>
                <th className="num">Minutes</th>
                <th className="num">hh:mm</th>
                <th className="num">Rounded</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) =>
                editingId === entry.id ? (
                  <tr key={entry.id} className="editing-row">
                    <td colSpan={8}>
                      <EntryEditor
                        entry={entry}
                        onSave={handleUpdate}
                        onCancel={() => setEditingId(null)}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={entry.id}>
                    <td className="cell-time">{formatTime(entry.timestamp)}</td>
                    <td className="cell-project">{entry.project || '—'}</td>
                    <td>{entry.task || '—'}</td>
                    <td className="cell-desc">{entry.description}</td>
                    <td className="num">{entry.minutes}</td>
                    <td className="num">{formatHM(entry.minutes)}</td>
                    <td className="num">{formatHM(roundToQuarter(entry.minutes))}</td>
                    <td className="cell-actions">
                      <button
                        className="entry-action"
                        title="Edit entry"
                        onClick={() => setEditingId(entry.id)}
                      >
                        ✎
                      </button>
                      <button
                        className="entry-action entry-action-delete"
                        title="Delete entry"
                        onClick={() => handleDelete(entry.id)}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
            <tfoot>{totalRow}</tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
