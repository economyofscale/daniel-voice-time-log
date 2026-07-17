/**
 * Builds the spoken summary for a day as a list of short chunks.
 * Chunked because desktop Chrome can cut off long single utterances;
 * one utterance per chunk also makes pause/stop responsive.
 */

function formatDurationWords(minutes, german) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const parts = [];
  if (german) {
    if (h === 1) parts.push('eine Stunde');
    else if (h > 1) parts.push(`${h} Stunden`);
    if (m === 1) parts.push('eine Minute');
    else if (m > 0) parts.push(`${m} Minuten`);
    if (parts.length === 0) return 'null Minuten';
    return parts.join(' und ');
  }
  if (h === 1) parts.push('one hour');
  else if (h > 1) parts.push(`${h} hours`);
  if (m === 1) parts.push('one minute');
  else if (m > 0) parts.push(`${m} minutes`);
  if (parts.length === 0) return 'zero minutes';
  return parts.join(' and ');
}

export function buildDaySummary(entries, lang) {
  const german = lang.startsWith('de');
  if (entries.length === 0) {
    return [german ? 'Keine Einträge an diesem Tag.' : 'No entries on this day.'];
  }

  const total = entries.reduce((sum, e) => sum + e.minutes, 0);
  const chunks = [];

  if (german) {
    chunks.push(
      `Du hast ${entries.length === 1 ? 'einen Eintrag' : `${entries.length} Einträge`} erfasst, ` +
        `insgesamt ${formatDurationWords(total, true)}.`
    );
  } else {
    chunks.push(
      `You logged ${entries.length === 1 ? 'one entry' : `${entries.length} entries`}, ` +
        `${formatDurationWords(total, false)} in total.`
    );
  }

  for (const entry of entries) {
    const project = entry.project || (german ? 'Ohne Projekt' : 'No project');
    const parts = [project];
    if (entry.task) parts.push(entry.task);
    let chunk = `${parts.join(', ')}: ${formatDurationWords(entry.minutes, german)}.`;
    if (entry.description) chunk += ` ${entry.description}`;
    chunks.push(chunk);
  }

  return chunks;
}
