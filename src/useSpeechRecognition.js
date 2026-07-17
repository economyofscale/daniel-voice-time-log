import { useCallback, useEffect, useRef, useState } from 'react';

const SpeechRecognitionImpl =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : undefined;

export const isSpeechRecognitionSupported = Boolean(SpeechRecognitionImpl);

/**
 * Wraps the Web Speech API. Returns the accumulated final transcript plus the
 * current interim (still-being-recognized) chunk so the UI can show live text.
 */
export function useSpeechRecognition({ lang = 'en-US' } = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  // Chrome fires `onend` on its own after a stretch of silence; this flag lets
  // us tell that apart from the user pressing stop, so we can auto-restart.
  const shouldBeRecordingRef = useRef(false);

  const stop = useCallback(() => {
    shouldBeRecordingRef.current = false;
    recognitionRef.current?.stop();
    setIsRecording(false);
    setInterimTranscript('');
  }, []);

  const start = useCallback(() => {
    if (!SpeechRecognitionImpl || shouldBeRecordingRef.current) return;

    const recognition = new SpeechRecognitionImpl();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          setFinalTranscript((prev) =>
            (prev + ' ' + result[0].transcript).trim()
          );
        } else {
          interim += result[0].transcript;
        }
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      const messages = {
        'not-allowed':
          'Microphone access was denied. Allow mic access in the browser and try again.',
        'audio-capture': 'No microphone found. Check that one is connected.',
        network: 'Speech recognition needs a network connection in this browser.',
      };
      setError(messages[event.error] || `Speech recognition error: ${event.error}`);
      shouldBeRecordingRef.current = false;
      setIsRecording(false);
    };

    recognition.onend = () => {
      if (shouldBeRecordingRef.current) {
        // Ended on its own (silence timeout) — keep the session going.
        try {
          recognition.start();
        } catch {
          shouldBeRecordingRef.current = false;
          setIsRecording(false);
        }
      }
    };

    recognitionRef.current = recognition;
    shouldBeRecordingRef.current = true;
    setError(null);
    setFinalTranscript('');
    setInterimTranscript('');
    recognition.start();
    setIsRecording(true);
  }, [lang]);

  const reset = useCallback(() => {
    setFinalTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      shouldBeRecordingRef.current = false;
      recognitionRef.current?.stop();
    };
  }, []);

  return {
    isSupported: isSpeechRecognitionSupported,
    isRecording,
    finalTranscript,
    interimTranscript,
    error,
    start,
    stop,
    reset,
  };
}
