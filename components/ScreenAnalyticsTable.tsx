'use client';

import React, { useState } from 'react';
import type { ScreenAnalyticRow } from '@/lib/queries';

type Category = 'mazy' | 'legacy' | 'core';

function categorize(slug: string): Category {
  if (slug.startsWith('legacy:')) return 'legacy';
  if (
    slug.startsWith('lesson_') ||
    slug.startsWith('quiz:')    ||
    slug.startsWith('lab:')     ||
    slug.startsWith('motion_player:')
  ) return 'mazy';
  return 'core';
}

const GROUPS: { id: Category; label: string; subtitle: string }[] = [
  { id: 'mazy',   label: 'Mazy',        subtitle: 'Бичил сургалтын модуль (lesson_*, quiz, lab, motion_player)' },
  { id: 'legacy', label: 'Уламжлалт',   subtitle: 'legacy:* — топик, сорил, дуусгал' },
  { id: 'core',   label: 'Үндсэн',      subtitle: 'home, lessons, login, level, survey, done г.м.' },
];

export function ScreenAnalyticsTable({ rows }: { rows: ScreenAnalyticRow[] }) {
  const [active, setActive] = useState<Category>('mazy');

  const grouped = new Map<Category, ScreenAnalyticRow[]>([
    ['mazy', []], ['legacy', []], ['core', []],
  ]);
  for (const r of rows) {
    grouped.get(categorize(r.surface))!.push(r);
  }

  const current = GROUPS.find((g) => g.id === active)!;
  const list = grouped.get(active) ?? [];

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Дэлгэрэнгүй хандалтын дата
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Дэлгэц тус бүрийн хандалт, товшилт, дундаж хугацаа.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1 ring-1 ring-slate-200">
          {GROUPS.map((g) => {
            const count = grouped.get(g.id)?.length ?? 0;
            return (
              <button
                key={g.id}
                onClick={() => setActive(g.id)}
                className={`flex items-center gap-2 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  active === g.id
                    ? g.id === 'mazy'   ? 'bg-blue-600 text-white'
                    : g.id === 'legacy' ? 'bg-amber-500 text-white'
                                        : 'bg-slate-700 text-white'
                    : 'text-slate-600 hover:bg-white'
                }`}
              >
                {g.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  active === g.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">{current.subtitle}</p>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 font-semibold">Дэлгэц (slug)</th>
              <th className="px-3 py-2 font-semibold text-right">Хандалт</th>
              <th className="px-3 py-2 font-semibold text-right">Үйлдэл</th>
              <th className="px-3 py-2 font-semibold text-right">Дундаж хугацаа</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((row) => (
              <tr key={row.surface} className="hover:bg-slate-50/60">
                <td className="px-3 py-2 font-mono text-xs font-medium text-slate-900">
                  {row.surface}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {row.views > 0 ? row.views : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {row.taps > 0 ? (
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                      {row.taps}
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-500">
                  {row.avg_time_ms > 0 ? `${(row.avg_time_ms / 1000).toFixed(1)}с` : '—'}
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-xs text-slate-400">
                  Энэ ангилалд мэдээлэл алга.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
