import { getAllEntries } from './db.js';

const CSV_COLUMNS = [
  'date',
  'timestamp',
  'project',
  'task',
  'description',
  'minutes',
  'rawTranscript',
];

function csvField(value) {
  const s = String(value ?? '');
  if (/[",\n;]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(entries) {
  const lines = [CSV_COLUMNS.join(',')];
  for (const entry of entries) {
    lines.push(CSV_COLUMNS.map((col) => csvField(entry[col])).join(','));
  }
  // ﻿ BOM so Excel opens the file as UTF-8 (umlauts survive).
  return '﻿' + lines.join('\r\n');
}

function download(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

export async function exportCsv() {
  const entries = await getAllEntries();
  download(
    `voice-time-log-${stamp()}.csv`,
    toCsv(entries),
    'text/csv;charset=utf-8'
  );
  return entries.length;
}

export async function exportJson() {
  const entries = await getAllEntries();
  download(
    `voice-time-log-${stamp()}.json`,
    JSON.stringify(entries, null, 2),
    'application/json'
  );
  return entries.length;
}
