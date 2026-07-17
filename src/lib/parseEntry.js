import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `You convert spoken work-log transcripts into structured time entries.
Respond with ONLY a JSON object — no markdown fences, no commentary — matching exactly:
{"project": string, "task": string, "description": string, "minutes": number}

Rules:
- "project": the project name mentioned in the transcript; empty string if none was mentioned.
- "task": a short label for the kind of work (e.g. "code review", "meeting", "bug fix"); empty string if unclear.
- "description": one concise sentence describing what was done, written in the same language as the transcript.
- "minutes": the duration as a plain number of minutes. Convert spoken durations: "half an hour" -> 30, "an hour and a half" -> 90, "eine halbe Stunde" -> 30, "eineinhalb Stunden" -> 90. Use 0 if no duration was mentioned.

The transcript may be in English or German. Speech-to-text may contain recognition errors — infer the intended meaning.`;

/**
 * Sends a transcript to Claude and returns {project, task, description, minutes}.
 * Runs directly from the browser — fine for a local single-user app.
 */
export async function parseTranscript(transcript, apiKey) {
  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: transcript }],
  });

  const text =
    response.content.find((block) => block.type === 'text')?.text ?? '';
  // Tolerate the model occasionally wrapping output in code fences despite the prompt.
  const jsonText = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`Claude returned unparseable output: ${text.slice(0, 200)}`);
  }

  return {
    project: String(parsed.project ?? ''),
    task: String(parsed.task ?? ''),
    description: String(parsed.description ?? ''),
    minutes: Math.max(0, Math.round(Number(parsed.minutes)) || 0),
  };
}

/** Maps SDK errors to messages the UI can show directly. */
export function describeApiError(error) {
  if (error instanceof Anthropic.AuthenticationError) {
    return 'Invalid API key. Check the key and try again.';
  }
  if (error instanceof Anthropic.RateLimitError) {
    return 'Rate limited by the Claude API — wait a moment and retry.';
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return 'Could not reach the Claude API. Check your internet connection.';
  }
  if (error instanceof Anthropic.APIError) {
    return `Claude API error (${error.status}): ${error.message}`;
  }
  return error?.message || 'Unknown error while parsing the transcript.';
}
