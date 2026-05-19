/**
 * CSV export utility.
 *
 * Excel, SPSS, ба Python pandas хаана ч ажиллаж чадахуйц UTF-8 BOM-той CSV.
 * Mongolian Cyrillic-ийг Excel зөв уншихын тулд BOM хэрэгтэй — энэ бол
 * Office-ийн ховор гэхдээ найдвартай тохируулга.
 */

import type { ParticipantRow } from './queries';

const COLUMNS: { key: keyof ParticipantRow; label: string }[] = [
  { key: 'short_id',         label: 'ID' },
  { key: 'grade',            label: 'Анги' },
  { key: 'knowledge_level',  label: 'Түвшин' },
  { key: 'created_at',       label: 'Эхэлсэн цаг' },
  { key: 'completed',        label: 'Дууссан эсэх' },
  { key: 'quiz_score',       label: 'Quiz оноо' },
  { key: 'sus_score',        label: 'SUS оноо' },
  { key: 'lab_time_ms',      label: 'Лаб дахь хугацаа (мс)' },
];

export function downloadParticipantsCsv(rows: ParticipantRow[]): void {
  const header = COLUMNS.map((c) => csvEscape(c.label)).join(',');
  const body = rows
    .map((row) =>
      COLUMNS.map((c) => csvEscape(formatCell(row[c.key]))).join(','),
    )
    .join('\n');

  const csv = `${header}\n${body}`;
  // BOM ensures Excel reads UTF-8 (especially for Cyrillic) without garbling
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mazy-participants-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvEscape(value: string): string {
  // RFC 4180: wrap in quotes if contains comma, quote, or newline; escape quotes by doubling them
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'Тийм' : 'Үгүй';
  if (typeof v === 'number') return String(v);
  return String(v);
}
