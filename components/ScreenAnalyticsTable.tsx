import React from 'react';
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

const GROUPS: { id: Category; title: string; subtitle: string; accent: string }[] = [
  { id: 'mazy',   title: 'Mazy дэлгэцүүд',      subtitle: 'Бичил сургалтын модуль (lesson_*, quiz, lab, motion_player)', accent: 'border-blue-300' },
  { id: 'legacy', title: 'Уламжлалт дэлгэцүүд', subtitle: 'legacy:* — топик, сорил, дуусгал',                            accent: 'border-amber-300' },
  { id: 'core',   title: 'Үндсэн дэлгэцүүд',    subtitle: 'home, lessons, login, level, survey, done г.м.',              accent: 'border-slate-300' },
];

export function ScreenAnalyticsTable({ rows }: { rows: ScreenAnalyticRow[] }) {
  const grouped = new Map<Category, ScreenAnalyticRow[]>([
    ['mazy', []], ['legacy', []], ['core', []],
  ]);
  for (const r of rows) {
    grouped.get(categorize(r.surface))!.push(r);
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-base font-semibold text-slate-900">
        Дэлгэрэнгүй хандалтын дата (Screen Analytics)
      </h2>
      <p className="mt-0.5 text-xs text-slate-500">
        Дэлгэц тус бүрийн хандалт, товшилт, дундаж хугацаа — Mazy / Уламжлалт / Үндсэн гэж 3 ангилсан.
      </p>

      <div className="mt-4 space-y-5">
        {GROUPS.map((g) => {
          const list = grouped.get(g.id) ?? [];
          return (
            <div key={g.id} className={`rounded-xl border-2 ${g.accent} bg-slate-50/50 p-4`}>
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-semibold text-slate-900">{g.title}</h3>
                <span className="text-xs text-slate-500">n={list.length}</span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">{g.subtitle}</p>

              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-white text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Дэлгэц (slug)</th>
                      <th className="px-3 py-2 font-semibold text-right">Хандалт</th>
                      <th className="px-3 py-2 font-semibold text-right">Үйлдэл</th>
                      <th className="px-3 py-2 font-semibold text-right">Дундаж хугацаа</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {list.map((row) => (
                      <tr key={row.surface} className="hover:bg-white/60">
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
                        <td colSpan={4} className="py-4 text-center text-xs text-slate-400">
                          Энэ ангилалд мэдээлэл алга.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
