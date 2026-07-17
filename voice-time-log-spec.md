# Voice Time Log — Build Spec

A local web app that lets you log work time by speaking. Say what you did, it
extracts structured fields; browse and review past days like a calendar, and
have any day read back to you.

## Core concept

- Press record, speak naturally about what you worked on.
- Speech is transcribed, then parsed into structured fields.
- Each spoken entry is saved under the day it was recorded.
- You can flip between days (calendar-style) to see all entries logged that day.
- Each day can be "read aloud" as a spoken summary.

## Data model

```
Entry {
  id: string (uuid)
  date: string (YYYY-MM-DD, local date the entry belongs to)
  timestamp: string (ISO, when it was recorded)
  project: string
  task: string
  description: string
  minutes: number
  rawTranscript: string   // keep the original speech-to-text for reference/debug
}
```

Multiple entries per day are expected and normal — this is not one-entry-per-day,
it's a running log.

## Feature breakdown

### 1. Voice capture → structured fields
- Use the Web Speech API (`SpeechRecognition`) for mic capture and transcription.
  Note: reliable in Chrome/Edge; Firefox/Safari support is inconsistent — detect
  and fall back to a manual-entry form if unsupported.
- On stop, send the transcript to the Claude API (model: `claude-sonnet-4-6`)
  with a system prompt instructing it to return **only JSON** matching:
  `{project, task, description, minutes}`. Have it convert spoken durations
  ("half an hour", "an hour and a half") into a plain minutes number.
- Show the parsed fields in an editable review form before saving — the user
  should always be able to correct a field before it's committed.
- On save, append the entry to that day's list (`date` = the day it was
  recorded, in the user's local timezone).

### 2. Calendar / day switcher
- A compact calendar view (month grid or simple prev/next day arrows — month
  grid is nicer for spotting which days have entries) where days with logged
  entries are visually marked (e.g. a dot or filled state), distinct from
  empty days.
- Selecting a day shows that day's entry list: project, task, description,
  minutes, time recorded, in chronological order.
- Show a per-day total (sum of minutes) and optionally a per-project subtotal
  within the day.
- Support editing/deleting individual entries from the day view.

### 3. Voice output (read a day back to you)
- A "Read day" / "Play summary" control on each day view.
- Use the Web Speech Synthesis API (`speechSynthesis`) to read the day's
  entries aloud — e.g. "You logged 4 entries today, 2 hours 15 minutes total.
  Project Apollo: code review, 30 minutes... " etc.
- Generate this summary text either with a simple template (fast, free, fully
  offline) or by asking Claude to phrase a natural-sounding summary from the
  day's entries (nicer phrasing, needs an API call). Recommend starting with
  the template approach since it's instant and works offline; the entries
  are already structured, so a template reads naturally.
- Include a stop/pause control once playback starts.

### 4. Persistence
- Since this runs as a real local app (not a sandboxed browser artifact),
  use a proper local store: IndexedDB (via a small wrapper, or a library like
  `idb`) or SQLite via a lightweight backend if you want the data to survive
  across devices/browsers later. Avoid plain `localStorage` for anything
  beyond a quick prototype — it doesn't scale well past a few hundred entries
  and has no query support for "give me all entries for date X."
- Export: a CSV/JSON export button for the full log or a date range.

## Suggested stack

- Frontend: React (Vite) or plain HTML/JS if you want to keep it minimal.
- Speech: native Web Speech API (`SpeechRecognition` + `speechSynthesis`) —
  no external dependency needed.
- Parsing: Claude API call (`claude-sonnet-4-6`) with a JSON-only system prompt.
- Storage: IndexedDB (`idb` npm package recommended for a clean async API).
- Calendar UI: hand-rolled month grid is simple enough not to need a library
  for this scope.

## Suggested build order (good phases for Claude Code)

1. Scaffold the app + basic record button + live transcript display (no
   parsing yet — just prove mic capture works).
2. Add the Claude API parsing step + editable review form + save-to-IndexedDB.
3. Build the day view (list of today's entries + running total).
4. Build the calendar/month grid + day switching, wired to IndexedDB queries
   by date.
5. Add "Read day" voice output.
6. Polish: CSV export, delete/edit entries, empty states, mobile layout.

## Open questions to settle before/while building

- Local-only (single browser/device) vs. wanting the log to sync across
  devices — decides whether IndexedDB alone is enough or you want a small
  backend.
- Whether the day a voice entry belongs to should always be "today" (the day
  it was recorded) or whether you sometimes want to log time against a past
  day (e.g. logging Monday's work on Tuesday) — if the latter, add a
  day-picker to the entry review form, not just automatic "today."
