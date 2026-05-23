'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { AuthGate } from '@/components/AuthGate';
import { Sidebar } from '@/components/Sidebar';
import {
  getLikertResponses,
  getLikertMeans,
  type LikertResponse,
  type LikertMeans,
} from '@/lib/queries';

const L_LABELS: { key: keyof LikertResponse; label: string; note?: string }[] = [
  { key: 'l1', label: 'L1 · Ойлгомжтой байдал' },
  { key: 'l2', label: 'L2 · Мэдээллийн хэмжээ' },
  { key: 'l3', label: 'L3 · Хичээлийн урт', note: '1=хэт богино, 3=зөв, 5=хэт урт' },
  { key: 'l4', label: 'L4 · Давтан хэрэглээ' },
  { key: 'l5', label: 'L5 · Санал болголт' },
  { key: 'l6', label: 'L6 · Итгэлтэй байдал' },
  { key: 'l7', label: 'L7 · Танин мэдэхүйн ачаалал', note: 'Бага = сайн' },
];

const B_LABELS: { key: keyof LikertResponse; label: string }[] = [
  { key: 'b1', label: 'Б1 · Хамгийн сайн тал' },
  { key: 'b2', label: 'Б2 · Сайжруулах зүйл' },
  { key: 'b3', label: 'Б3 · Нэмэлт санал' },
];

export default function LikertPage() {
  return (
    <AuthGate>
      <LikertShell />
    </AuthGate>
  );
}

