import { useCallback, useEffect, useRef, useState } from 'react';

export const isSpeechSynthesisSupported =
  typeof window !== 'undefined' && 'speechSynthesis' in window;

/**
 * Wraps speechSynthesis for queued playback of text chunks with
 * pause/resume/stop. One utterance per chunk.
 */
export function useSpeechSynthesis() {
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  // Utterances must be referenced until they finish — Chrome garbage-collects
  // them mid-speech otherwise and onend never fires.
  const utterancesRef = useRef([]);

  const stop = useCallback(() => {
    utterancesRef.current = [];
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setPaused(false);
  }, []);

  const speak = useCallback(
    (chunks, lang) => {
      if (!isSpeechSynthesisSupported || chunks.length === 0) return;
      stop();

      const utterances = chunks.map((text) => {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang;
        return u;
      });
      const last = utterances[utterances.length - 1];
      last.onend = () => {
        setSpeaking(false);
        setPaused(false);
        utterancesRef.current = [];
      };
      for (const u of utterances) {
        u.onerror = () => {
          setSpeaking(false);
          setPaused(false);
          utterancesRef.current = [];
        };
      }

      utterancesRef.current = utterances;
      setSpeaking(true);
      setPaused(false);
      for (const u of utterances) {
        window.speechSynthesis.speak(u);
      }
    },
    [stop]
  );

  const pause = useCallback(() => {
    window.speechSynthesis.pause();
    setPaused(true);
  }, []);

  const resume = useCallback(() => {
    window.speechSynthesis.resume();
    setPaused(false);
  }, []);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  return { isSupported: isSpeechSynthesisSupported, speaking, paused, speak, pause, resume, stop };
}
