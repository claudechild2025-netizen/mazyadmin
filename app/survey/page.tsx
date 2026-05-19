'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { AuthGate } from '@/components/AuthGate';
import { Sidebar } from '@/components/Sidebar';
import {
  getSurveyResponses,
  type SurveyResponse,
} from '@/lib/queries';

/*
  /survey — full list of post-session questionnaire responses, with quoted
  open-ended (Q6) text and a CSV export button.
*/
export default function SurveyPage() {
  return (
    <AuthGate>
      <SurveyShell />
    </AuthGate>
  );
}

function SurveyShell() {
  const [rows, setRows] = useState<SurveyResponse[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getSurveyResponses()
      .then((r) => setRows(r))
      .catch(() => setRows([]))
      .finally(() => setLoaded(true));
  }, []);

  const csvHref = useMemo(() => buildCsvHref(rows), [rows]);

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <main className="flex-1 px-6 py-8 lg:px-10">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Санал асуулга</h1>
            <p className="mt-1 text-sm text-slate-500">
              Хичээл дууссаны дараах 7 асуултын хариу.
            </p>
          </div>
          <a
            href={csvHref}
            download="mazy_survey.csv"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white"
          >
            <Download size={16} />
            CSV татах
          </a>
        </header>

        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            Чөлөөт санал (Q6)
          </h2>
          <div className="mt-4 space-y-3">
            {rows
              .filter((r) => {
                const v = (r.answers as Record<string, unknown>).q6_open_feedback;
                return typeof v === 'string' && v.trim().length > 0;
              })
              .map((r) => (
                <blockquote
                  key={r.id}
                  className="rounded-lg border-l-4 border-blue-500 bg-blue-50 px-4 py-3 text-sm"
                >
                  &ldquo;{String((r.answers as Record<string, unknown>).q6_open_feedback)}&rdquo;
                  <footer className="mt-2 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">
                      {r.display_name || r.user_id_client.slice(0, 8)}
                    </span>
                    {' · '}
                    {new Date(r.submitted_at).toLocaleString('mn-MN')}
                  </footer>
                </blockquote>
              ))}
            {loaded && rows.length === 0 && (
              <p className="text-sm text-slate-500">Одоогоор хариу алга.</p>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-base font-semibold text-slate-900">Бүх хариу</h2>
          <div className="mt-4 overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2 text-left">Нэр</th>
                  <th className="text-left">Q1</th>
                  <th className="text-left">Q2</th>
                  <th className="text-left">Q3</th>
                  <th className="text-left">Q4</th>
                  <th className="text-left">Q5</th>
                  <th className="text-left">Огноо</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const a = r.answers as Record<string, unknown>;
                  return (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="py-2">
                        <span className="font-medium text-slate-900">
                          {r.display_name || r.user_id_client.slice(0, 8)}
                        </span>
                      </td>
                      <td>{String(a.q1_motion_graphic ?? '')}</td>
                      <td>{String(a.q2_visual_clarity ?? '')}</td>
                      <td>{String(a.q3_navigation ?? '')}</td>
                      <td>{String(a.q4_color_palette ?? '')}</td>
                      <td>{String(a.q5_mascot_microlearning ?? '')}</td>
                      <td className="text-slate-500">
                        {new Date(r.submitted_at).toLocaleString('mn-MN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function buildCsvHref(rows: SurveyResponse[]): string {
  const header = ['uid', 'submitted_at', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6_open', 'q7_consent', 'q7_contact'];
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [header.join(',')];
  for (const r of rows) {
    const a = r.answers as Record<string, unknown>;
    const consent = (a.q7_consent ?? {}) as { consent?: string; contact?: string };
    lines.push(
      [
        r.user_id_client,
        r.submitted_at,
        a.q1_motion_graphic,
        a.q2_visual_clarity,
        a.q3_navigation,
        a.q4_color_palette,
        a.q5_mascot_microlearning,
        a.q6_open_feedback,
        consent.consent,
        consent.contact,
      ]
        .map(escape)
        .join(','),
    );
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  return URL.createObjectURL(blob);
}
