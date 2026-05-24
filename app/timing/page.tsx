'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { AuthGate } from '@/components/AuthGate';
import { Sidebar } from '@/components/Sidebar';
import { getTimingComparison, type TimingRow, type TimingSummary } from '@/lib/queries';

export default function TimingPage() {
  return (
    <AuthGate>
      <TimingShell />
    </AuthGate>
  );
}

const fmt = (ms: number | null) =>
  ms === null ? '—' : ms < 60_000
    ? `${Math.round(ms / 1000)}с`
    : `${Math.floor(ms / 60_000)}мин ${Math.round((ms % 60_000) / 1000)}с`;

function delta(a: number | null, b: number | null) {
  if (a === null || b === null) return null;
  return a - b;
}

function TimingShell() {
  const [rows, setRows] = useState<TimingRow[]>([]);
  const [summary, setSummary] = useState<TimingSummary | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [showOnly, setShowOnly] = useState<'all' | 'both' | 'mazy' | 'legacy'>('all');

  useEffect(() => {
    getTimingComparison()
      .then(({ rows, summary }) => {
        setRows(rows);
        setSummary(summary);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const filtered = useMemo(() => {
    if (showOnly === 'both')   return rows.filter((r) => r.mazy_total_ms !== null && r.legacy_total_ms !== null);
    if (showOnly === 'mazy')   return rows.filter((r) => r.mazy_total_ms !== null && r.legacy_total_ms === null);
    if (showOnly === 'legacy') return rows.filter((r) => r.legacy_total_ms !== null && r.mazy_total_ms === null);
    return rows.filter((r) => r.mazy_total_ms !== null || r.legacy_total_ms !== null);
  }, [rows, showOnly]);

  const csvHref = useMemo(() => buildCsvHref(rows), [rows]);

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <main className="flex-1 px-6 py-8 lg:px-10">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Цагийн харьцуулалт</h1>
            <p className="mt-1 text-sm text-slate-500">
              Хэрэглэгчийн Mazy болон Уламжлалт горимд зарцуулсан хугацаа · within-subject
            </p>
          </div>
          <a
            href={csvHref}
            download="mazy_timing.csv"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white"
          >
            <Download size={16} />
            CSV татах
          </a>
        </header>

        {/* Summary */}
        <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SummaryCard
            title="Mazy"
            color="blue"
            n={summary?.n_mazy ?? 0}
            mean={summary?.mazy_mean_ms ?? null}
            med={summary?.mazy_median_ms ?? null}
          />
          <SummaryCard
            title="Уламжлалт"
            color="amber"
            n={summary?.n_legacy ?? 0}
            mean={summary?.legacy_mean_ms ?? null}
            med={summary?.legacy_median_ms ?? null}
          />
        </section>

        {summary && summary.n_both > 0 && (
          <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Хоёуланг нь хийсэн (within-subject) · n={summary.n_both}
            </p>
            <p className="mt-1 text-sm text-slate-700">
              Дундаж зөрүү (Mazy − Уламжлалт):{' '}
              <span className={`font-semibold ${
                (delta(summary.mazy_mean_ms, summary.legacy_mean_ms) ?? 0) < 0 ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {summary.mazy_mean_ms !== null && summary.legacy_mean_ms !== null
                  ? `${summary.mazy_mean_ms - summary.legacy_mean_ms > 0 ? '+' : ''}${fmt(Math.abs(summary.mazy_mean_ms - summary.legacy_mean_ms))} ${summary.mazy_mean_ms - summary.legacy_mean_ms < 0 ? 'хурдан' : 'удаан'}`
                  : '—'}
              </span>
            </p>
          </div>
        )}

        {/* Mazy per-screen breakdown */}
        {summary && (
          <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-base font-semibold text-slate-900">Mazy · Дэлгэцийн төрлөөр</h2>
            <p className="mt-0.5 text-xs text-slate-500">Дундаж зарцуулсан хугацаа · хэрэглэгч тус бүрд</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
              <ScreenStat label="Танилц." ms={summary.mazy_screens.intro} />
              <ScreenStat label="Видео"   ms={summary.mazy_screens.video} />
              <ScreenStat label="Лаб"     ms={summary.mazy_screens.lab} />
              <ScreenStat label="Дасгал"  ms={summary.mazy_screens.practice} />
              <ScreenStat label="Сорил"   ms={summary.mazy_screens.quiz} />
            </div>
          </section>
        )}

        {/* Legacy per-screen breakdown */}
        {summary && (
          <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-base font-semibold text-slate-900">Уламжлалт · Дэлгэцийн төрлөөр</h2>
            <p className="mt-0.5 text-xs text-slate-500">Дундаж зарцуулсан хугацаа · хэрэглэгч тус бүрд</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-6">
              <ScreenStat label="Бүлэг 1" ms={summary.legacy_screens.topic1} />
              <ScreenStat label="Бүлэг 2" ms={summary.legacy_screens.topic2} />
              <ScreenStat label="Бүлэг 3" ms={summary.legacy_screens.topic3} />
              <ScreenStat label="Бүлэг 4" ms={summary.legacy_screens.topic4} />
              <ScreenStat label="Сорил"   ms={summary.legacy_screens.quiz} />
              <ScreenStat label="Дуусгал" ms={summary.legacy_screens.complete} />
            </div>
          </section>
        )}

        {/* Per-participant table */}
        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Оролцогч тус бүрд</h2>
            <div className="flex gap-1">
              {(['all', 'both', 'mazy', 'legacy'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setShowOnly(v)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                    showOnly === v ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {v === 'all' ? 'Бүгд' : v === 'both' ? 'Хоёулаа' : v === 'mazy' ? 'Зөвхөн Mazy' : 'Зөвхөн Уламжлалт'}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-3 text-left">Оролцогч</th>
                  <th className="px-3 py-3 text-right">Mazy нийт</th>
                  <th className="px-3 py-3 text-right">Танилц.</th>
                  <th className="px-3 py-3 text-right">Видео</th>
                  <th className="px-3 py-3 text-right">Лаб</th>
                  <th className="px-3 py-3 text-right">Дасгал</th>
                  <th className="px-3 py-3 text-right">Сорил</th>
                  <th className="px-3 py-3 text-right border-l border-slate-200">Уламжлалт нийт</th>
                  <th className="px-3 py-3 text-right">Б1</th>
                  <th className="px-3 py-3 text-right">Б2</th>
                  <th className="px-3 py-3 text-right">Б3</th>
                  <th className="px-3 py-3 text-right">Б4</th>
                  <th className="px-3 py-3 text-right">Сорил</th>
                  <th className="px-3 py-3 text-right border-l border-slate-200">Δ (M−У)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => {
                  const d = delta(r.mazy_total_ms, r.legacy_total_ms);
                  return (
                    <tr key={r.client_uid} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {r.display_name || r.client_uid.slice(0, 8)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium text-blue-700">
                        {fmt(r.mazy_total_ms)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-500">{fmt(r.mazy_intro_ms || null)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-500">{fmt(r.mazy_video_ms || null)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-500">{fmt(r.mazy_lab_ms || null)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-500">{fmt(r.mazy_practice_ms || null)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-500">{fmt(r.mazy_quiz_ms || null)}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium text-amber-700 border-l border-slate-100">
                        {fmt(r.legacy_total_ms)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-500">{fmt(r.legacy_topic1_ms || null)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-500">{fmt(r.legacy_topic2_ms || null)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-500">{fmt(r.legacy_topic3_ms || null)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-500">{fmt(r.legacy_topic4_ms || null)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-500">{fmt(r.legacy_quiz_ms || null)}</td>
                      <td className="px-3 py-2 text-right tabular-nums border-l border-slate-100">
                        {d === null ? <span className="text-slate-400">—</span> : (
                          <span className={d < 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {d > 0 ? '+' : '−'}{fmt(Math.abs(d))}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {loaded && filtered.length === 0 && (
                  <tr>
                    <td colSpan={14} className="py-8 text-center text-sm text-slate-500">
                      Тохирох оролцогч алга.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="pt-6 text-center text-xs text-slate-500">
          Mazy time = screen_views.time_spent_ms · Уламжлалт time = events.legacy_completed.meta.study_ms
        </footer>
      </main>
    </div>
  );
}

function SummaryCard({
  title,
  color,
  n,
  mean,
  med,
}: {
  title: string;
  color: 'blue' | 'amber';
  n: number;
  mean: number | null;
  med: number | null;
}) {
  const c = color === 'blue'
    ? 'border-blue-300 bg-blue-50'
    : 'border-amber-300 bg-amber-50';
  const t = color === 'blue' ? 'text-blue-800' : 'text-amber-800';
  return (
    <div className={`rounded-2xl border-2 ${c} p-5`}>
      <div className="flex items-center justify-between">
        <h3 className={`text-lg font-bold ${t}`}>{title}</h3>
        <span className={`text-xs font-medium ${t}`}>n={n}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">Дундаж</p>
          <p className={`mt-1 text-2xl font-bold tabular-nums ${t}`}>{fmt(mean)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">Медиан</p>
          <p className={`mt-1 text-2xl font-bold tabular-nums ${t}`}>{fmt(med)}</p>
        </div>
      </div>
    </div>
  );
}

function ScreenStat({ label, ms }: { label: string; ms: number | null }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-base font-semibold tabular-nums text-slate-900">{fmt(ms)}</p>
    </div>
  );
}

function buildCsvHref(rows: TimingRow[]): string {
  const header = [
    'client_uid', 'display_name',
    'mazy_total_ms', 'mazy_intro_ms', 'mazy_video_ms', 'mazy_lab_ms', 'mazy_practice_ms', 'mazy_quiz_ms',
    'legacy_total_ms', 'legacy_topic1_ms', 'legacy_topic2_ms', 'legacy_topic3_ms', 'legacy_topic4_ms', 'legacy_quiz_ms', 'legacy_complete_ms',
  ];
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.client_uid, r.display_name,
        r.mazy_total_ms, r.mazy_intro_ms, r.mazy_video_ms, r.mazy_lab_ms, r.mazy_practice_ms, r.mazy_quiz_ms,
        r.legacy_total_ms, r.legacy_topic1_ms, r.legacy_topic2_ms, r.legacy_topic3_ms, r.legacy_topic4_ms, r.legacy_quiz_ms, r.legacy_complete_ms,
      ]
        .map(escape)
        .join(','),
    );
  }
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  return URL.createObjectURL(blob);
}
