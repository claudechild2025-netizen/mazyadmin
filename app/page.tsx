'use client';

import { useEffect, useState } from 'react';
import { Users, CheckCircle2, Activity, Timer, FlaskConical } from 'lucide-react';
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
  getSurveyResponses,
  getSurveyMeans,
  getConsentLeads,
  getScreenAnalytics,
  getLessonFunnel,
  getPracticeDrillSummary,
  type FunnelStep,
  type ParticipantRow,
  type SurveyResponse,
  type SurveyMeans,
  type ConsentLead,
  type ScreenAnalyticRow,
  type LessonFunnelRow,
  type PracticeDrillRow,
} from '@/lib/queries';

/**
 * Mazy Admin — нүүр хуудас.
 *
 * 5 stat card + 1 funnel chart + 1 table.
 * Real-time өгөгдөл биш — F5 дээр refresh-лж шинэчлэнэ.
 */
export default function Dashboard() {
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
  const [rows, setRows] = useState<ParticipantRow[]>([]);
  const [surveyMeans, setSurveyMeans] = useState<SurveyMeans | null>(null);
  const [surveyResponses, setSurveyResponses] = useState<SurveyResponse[]>([]);
  const [consentLeads, setConsentLeads] = useState<ConsentLead[]>([]);
  const [screenAnalytics, setScreenAnalytics] = useState<ScreenAnalyticRow[]>([]);
  const [lessonFunnel, setLessonFunnel] = useState<LessonFunnelRow[]>([]);
  const [practiceDrills, setPracticeDrills] = useState<PracticeDrillRow[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [total, completed, sus, quizMs, labMs, funnel, rows, means, sResp, leads, sAnalytics, lFunnel, pDrills] = await Promise.all([
          getTotalParticipants(),
          getCompletedLessons(),
          getMeanSusScore(),
          getMeanQuizAnswerTimeMs(),
          getMeanLabTimeMs(),
          getCompletionFunnel(),
          getParticipants(),
          getSurveyMeans().catch(() => null),
          getSurveyResponses().catch(() => []),
          getConsentLeads().catch(() => []),
          getScreenAnalytics().catch(() => []),
          getLessonFunnel().catch(() => []),
          getPracticeDrillSummary().catch(() => []),
        ]);
        setStats({ total, completed, sus, quizMs, labMs });
        setFunnel(funnel);
        setRows(rows);
        setSurveyMeans(means);
        setSurveyResponses(sResp);
        setConsentLeads(leads);
        setScreenAnalytics(sAnalytics);
        setLessonFunnel(lFunnel);
        setPracticeDrills(pDrills);
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
          <p className="mt-3 text-xs text-red-600">
            <code>NEXT_PUBLIC_SUPABASE_URL</code> ба <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{' '}
            тохируулагдсан эсэхээ шалгаарай.
          </p>
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

      {/* 5 stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label="Нийт оролцогч"
          value={stats!.total}
          icon={<Users size={18} />}
        />
        <StatCard
          label="Лесон дуусгасан"
          value={stats!.completed}
          icon={<CheckCircle2 size={18} />}
          hint={
            stats!.total > 0
              ? `${Math.round((stats!.completed / stats!.total) * 100)}% оролцогч`
              : ''
          }
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

      {/* Funnel chart */}
      <CompletionFunnel data={funnel} />

      {/* Screen Analytics Table */}
      <ScreenAnalyticsTable rows={screenAnalytics} />

      {/* Participant table */}
      <ParticipantTable rows={rows} />

      {/* v5 — Per-lesson 4-phase funnel */}
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-base font-semibold text-slate-900">
          Хичээл бүрийн фазын дамжилт
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Phase 1 Lab → Phase 2 Distill → Phase 3 Practice → Phase 4 Quiz. Тоо нь
          тухайн фазад хүрсэн distinct хэрэглэгчийн тоо.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Хичээл</th>
                <th className="px-4 py-3 text-right">Лаб</th>
                <th className="px-4 py-3 text-right">Хураангуй</th>
                <th className="px-4 py-3 text-right">Дасгал</th>
                <th className="px-4 py-3 text-right">Сорилт</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lessonFunnel.map((r) => (
                <tr key={r.lesson_id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-mono text-xs">{r.lesson_id}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.lab_reached}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.distill_reached}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.practice_reached}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.quiz_reached}</td>
                </tr>
              ))}
              {lessonFunnel.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-slate-500">
                    Одоохондоо өгөгдөл байхгүй.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* v5 — Practice drill summary */}
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-base font-semibold text-slate-900">
          Дасгалын дүн (Phase 3)
        </h2>
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

      {/* v3 Survey — per-question Likert means */}
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-base font-semibold text-slate-900">
          Санал асуулга · Likert дундаж (1–5)
        </h2>
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

      {/* Open-ended Q6 quotes */}
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-base font-semibold text-slate-900">
          Чөлөөт санал хүсэлт (Q6)
        </h2>
        <div className="mt-4 space-y-3">
          {surveyResponses
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
          {surveyResponses.length === 0 && (
            <p className="text-sm text-slate-500">Одоогоор хариу алга.</p>
          )}
        </div>
      </section>

      {/* Q7 Consent leads */}
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-base font-semibold text-slate-900">
          Дараагийн судалгаанд оролцох (Q7)
        </h2>
        <div className="mt-4 overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2 text-left">Нэр</th>
                <th className="text-left">Холбоо барих</th>
                <th className="text-left">Огноо</th>
              </tr>
            </thead>
            <tbody>
              {consentLeads.map((c) => (
                <tr key={c.uid + c.submitted_at} className="border-t border-slate-100">
                  <td className="py-2">
                    <span className="font-medium text-slate-900">
                      {c.display_name || c.uid.slice(0, 8)}
                    </span>
                  </td>
                  <td>{c.contact}</td>
                  <td className="text-slate-500">
                    {new Date(c.submitted_at).toLocaleString('mn-MN')}
                  </td>
                </tr>
              ))}
              {consentLeads.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-slate-500">
                    Зөвшөөрсөн оролцогч одоогоор алга.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Footer */}
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
