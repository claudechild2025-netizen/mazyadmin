import React from 'react';
import type { ScreenAnalyticRow } from '@/lib/queries';

export function ScreenAnalyticsTable({ rows }: { rows: ScreenAnalyticRow[] }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-base font-semibold text-slate-900">
        Дэлгэрэнгүй хандалтын дата (Screen Analytics)
      </h2>
      <p className="mt-0.5 text-xs text-slate-500">
        Дэлгэц тус бүр дээрх хандалтын тоо, нийт товшилт/үйлдэл, болон дунджаар зарцуулсан хугацаа.
      </p>
      
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Дэлгэцийн нэр (Surface)</th>
              <th className="px-4 py-3 font-semibold text-right">Хандалт (Views)</th>
              <th className="px-4 py-3 font-semibold text-right">Үйлдэл (Taps)</th>
              <th className="px-4 py-3 font-semibold text-right">Дундаж хугацаа</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.surface} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 font-mono text-xs font-medium text-slate-900">
                  {row.surface}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {row.views > 0 ? row.views : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {row.taps > 0 ? (
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                      {row.taps}
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                  {row.avg_time_ms > 0 ? `${(row.avg_time_ms / 1000).toFixed(1)}с` : '—'}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-sm text-slate-500">
                  Мэдээлэл олдсонгүй
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
