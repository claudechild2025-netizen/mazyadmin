'use client';

import type { ReactNode } from 'react';

/**
 * Stat card.
 * 5 ширхэг dashboard дээр харуулна — нийт оролцогч, дуусгасан, дундаж SUS, гэх мэт.
 *
 * Status chip нь optional. Жишээ нь SUS оноо 68 дээш бол ногоон, доор бол шар.
 */
type Props = {
  label: string;
  value: ReactNode;
  hint?: string;
  status?: { kind: 'good' | 'warn' | 'neutral'; text: string };
  icon?: ReactNode;
};

export function StatCard({ label, value, hint, status, icon }: Props) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {label}
        </p>
        {icon && <span className="text-slate-400">{icon}</span>}
      </div>

      <p className="tabular mt-3 text-3xl font-bold text-slate-900">{value}</p>

      <div className="mt-3 flex items-center gap-2 text-xs">
        {status && (
          <span
            className={`rounded-full px-2 py-0.5 font-medium ${
              status.kind === 'good'
                ? 'bg-green-100 text-green-800'
                : status.kind === 'warn'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {status.text}
          </span>
        )}
        {hint && <span className="text-slate-500">{hint}</span>}
      </div>
    </div>
  );
}
