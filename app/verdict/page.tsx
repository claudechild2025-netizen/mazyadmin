'use client';

import { useEffect, useState } from 'react';
import { Trophy, Crown } from 'lucide-react';
import { AuthGate } from '@/components/AuthGate';
import { Sidebar } from '@/components/Sidebar';
import { getOverallVerdict, type VerdictSummary } from '@/lib/queries';

export default function VerdictPage() {
  return (
    <AuthGate>
      <VerdictShell />
    </AuthGate>
  );
}

const fmtMetric = (val: number | null, unit: string): string => {
  if (val === null) return '—';
  if (unit === 'ms') {
    return val < 60_000
      ? `${Math.round(val / 1000)}с`
      : `${Math.floor(val / 60_000)}мин ${Math.round((val % 60_000) / 1000)}с`;
  }
  if (unit === '%') return `${(val * 100).toFixed(0)}%`;
  return `${val.toFixed(2)}${unit}`;
};

function VerdictShell() {
  const [data, setData] = useState<VerdictSummary | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getOverallVerdict()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) {
    return (
      <div className="flex min-h-dvh">
        <Sidebar />
        <main className="flex-1 px-6 py-8 lg:px-10">
          <p className="text-sm text-slate-400">Уншиж байна...</p>
        </main>
      </div>
    );
  }

  if (!data) return null;

  const decided =
    data.mazyWins > data.legacyWins ? 'mazy' :
    data.legacyWins > data.mazyWins ? 'legacy' : 'tie';

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <main className="flex-1 px-6 py-8 lg:px-10">
        <header>
          <h1 className="text-2xl font-bold text-slate-900">Нэгдсэн үнэлгээ</h1>
          <p className="mt-1 text-sm text-slate-500">
            Mazy ба Уламжлалт горимын дараа цуглуулсан бүх судалгааны нэгдсэн дүгнэлт
          </p>
        </header>

        {/* Hero verdict */}
        <section className={`mt-6 rounded-2xl p-8 ${
          decided === 'mazy' ? 'bg-gradient-to-br from-blue-50 to-blue-100 ring-2 ring-blue-300'
          : decided === 'legacy' ? 'bg-gradient-to-br from-amber-50 to-amber-100 ring-2 ring-amber-300'
          : 'bg-slate-50 ring-1 ring-slate-200'
        }`}>
          <div className="flex items-center justify-between gap-6 flex-wrap">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Ерөнхий дүгнэлт
              </p>
              <p className={`mt-2 text-4xl font-extrabold ${
                decided === 'mazy' ? 'text-blue-800'
                : decided === 'legacy' ? 'text-amber-800'
                : 'text-slate-700'
              }`}>
                {decided === 'mazy' ? '🏆 Mazy ялсан'
                  : decided === 'legacy' ? '📖 Уламжлалт ялсан'
                  : '⚖ Тэнцсэн'}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {data.totalCompared} хэмжүүрээс — Mazy: <strong>{data.mazyWins}</strong> ·{' '}
                Уламжлалт: <strong>{data.legacyWins}</strong> ·{' '}
                Тэнцсэн: <strong>{data.ties}</strong>
              </p>
            </div>
            <Trophy size={72} className={
              decided === 'mazy' ? 'text-blue-400' :
              decided === 'legacy' ? 'text-amber-400' : 'text-slate-300'
            } />
          </div>
        </section>

        {/* Per-hypothesis metric table */}
        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-base font-semibold text-slate-900">Хэмжүүр тус бүрд</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Цэнхэр — Mazy сайн · Амбер — Уламжлалт сайн · ↓ нь бага байх нь сайн гэсэн утга
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Хэмжүүр</th>
                  <th className="px-4 py-3 text-left">Таамаглал</th>
                  <th className="px-4 py-3 text-right">Mazy</th>
                  <th className="px-4 py-3 text-right">Уламжлалт</th>
                  <th className="px-4 py-3 text-center">Ялсан</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.metrics.map((m) => (
                  <tr key={m.key} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-900">{m.label}</span>
                      {m.lower_is_better && (
                        <span className="ml-1.5 text-xs text-slate-400">↓</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700">
                        {m.hypothesis}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums ${
                      m.better === 'mazy' ? 'font-bold text-blue-700' : 'text-slate-700'
                    }`}>
                      {fmtMetric(m.mazy, m.unit)}
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums ${
                      m.better === 'legacy' ? 'font-bold text-amber-700' : 'text-slate-700'
                    }`}>
                      {fmtMetric(m.legacy, m.unit)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {m.better === 'mazy' ? (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
                          Mazy
                        </span>
                      ) : m.better === 'legacy' ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                          Уламжлалт
                        </span>
                      ) : m.better === 'tie' ? (
                        <span className="text-xs text-slate-400">Тэнцсэн</span>
                      ) : (
                        <span className="text-xs text-slate-300">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Per-participant verdict */}
        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-base font-semibold text-slate-900">Оролцогч тус бүрд аль нь илүү тохирсон бэ?</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Within-subject — нэг оролцогчийн Mazy / Уламжлалт оноо харьцуулсан
          </p>
          {data.perParticipant.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">Хоёуланг нь дуусгасан оролцогч алга.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3 py-3 text-left">Оролцогч</th>
                    <th className="px-3 py-3 text-right">Mazy оноо</th>
                    <th className="px-3 py-3 text-right">Уламжлалт оноо</th>
                    <th className="px-3 py-3 text-center">Шийдсэн</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.perParticipant
                    .sort((a, b) => (b.mazyScore + b.legacyScore) - (a.mazyScore + a.legacyScore))
                    .map((p) => (
                    <tr key={p.client_uid} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {p.display_name || p.client_uid.slice(0, 8)}
                      </td>
                      <td className={`px-3 py-2 text-right tabular-nums ${
                        p.decided === 'mazy' ? 'font-bold text-blue-700' : 'text-slate-600'
                      }`}>
                        {p.mazyScore}
                      </td>
                      <td className={`px-3 py-2 text-right tabular-nums ${
                        p.decided === 'legacy' ? 'font-bold text-amber-700' : 'text-slate-600'
                      }`}>
                        {p.legacyScore}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {p.decided === 'mazy' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
                            <Crown size={11} /> Mazy
                          </span>
                        ) : p.decided === 'legacy' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                            <Crown size={11} /> Уламжлалт
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Тэнцсэн</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="pt-6 text-center text-xs text-slate-500">
          L1–L6 өндөр сайн · L7 ба хугацаа бага сайн · Quiz нарийвчлал = correct/total
        </footer>
      </main>
    </div>
  );
}
