import { useCallback, useEffect, useRef, useState } from 'react';
import { pipeline, env } from '@xenova/transformers';

// Models come from the HuggingFace hub (cached locally after first download).
env.allowLocalModels = false;
if (typeof caches === 'undefined') {
  // No Cache API in this context — transformers.js must not assume it.
  env.useBrowserCache = false;
}

// Multilingual base model (English + German). whisper-small would be more
// accurate but a considerably larger download.
const MODEL_ID = 'Xenova/whisper-base';

export const isRecordingSupported =
  typeof navigator !== 'undefined' &&
  !!navigator.mediaDevices?.getUserMedia &&
  typeof window !== 'undefined' &&
  'MediaRecorder' in window;

// Singleton pipeline shared across renders; the progress handler is swapped
// in by whichever hook instance is mounted.
let transcriberPromise = null;
let progressHandler = null;

function getTranscriber() {
  if (!transcriberPromise) {
    transcriberPromise = pipeline('automatic-speech-recognition', MODEL_ID, {
      progress_callback: (p) => progressHandler?.(p),
    });
  }
  return transcriberPromise;
}

/** Decode a recorded blob to mono Float32 PCM at Whisper's 16 kHz. */
async function blobToAudio(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const ctx = new AudioContext({ sampleRate: 16000 });
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    if (audioBuffer.numberOfChannels > 1) {
      const ch0 = audioBuffer.getChannelData(0);
      const ch1 = audioBuffer.getChannelData(1);
      const mono = new Float32Array(ch0.length);
      for (let i = 0; i < ch0.length; i++) {
        mono[i] = (ch0[i] + ch1[i]) / 2;
      }
      return mono;
    }
    return audioBuffer.getChannelData(0);
  } finally {
    ctx.close();
  }
}

/**
 * Records mic audio with MediaRecorder and transcribes it with Whisper
 * (transformers.js, WASM — fully local, works inside Electron).
 */
export function useWhisper({ lang = 'en-US' } = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const [modelReady, setModelReady] = useState(false);
  // {file, progress} while the model downloads on first launch.
  const [modelProgress, setModelProgress] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const langRef = useRef(lang);
  langRef.current = lang;

  // Kick off the model download/load at launch so the first recording
  // doesn't pay the wait.
  useEffect(() => {
    progressHandler = (p) => {
      if (p.status === 'progress' && p.file?.endsWith('.onnx')) {
        setModelProgress({ file: p.file, progress: p.progress ?? 0 });
      }
    };
    getTranscriber()
      .then(() => {
        setModelReady(true);
        setModelProgress(null);
      })
      .catch((err) => {
        setError(
          `Could not load the speech model (internet is required for the first download): ${err.message}`
        );
      });
    return () => {
      progressHandler = null;
    };
  }, []);

  const transcribe = useCallback(async (blob) => {
    setIsTranscribing(true);
    setError(null);
    try {
      const audio = await blobToAudio(blob);
      const transcriber = await getTranscriber();
      const language = langRef.current.startsWith('de') ? 'german' : 'english';
      const result = await transcriber(audio, {
        language,
        task: 'transcribe',
        chunk_length_s: 30,
        stride_length_s: 5,
      });
      const text = (result.text || '').trim();
      if (!text) {
        setError('Nothing was transcribed — try recording again, a bit louder.');
      } else {
        setTranscript(text);
      }
    } catch (err) {
      setError(`Transcription failed: ${err.message}`);
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setTranscript('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        chunksRef.current = [];
        if (blob.size > 0) transcribe(blob);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      setError(
        err.name === 'NotAllowedError'
          ? 'Microphone access was denied. Allow mic access and try again.'
          : err.name === 'NotFoundError'
            ? 'No microphone found. Check that one is connected.'
            : `Could not start recording: ${err.message}`
      );
    }
  }, [transcribe]);

  const stop = useCallback(() => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stream
        ?.getTracks()
        .forEach((t) => t.stop());
      mediaRecorderRef.current?.stop?.();
    };
  }, []);

  return {
    isSupported: isRecordingSupported,
    isRecording,
    isTranscribing,
    transcript,
    error,
    modelReady,
    modelProgress,
    start,
    stop,
    reset,
  };
}
