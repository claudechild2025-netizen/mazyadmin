'use client';

import { useMemo, useState } from 'react';
import { Download, Trash2, Eye } from 'lucide-react';
import type { ParticipantRow } from '@/lib/queries';
import { downloadParticipantsCsv } from '@/lib/csv';
import { deleteUserAction } from '@/app/actions';
import { ParticipantDialog } from './ParticipantDialog';

/**
 * Participant table — нэг мөр = нэг оролцогч.
 *
 * Хүснэгтийг сонгож sort хийнэ. CSV export нь `lib/csv.ts`-аар Cyrillic-аа
 * хадгалсан UTF-8 BOM-той файл татна.
 *
 * "Дэлгэрэнгүй" нь `app/participant/[id]/page.tsx` руу очно.
 */
type Props = {
  rows: ParticipantRow[];
};

type SortKey = keyof ParticipantRow;

export function ParticipantTable({ rows }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [legacyFilter, setLegacyFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const filtered = useMemo(() => {
    if (legacyFilter === 'yes') return rows.filter((r) => r.has_legacy);
    if (legacyFilter === 'no') return rows.filter((r) => !r.has_legacy);
    return rows;
  }, [rows, legacyFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const visibleIds = sorted.map((r) => r.id);
  const allVisibleChecked = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const toggleAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleChecked) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`${selectedIds.size} хэрэглэгчийг устгах уу?`)) return;
    setBulkDeleting(true);
    const ids = Array.from(selectedIds);
    const errors: string[] = [];
    for (const id of ids) {
      try {
        await deleteUserAction(id);
      } catch (err: any) {
        errors.push(`${id}: ${err.message ?? String(err)}`);
      }
    }
    setBulkDeleting(false);
    if (errors.length > 0) {
      alert(`Зарим устгал амжилтгүй боллоо:\n${errors.join('\n')}`);
    }
    window.location.reload();
  };

  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center justify-between p-5 pb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Оролцогчид ({sorted.length}/{rows.length})
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Толгойг товшиж sort хийнэ. CSV-ийг Excel ба Python-руу шууд импортолж болно.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={bulkDelete}
              disabled={bulkDeleting}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              <Trash2 size={16} />
              {bulkDeleting ? 'Устгаж байна…' : `Устгах (${selectedIds.size})`}
            </button>
          )}
          <div className="flex rounded-lg ring-1 ring-slate-200 overflow-hidden text-xs font-medium">
            {(['all', 'yes', 'no'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setLegacyFilter(v)}
                className={`px-3 py-2 transition-colors ${
                  legacyFilter === v
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {v === 'all' ? 'Бүгд' : v === 'yes' ? '📖 Уламжлалт' : '🎯 Зөвхөн Mazy'}
              </button>
            ))}
          </div>
          <button
            onClick={() => downloadParticipantsCsv(sorted)}
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
          >
            <Download size={16} />
            CSV татах
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-3 py-3 w-10">
                <input
                  type="checkbox"
                  aria-label="Бүгдийг сонгох"
                  checked={allVisibleChecked}
                  onChange={toggleAllVisible}
                  className="h-4 w-4 cursor-pointer rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                />
              </th>
              <Th onClick={() => toggleSort('short_id')} active={sortKey === 'short_id'}>
                Нэр
              </Th>
              <Th onClick={() => toggleSort('grade')} active={sortKey === 'grade'}>
                Анги
              </Th>
              <Th onClick={() => toggleSort('knowledge_level')} active={sortKey === 'knowledge_level'}>
                Түвшин
              </Th>
              <Th onClick={() => toggleSort('created_at')} active={sortKey === 'created_at'}>
                Эхэлсэн
              </Th>
              <Th onClick={() => toggleSort('completed')} active={sortKey === 'completed'}>
                Дууссан
              </Th>
              <Th onClick={() => toggleSort('has_legacy')} active={sortKey === 'has_legacy'}>
                Уламжлалт
              </Th>
              <Th onClick={() => toggleSort('quiz_score')} active={sortKey === 'quiz_score'}>
                Quiz
              </Th>
              <Th onClick={() => toggleSort('sus_score')} active={sortKey === 'sus_score'}>
                SUS
              </Th>
              <Th onClick={() => toggleSort('lab_time_ms')} active={sortKey === 'lab_time_ms'}>
                Лаб
              </Th>
              <th className="px-3 py-3 text-right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((row) => (
              <tr key={row.id} className={`hover:bg-slate-50 ${selectedIds.has(row.id) ? 'bg-blue-50/40' : ''}`}>
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    aria-label={`${row.short_id}-г сонгох`}
                    checked={selectedIds.has(row.id)}
                    onChange={() => toggleRow(row.id)}
                    className="h-4 w-4 cursor-pointer rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                  />
                </td>
                <Td>
                  <span className="font-medium text-slate-900">
                    {row.short_id}
                  </span>
                </Td>
                <Td>{row.grade}</Td>
                <Td>{translateLevel(row.knowledge_level)}</Td>
                <Td className="text-slate-500">
                  {new Date(row.created_at).toLocaleString('mn-MN')}
                </Td>
                <Td>
                  {row.completed ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                      ✓ Тийм
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      Үгүй
                    </span>
                  )}
                </Td>
                <Td>
                  {row.has_legacy ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      ✓ Үзсэн
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                      Үгүй
                    </span>
                  )}
                </Td>
                <Td>
                  {row.quiz_details.length > 0 ? (
                    <div className="flex items-center gap-1">
                      {row.quiz_details.map((d) => (
                        <span
                          key={d.key}
                          title={d.key}
                          className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${
                            d.correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                          }`}
                        >
                          {d.correct ? '✓' : '✗'}
                        </span>
                      ))}
                      <span className="ml-1 text-xs text-slate-500 tabular-nums">
                        {row.quiz_score}/{row.quiz_details.length}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </Td>
                <Td className="tabular">
                  {row.sus_score !== null ? (
                    <span
                      className={
                        row.sus_score >= 68
                          ? 'font-medium text-green-700'
                          : 'font-medium text-amber-700'
                      }
                    >
                      {row.sus_score}
                    </span>
                  ) : (
                    '—'
                  )}
                </Td>
                <Td className="tabular text-slate-600">
                  {row.lab_time_ms !== null
                    ? `${(row.lab_time_ms / 1000).toFixed(0)} сек`
                    : '—'}
                </Td>
                <td className="px-3 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => setSelectedUserId(row.id)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                    >
                      Дэлгэрэнгүй
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm('Энэ хэрэглэгчийг устгах уу?')) {
                          try {
                            await deleteUserAction(row.id);
                            window.location.reload();
                          } catch (err: any) {
                            alert('Алдаа: ' + err.message + '\n(SUPABASE_SERVICE_ROLE_KEY тохируулагдсан эсэхийг шалгана уу)');
                          }
                        }
                      }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline"
                      title="Устгах"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={11} className="py-12 text-center text-sm text-slate-500">
                  Одоохондоо оролцогч байхгүй байна.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedUserId && (
        <ParticipantDialog
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  );
}

/* --- subcomponents --- */

function Th({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <th className="px-3 py-3 text-left">
      <button
        onClick={onClick}
        className={`flex items-center gap-1 ${
          active ? 'text-slate-900' : 'text-slate-500'
        } hover:text-slate-900`}
      >
        {children}
        {active && <span className="text-[10px]">▾</span>}
      </button>
    </th>
  );
}

function Td({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-3 py-3 ${className}`}>{children}</td>;
}

function translateLevel(level: string | null): string {
  if (!level) return '—';
  return (
    {
      novice: 'Шинэхэн',
      some: 'Зарим',
      confident: 'Сайн',
    }[level] ?? level
  );
}
