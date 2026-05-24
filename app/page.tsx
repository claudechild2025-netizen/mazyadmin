'use client';

import { useEffect, useState } from 'react';
import { Users, CheckCircle2, Activity, Timer, FlaskConical, Download } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { CompletionFunnel } from '@/components/CompletionFunnel';
import { ParticipantTable } from '@/components/ParticipantTable';
import { ScreenAnalyticsTable } from '@/components/ScreenAnalyticsTable';
import {
  getTotalParticipants,
  getCompletedLessons,
  getMeanSusScore,
  getMeanQuizAnswerTimeMs,
  getMeanLabTimeMs,
  getCompletionFunnel,
  getParticipants,
  getScreenAnalytics,
  getPracticeDrillSummary,
  getSurveyResponses,
  getSurveyMeans,
  type FunnelStep,
  type ParticipantRow,
  type ScreenAnalyticRow,
  type PracticeDrillRow,
  type SurveyResponse,
  type SurveyMeans,
} from '@/lib/queries';

type Tab = 'overview' | 'participants' | 'survey';

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<{
    total: number;
    completed: number;
    sus: number | null;
    quizMs: number | null;
    labMs: number | null;
  } | null>(null);
  const [funnel, setFunnel] = useState<FunnelStep[]>([]);
  const [screenAnalytics, setScreenAnalytics] = useState<ScreenAnalyticRow[]>([]);
  const [practiceDrills, setPracticeDrills] = useState<PracticeDrillRow[]>([]);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [surveyMeans, setSurveyMeans] = useState<SurveyMeans | null>(null);
  const [surveyRows, setSurveyRows] = useState<SurveyResponse[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [total, completed, sus, quizMs, labMs, fnl, sAnalytics, pDrills, parts, sMeans, sRows] =
          await Promise.all([
            getTotalParticipants(),
            getCompletedLessons(),
            getMeanSusScore(),
            getMeanQuizAnswerTimeMs(),
            getMeanLabTimeMs(),
            getCompletionFunnel(),
            getScreenAnalytics().catch(() => []),
            getPracticeDrillSummary().catch(() => []),
            getParticipants().catch(() => []),
            getSurveyMeans().catch(() => null),
            getSurveyResponses().catch(() => []),
          ]);
        setStats({ total, completed, sus, quizMs, labMs });
        setFunnel(fnl);
        setScreenAnalytics(sAnalytics);
        setPracticeDrills(pDrills);
        setParticipants(parts);
        setSurveyMeans(sMeans);
        setSurveyRows(sRows);
      } catch (err: any) {
        setError(err.message ?? String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl p-8">
        <div className="text-sm text-slate-500">Өгөгдөл татаж байна...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-7xl p-8">
        <div className="rounded-2xl bg-red-50 p-6 text-sm text-red-800">
          <p className="font-semibold">Алдаа гарлаа.</p>
          <p className="mt-1">{error}</p>
        </div>
      </main>
    );
  }

  const susStatus =
    stats?.sus === null
      ? undefined
      : stats!.sus! >= 68
        ? { kind: 'good' as const, text: 'Зөвшөөрөгдсөн (≥68)' }
        : { kind: 'warn' as const, text: 'Сайжруулах хэрэгтэй' };

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'overview',     label: 'Хяналт' },
    { id: 'participants', label: 'Оролцогчид',   badge: participants.length },
    { id: 'survey',       label: 'Санал асуулга', badge: surveyRows.length },
  ];

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mazy Admin</h1>
          <p className="mt-1 text-sm text-slate-600">
            Тестийн өгөгдлийн самбар · {new Date().toLocaleString('mn-MN')}
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          ↻ Шинэчлэх
        </button>
      </header>

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-xl bg-white p-1 ring-1 ring-slate-200 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.label}
            {t.badge !== undefined && t.badge > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                tab === t.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Overview tab ───────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <StatCard label="Нийт оролцогч" value={stats!.total} icon={<Users size={18} />} />
            <StatCard
              label="Лесон дуусгасан"
              value={stats!.completed}
              icon={<CheckCircle2 size={18} />}
              hint={stats!.total > 0 ? `${Math.round((stats!.completed / stats!.total) * 100)}% оролцогч` : ''}
            />
            <StatCard
              label="Дундаж SUS оноо"
              value={stats!.sus !== null ? stats!.sus : '—'}
              icon={<Activity size={18} />}
              status={susStatus}
            />
            <StatCard
              label="Дундаж бодолтын хугацаа"
              value={stats!.quizMs !== null ? `${(stats!.quizMs / 1000).toFixed(1)}с` : '—'}
              icon={<Timer size={18} />}
              hint="Quiz асуултанд"
            />
            <StatCard
              label="Лаб дахь дундаж"
              value={stats!.labMs !== null ? `${(stats!.labMs / 1000).toFixed(0)}с` : '—'}
              icon={<FlaskConical size={18} />}
              hint="Интерактив дэлгэц"
            />
          </div>

          <CompletionFunnel data={funnel} />
          <ScreenAnalyticsTable rows={screenAnalytics} />

          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-base font-semibold text-slate-900">Дасгалын дүн (Phase 3)</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Drill бүрийн оролдлого, дундаж зөв/буруу тоо, дундаж хугацаа.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Хичээл</th>
                    <th className="px-4 py-3 text-left">Drill</th>
                    <th className="px-4 py-3 text-left">Төрөл</th>
                    <th className="px-4 py-3 text-right">Оролдлого</th>
                    <th className="px-4 py-3 text-right">Дунд. зөв</th>
                    <th className="px-4 py-3 text-right">Дунд. буруу</th>
                    <th className="px-4 py-3 text-right">Дунд. хугацаа</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {practiceDrills.map((d, i) => (
                    <tr key={`${d.lesson_id}:${d.drill_id}:${i}`} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono text-xs">{d.lesson_id}</td>
                      <td className="px-4 py-3 font-mono text-xs">{d.drill_id}</td>
                      <td className="px-4 py-3 text-slate-500">{d.drill_kind ?? '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{d.attempts}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{d.avg_correct.toFixed(1)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{d.avg_wrong.toFixed(1)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                        {d.avg_duration_ms != null ? `${(d.avg_duration_ms / 1000).toFixed(1)}с` : '—'}
                      </td>
                    </tr>
                  ))}
                  {practiceDrills.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-sm text-slate-500">
                        Одоохондоо drill хийгдээгүй.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ─── Participants tab ───────────────────────────────────────────── */}
      {tab === 'participants' && <ParticipantTable rows={participants} />}

      {/* ─── Survey tab ─────────────────────────────────────────────────── */}
      {tab === 'survey' && (
        <div className="space-y-6">
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-base font-semibold text-slate-900">Likert дундаж (1–5)</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              n = {surveyMeans?.n_responses ?? 0} хариу. 4-өөс дээш бол positive feedback.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-5">
              <StatCard label="Q1 · Хөдөлгөөнт" value={fmtMean(surveyMeans?.q1_motion_graphic)} hint="1–5" />
              <StatCard label="Q2 · Цэвэрхэн"   value={fmtMean(surveyMeans?.q2_visual_clarity)} />
              <StatCard label="Q3 · Навигаци"   value={fmtMean(surveyMeans?.q3_navigation)} />
              <StatCard label="Q4 · Өнгө"       value={fmtMean(surveyMeans?.q4_color_palette)} />
              <StatCard label="Q5 · Мазаалай"   value={fmtMean(surveyMeans?.q5_mascot_microlearning)} />
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-base font-semibold text-slate-900">Чөлөөт санал (Q6)</h2>
            <div className="mt-4 space-y-3">
              {surveyRows
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
              {surveyRows.length === 0 && (
                <p className="text-sm text-slate-500">Одоогоор хариу алга.</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Бүх хариу</h2>
              <a
                href={buildSurveyCsv(surveyRows)}
                download="mazy_survey.csv"
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white"
              >
                <Download size={14} />
                CSV татах
              </a>
            </div>
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
                  {surveyRows.map((r) => {
                    const a = r.answers as Record<string, unknown>;
                    return (
                      <tr key={r.id} className="border-t border-slate-100">
                        <td className="py-2 font-medium text-slate-900">
                          {r.display_name || r.user_id_client.slice(0, 8)}
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
                  {surveyRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-500">
                        Хариу алга.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      <footer className="pt-4 text-center text-xs text-slate-500">
        Mazy Admin · Read-only · Дипломын ажил 2026
      </footer>
    </main>
  );
}

function fmtMean(v: number | null | undefined): string {
  if (v == null) return '—';
  return Number(v).toFixed(1);
}

function buildSurveyCsv(rows: SurveyResponse[]): string {
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
      [r.user_id_client, r.submitted_at, a.q1_motion_graphic, a.q2_visual_clarity, a.q3_navigation, a.q4_color_palette, a.q5_mascot_microlearning, a.q6_open_feedback, consent.consent, consent.contact]
        .map(escape)
        .join(','),
    );
  }
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  return URL.createObjectURL(blob);
}
