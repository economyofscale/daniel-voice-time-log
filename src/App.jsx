import { useEffect, useRef, useState } from 'react';
import { useSpeechRecognition } from './useSpeechRecognition.js';
import { parseTranscript, describeApiError } from './lib/parseEntry.js';
import { localParse } from './lib/localParse.js';
import { addEntry, todayLocal } from './lib/db.js';
import { exportCsv, exportJson } from './lib/exportLog.js';
import ReviewForm from './ReviewForm.jsx';
import DayView from './DayView.jsx';
import Calendar from './Calendar.jsx';

const KEY_STORAGE = 'voice-time-log:anthropic-key';

function getApiKey() {
  const key =
    import.meta.env.VITE_ANTHROPIC_API_KEY ||
    localStorage.getItem(KEY_STORAGE) ||
    '';
  // The scaffolded .env.local placeholder is not a real key.
  return key.includes('REPLACE-ME') ? '' : key;
}

// Missing logo files should disappear, not render as broken images.
function hideBrokenImage(e) {
  e.currentTarget.style.display = 'none';
}

export default function App() {
  const [lang, setLang] = useState('en-US');
  const {
    isSupported,
    isRecording,
    finalTranscript,
    interimTranscript,
    error: speechError,
    start,
    stop,
    reset,
  } = useSpeechRecognition({ lang });

  // 'idle' | 'parsing' | 'review' | 'saving'
  const [phase, setPhase] = useState('idle');
  const [parsedFields, setParsedFields] = useState(null);
  const [parseNote, setParseNote] = useState(null);
  const [pendingTranscript, setPendingTranscript] = useState('');
  const [apiError, setApiError] = useState(null);
  const [apiKey] = useState(getApiKey);
  const [savedToast, setSavedToast] = useState(null);
  const [dayRefresh, setDayRefresh] = useState(0);
  const [selectedDate, setSelectedDate] = useState(todayLocal);
  const wasRecordingRef = useRef(false);

  const hasTranscript = finalTranscript || interimTranscript;

  async function runParse(transcript) {
    setApiError(null);
    setPendingTranscript(transcript);

    if (!apiKey) {
      // No Claude available — heuristic local parse, user corrects in the form.
      setParsedFields(localParse(transcript));
      setParseNote(
        'Parsed locally without Claude (no API key) — please check the fields.'
      );
      setPhase('review');
      return;
    }

    setPhase('parsing');
    try {
      const fields = await parseTranscript(transcript, apiKey);
      setParseNote(null);
      setParsedFields(fields);
      setPhase('review');
    } catch (err) {
      // Claude failed — fall back to the local parser rather than blocking.
      setParsedFields(localParse(transcript));
      setParseNote(
        `Claude parsing failed (${describeApiError(err)}) — parsed locally instead.`
      );
      setPhase('review');
    }
  }

  // Spec: parse on stop. Detect the recording -> stopped transition.
  useEffect(() => {
    if (wasRecordingRef.current && !isRecording && finalTranscript.trim()) {
      runParse(finalTranscript.trim());
    }
    wasRecordingRef.current = isRecording;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  async function handleSave(fields, date) {
    setPhase('saving');
    try {
      const entry = await addEntry(fields, pendingTranscript, date);
      setSavedToast(
        `Saved to ${entry.date}: ${entry.project || 'No project'} — ${entry.minutes} min`
      );
      setTimeout(() => setSavedToast(null), 4000);
      setDayRefresh((n) => n + 1);
      // Show the day the entry was saved to.
      setSelectedDate(entry.date);
      handleDiscard();
    } catch (err) {
      setApiError(`Could not save entry: ${err.message}`);
      setPhase('review');
    }
  }

  function handleDiscard() {
    setParsedFields(null);
    setParseNote(null);
    setPendingTranscript('');
    setPhase('idle');
    reset();
  }

  async function handleExport(kind) {
    const n = kind === 'csv' ? await exportCsv() : await exportJson();
    setSavedToast(`Exported ${n} entries as ${kind.toUpperCase()}.`);
    setTimeout(() => setSavedToast(null), 4000);
  }

  if (!isSupported) {
    return (
      <main className="app">
        <header>
          <h1>Voice Time Log</h1>
        </header>
        <div className="notice notice-error">
          This browser doesn&apos;t support the Web Speech API. Please use
          Chrome or Edge — a manual entry form will be added as a fallback in a
          later phase.
        </div>
      </main>
    );
  }

  return (
    <>
      <div className="header-band">
        <div className="band-inner">
          <div className="logo-row">
            <span className="logo-chip">
              <img
                src="./logos/amco_logo.png"
                alt="AMCO"
                className="logo logo-amco"
                onError={hideBrokenImage}
              />
            </span>
            <span className="logo-chip">
              <img
                src="./logos/cpmpartners_logo.png"
                alt="CPM Partners"
                className="logo logo-cpm"
                onError={hideBrokenImage}
              />
            </span>
          </div>
        </div>
      </div>

    <main className="app">
      <header className="app-header">
        <div>
          <h1>Voice Time Log</h1>
          <p className="subtitle">
            Speak what you worked on — it becomes a structured time entry.
          </p>
        </div>
      </header>

      {speechError && <div className="notice notice-error">{speechError}</div>}
      {apiError && <div className="notice notice-error">{apiError}</div>}
      {savedToast && <div className="notice notice-success">{savedToast}</div>}

      <div className="layout">
        <div className="col-left">
          {phase === 'review' || phase === 'saving' ? (
            <>
              {parseNote && <div className="notice notice-info">{parseNote}</div>}
              <ReviewForm
                initialFields={parsedFields}
                initialDate={selectedDate}
                rawTranscript={pendingTranscript}
                onSave={handleSave}
                onDiscard={handleDiscard}
                saving={phase === 'saving'}
              />
            </>
          ) : (
            <>
              <div className="controls">
                <button
                  className={`record-btn ${isRecording ? 'recording' : ''}`}
                  onClick={isRecording ? stop : start}
                  disabled={phase === 'parsing'}
                >
                  <span className="record-dot" />
                  {isRecording ? 'Stop' : 'Record'}
                </button>

                <label className="lang-select">
                  Language
                  <select
                    value={lang}
                    onChange={(e) => setLang(e.target.value)}
                    disabled={isRecording}
                  >
                    <option value="en-US">English (US)</option>
                    <option value="en-GB">English (UK)</option>
                    <option value="de-DE">Deutsch</option>
                  </select>
                </label>

                {hasTranscript && !isRecording && phase === 'idle' && (
                  <>
                    <button
                      className="clear-btn"
                      onClick={() => runParse(finalTranscript.trim())}
                      disabled={!finalTranscript.trim()}
                    >
                      Parse again
                    </button>
                    <button className="clear-btn" onClick={reset}>
                      Clear
                    </button>
                  </>
                )}
              </div>

              {isRecording && <p className="status">Listening…</p>}
              {phase === 'parsing' && (
                <p className="status parsing">Extracting entry with Claude…</p>
              )}

              <section className="transcript" aria-live="polite">
                {hasTranscript ? (
                  <p>
                    {finalTranscript}
                    {interimTranscript && (
                      <span className="interim"> {interimTranscript}</span>
                    )}
                  </p>
                ) : (
                  <p className="placeholder">
                    {isRecording
                      ? 'Say something — words appear here as they are recognized.'
                      : 'Press Record and describe what you worked on, e.g. “Spent half an hour on code review for Project Apollo.” When you press Stop, the entry is parsed automatically.'}
                  </p>
                )}
              </section>

              {!apiKey && (
                <p className="key-hint">
                  No Anthropic API key set — entries are parsed with a simple
                  local parser (duration + project detection). Add a key later
                  in <code> .env.local</code> for smarter parsing; everything
                  else works without it.
                </p>
              )}

              <Calendar
                selectedDate={selectedDate}
                onSelect={setSelectedDate}
                refreshKey={dayRefresh}
              />
            </>
          )}
        </div>

        <div className="col-right">
          <DayView
            date={selectedDate}
            refreshKey={dayRefresh}
            onEntriesChanged={() => setDayRefresh((n) => n + 1)}
            lang={lang}
          />
        </div>
      </div>

      <footer className="app-footer">
        <button className="export-btn" onClick={() => handleExport('csv')}>
          Export CSV
        </button>
        <button className="export-btn" onClick={() => handleExport('json')}>
          Export JSON
        </button>
      </footer>
    </main>
    </>
  );
}
