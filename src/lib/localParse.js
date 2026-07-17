/**
 * Heuristic fallback parser used when no Claude API key is available (or the
 * API call fails). Pulls a duration and project name out of the transcript
 * with regexes; the user corrects the rest in the review form.
 * Handles English and German phrasings.
 */

const WORD_HOURS = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4,
  eine: 1, einer: 1, ein: 1, zwei: 2, drei: 3, vier: 4,
};

// Common kinds of work, checked against the transcript when no explicit
// "task …" phrase is spoken. First match wins; multi-word phrases first.
// [pattern, label]
const TASK_KEYWORDS = [
  [/code[\s-]?review/, 'Code review'],
  [/bug[\s-]?fix(ing)?|fehlerbehebung/, 'Bug fix'],
  [/daily|stand[\s-]?up/, 'Standup'],
  [/meeting|besprechung|termin\b/, 'Meeting'],
  [/(telefon(at)?|phone|anruf)\b|\bcall\b/, 'Call'],
  [/e[\s-]?mails?\b/, 'E-mail'],
  [/dokumentation|documentation/, 'Documentation'],
  [/testing|testen|tests?\b/, 'Testing'],
  [/deployment|release/, 'Deployment'],
  [/refactoring/, 'Refactoring'],
  [/planung|planning/, 'Planning'],
  [/recherche|research/, 'Research'],
  [/design/, 'Design'],
  [/entwicklung|development|programmier|coding|implementier/, 'Development'],
  [/review/, 'Review'],
];

// Words that end an explicit "task …" phrase.
const TASK_STOPWORDS = new Set([
  'for', 'on', 'in', 'at', 'and', 'with', 'today',
  'für', 'an', 'am', 'im', 'in', 'und', 'mit', 'heute', 'projekt', 'project',
]);

function detectTask(transcript, lowered) {
  // Explicit: "task code review …" / "Aufgabe Besprechung …"
  const explicit = transcript.match(
    /\b(?:task|aufgabe)\s+((?:[\p{L}\d-]+\s*){1,4})/iu
  );
  if (explicit) {
    const words = [];
    for (const word of explicit[1].trim().split(/\s+/)) {
      const w = word.toLowerCase();
      // Stop at connectors, numbers, and duration words so "Aufgabe Doku 45
      // Minuten" yields just "Doku".
      if (
        TASK_STOPWORDS.has(w) ||
        w in WORD_HOURS ||
        /^\d/.test(w) ||
        /^(minute|minuten|min|stunde|stunden|hour|hours|halbe)/.test(w)
      ) {
        break;
      }
      words.push(word);
    }
    if (words.length > 0) {
      const label = words.join(' ');
      return label.charAt(0).toUpperCase() + label.slice(1);
    }
  }

  // Fallback: known work-type keywords anywhere in the sentence.
  for (const [pattern, label] of TASK_KEYWORDS) {
    if (pattern.test(lowered)) return label;
  }
  return '';
}

export function localParse(transcript) {
  const t = transcript.toLowerCase();
  let minutes = 0;

  if (/(hour and a half|eineinhalb|anderthalb)/.test(t)) {
    minutes = 90;
  } else if (/(half an hour|halbe[n]? stunde)/.test(t)) {
    minutes = 30;
  } else if (/(quarter of an hour|viertelstunde)/.test(t)) {
    minutes = 15;
  } else {
    const hr = t.match(/(\d+(?:[.,]\d+)?)\s*(?:hours?|stunden?)\b/);
    const min = t.match(/(\d+)\s*(?:minutes?|minuten|min)\b/);
    if (hr) minutes += Math.round(parseFloat(hr[1].replace(',', '.')) * 60);
    if (min) minutes += parseInt(min[1], 10);
    if (!hr && !min) {
      const wordHr = t.match(/\b(a|an|one|two|three|four|eine?r?|zwei|drei|vier)\s+(?:hours?|stunden?)\b/);
      if (wordHr) minutes = (WORD_HOURS[wordHr[1]] || 0) * 60;
    }
  }

  const proj = transcript.match(/\bproje[ck]t\s+([\p{L}\d-]+)/iu);
  const project = proj
    ? proj[1].charAt(0).toUpperCase() + proj[1].slice(1)
    : '';

  return {
    project,
    task: detectTask(transcript, t),
    description: transcript.trim(),
    minutes,
  };
}
