import { useState } from 'react';
import { useSpeechRecognition } from './useSpeechRecognition.js';

export default function App() {
  const [lang, setLang] = useState('en-US');
  const {
    isSupported,
    isRecording,
    finalTranscript,
    interimTranscript,
    error,
    start,
    stop,
    reset,
  } = useSpeechRecognition({ lang });

  const hasTranscript = finalTranscript || interimTranscript;

  return (
    <main className="app">
      <header>
        <h1>Voice Time Log</h1>
        <p className="subtitle">Speak what you worked on. Live transcript below.</p>
      </header>

      {!isSupported ? (
        <div className="notice notice-error">
          This browser doesn&apos;t support the Web Speech API. Please use
          Chrome or Edge — a manual entry form will be added as a fallback in a
          later phase.
        </div>
      ) : (
        <>
          <div className="controls">
            <button
              className={`record-btn ${isRecording ? 'recording' : ''}`}
              onClick={isRecording ? stop : start}
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

            {hasTranscript && !isRecording && (
              <button className="clear-btn" onClick={reset}>
                Clear
              </button>
            )}
          </div>

          {isRecording && <p className="status">Listening…</p>}

          {error && <div className="notice notice-error">{error}</div>}

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
                  : 'Press Record and describe what you worked on, e.g. “Spent half an hour on code review for Project Apollo.”'}
              </p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
