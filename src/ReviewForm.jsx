import { useState } from 'react';

/**
 * Editable review of the parsed fields before saving — the user can always
 * correct what Claude extracted.
 */
export default function ReviewForm({
  initialFields,
  initialDate,
  rawTranscript,
  onSave,
  onDiscard,
  saving,
}) {
  const [fields, setFields] = useState(initialFields);
  const [date, setDate] = useState(initialDate);

  const set = (name) => (e) =>
    setFields((f) => ({
      ...f,
      [name]: name === 'minutes' ? e.target.value : e.target.value,
    }));

  const handleSave = (e) => {
    e.preventDefault();
    onSave(
      {
        project: fields.project.trim(),
        task: fields.task.trim(),
        description: fields.description.trim(),
        minutes: Math.max(0, Math.round(Number(fields.minutes)) || 0),
      },
      date
    );
  };

  return (
    <form className="review-form" onSubmit={handleSave}>
      <h2>Review entry</h2>

      <label>
        Date
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>

      <label>
        Project
        <input type="text" value={fields.project} onChange={set('project')} />
      </label>

      <label>
        Task
        <input type="text" value={fields.task} onChange={set('task')} />
      </label>

      <label>
        Description
        <textarea rows={3} value={fields.description} onChange={set('description')} />
      </label>

      <label>
        Minutes
        <input
          type="number"
          min="0"
          step="1"
          value={fields.minutes}
          onChange={set('minutes')}
        />
      </label>

      <details className="raw-transcript">
        <summary>Original transcript</summary>
        <p>{rawTranscript}</p>
      </details>

      <div className="review-actions">
        <button type="submit" className="save-btn" disabled={saving}>
          {saving ? 'Saving…' : 'Save entry'}
        </button>
        <button type="button" className="discard-btn" onClick={onDiscard} disabled={saving}>
          Discard
        </button>
      </div>
    </form>
  );
}