function LikertShell() {
  const [rows, setRows] = useState<LikertResponse[]>([]);
  const [means, setMeans] = useState<LikertMeans[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeCondition, setActiveCondition] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getLikertResponses(), getLikertMeans()])
      .then(([r, m]) => {
        setRows(r);
        setMeans(m);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const conditions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.condition))).sort(),
    [rows],
  );

  const mazyMeans = means.find((m) => m.condition.toLowerCase().includes('mazy'));
  const legacyMeans = means.find((m) => !m.condition.toLowerCase().includes('mazy') || m.condition.toLowerCase().includes('legacy'));

  const filteredRows = activeCondition
    ? rows.filter((r) => r.condition === activeCondition)
    : rows;

  const csvHref = useMemo(() => buildCsvHref(rows), [rows]);

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <main className="flex-1 px-6 py-8 lg:px-10">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Likert судалгаа (L1–L7)</h1>
            <p className="mt-1 text-sm text-slate-500">
              Within-subject · Mazy vs Legacy · 1–5 шкала · H₄ ба H₅ таамаглал
            </p>
          </div>
          <a
            href={csvHref}
            download="mazy_likert.csv"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white"
          >
            <Download size={16} />
            CSV татах
          </a>
        </header>

        {/* Mazy vs Legacy means comparison */}
        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-base font-semibold text-slate-900">Дундаж оноо · Нөхцөл харьцуулалт</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            L7 бага байх нь танин мэдэхүйн ачаалал бага гэсэн үг (H₅ таамаглал).
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Асуулт</th>
                  {means.map((m) => (
                    <th key={m.condition} className="px-4 py-3 text-right">
                      {m.condition}
                      <span className="ml-1 text-slate-400">(n={m.n})</span>
                    </th>
                  ))}
                  {mazyMeans && legacyMeans && mazyMeans !== legacyMeans && (
                    <th className="px-4 py-3 text-right text-slate-400">Δ (Mazy−Legacy)</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {L_LABELS.map(({ key, label, note }) => (
                  <tr key={key} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <span className="font-medium">{label}</span>
                      {note && <span className="ml-2 text-xs text-slate-400">{note}</span>}
                    </td>
                    {means.map((m) => {
                      const val = m[key as keyof LikertMeans] as number | null;
                      return (
                        <td key={m.condition} className="px-4 py-3 text-right tabular-nums">
                          {val !== null ? (
                            <span
                              className={
                                key === 'l7'
                                  ? val <= 2.5
                                    ? 'font-semibold text-emerald-600'
                                    : val >= 4
                                    ? 'font-semibold text-red-500'
                                    : ''
                                  : val >= 4
                                  ? 'font-semibold text-emerald-600'
                                  : val <= 2.5
                                  ? 'font-semibold text-red-500'
                                  : ''
                              }
                            >
                              {val.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      );
                    })}
                    {mazyMeans && legacyMeans && mazyMeans !== legacyMeans && (
                      <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                        {(() => {
                          const mv = mazyMeans[key as keyof LikertMeans] as number | null;
                          const lv = legacyMeans[key as keyof LikertMeans] as number | null;
                          if (mv === null || lv === null) return <span className="text-slate-400">—</span>;
                          const delta = mv - lv;
                          return (
                            <span className={delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-500' : ''}>
                              {delta > 0 ? '+' : ''}{delta.toFixed(2)}
                            </span>
                          );
                        })()}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loaded && <p className="mt-4 text-sm text-slate-400">Уншиж байна...</p>}
          {loaded && means.length === 0 && (
            <p className="mt-4 text-sm text-slate-500">
              Одоогоор L1–L7 бүтэцтэй хариу алга. Апп дахь survey-д{' '}
              <code className="rounded bg-slate-100 px-1 text-xs">condition</code> талбар байгаа эсэхийг шалгаарай.
            </p>
          )}
        </section>

        {/* Open-ended B1-B3 quotes per condition */}
        {B_LABELS.map(({ key, label }) => {
          const quotes = rows.filter((r) => {
            const v = r[key];
            return typeof v === 'string' && v.trim().length > 0;
          });
          if (quotes.length === 0) return null;
          return (
            <section key={key} className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-base font-semibold text-slate-900">{label}</h2>
              <div className="mt-4 space-y-3">
                {quotes.map((r) => (
                  <blockquote
                    key={r.id}
                    className={`rounded-lg border-l-4 px-4 py-3 text-sm ${
                      r.condition.toLowerCase().includes('mazy')
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-amber-500 bg-amber-50'
                    }`}
                  >
                    &ldquo;{String(r[key])}&rdquo;
                    <footer className="mt-2 text-xs text-slate-500">
                      <span className="font-medium text-slate-700">
                        {r.display_name || r.user_id_client.slice(0, 8)}
                      </span>
                      {' · '}
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                          r.condition.toLowerCase().includes('mazy')
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {r.condition}
                      </span>
                      {' · '}
                      {new Date(r.submitted_at).toLocaleString('mn-MN')}
                    </footer>
                  </blockquote>
                ))}
              </div>
            </section>
          );
        })}

        {/* Full response table */}
        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Бүх хариу</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveCondition(null)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  activeCondition === null
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Бүгд
              </button>
              {conditions.map((c) => (
                <button
                  key={c}
                  onClick={() => setActiveCondition(c)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                    activeCondition === c
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-3 text-left">Оролцогч</th>
                  <th className="px-3 py-3 text-left">Нөхцөл</th>
                  <th className="px-3 py-3 text-right">L1</th>
                  <th className="px-3 py-3 text-right">L2</th>
                  <th className="px-3 py-3 text-right">L3</th>
                  <th className="px-3 py-3 text-right">L4</th>
                  <th className="px-3 py-3 text-right">L5</th>
                  <th className="px-3 py-3 text-right">L6</th>
                  <th className="px-3 py-3 text-right">L7</th>
                  <th className="px-3 py-3 text-left">Огноо</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2 font-medium text-slate-900">
                      {r.display_name || r.user_id_client.slice(0, 8)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                          r.condition.toLowerCase().includes('mazy')
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {r.condition}
                      </span>
                    </td>
                    {(['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7'] as const).map((k) => (
                      <td key={k} className="px-3 py-2 text-right tabular-nums">
                        {r[k] ?? <span className="text-slate-400">—</span>}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-slate-500">
                      {new Date(r.submitted_at).toLocaleString('mn-MN')}
                    </td>
                  </tr>
                ))}
                {loaded && filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-sm text-slate-500">
                      Одоогоор хариу алга.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="pt-6 text-center text-xs text-slate-500">
          Wilcoxon signed-rank test · p &lt; 0.05 · H₄ (L1–L6) · H₅ (L7)
        </footer>
      </main>
    </div>
  );
}

function buildCsvHref(rows: LikertResponse[]): string {
  const header = ['participant_id', 'display_name', 'condition', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'B1', 'B2', 'B3', 'submitted_at'];
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(
      [r.user_id_client, r.display_name, r.condition, r.l1, r.l2, r.l3, r.l4, r.l5, r.l6, r.l7, r.b1, r.b2, r.b3, r.submitted_at]
        .map(escape)
        .join(','),
    );
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  return URL.createObjectURL(blob);
}
