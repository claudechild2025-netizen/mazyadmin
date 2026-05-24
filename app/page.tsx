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
  getLikertResponses,
  getLikertMeans,
  type FunnelStep,
  type ParticipantRow,
  type ScreenAnalyticRow,
  type PracticeDrillRow,
  type SurveyResponse,
  type SurveyMeans,
  type LikertResponse,
  type LikertMeans,
} from '@/lib/queries';

const L_LABELS: { key: keyof LikertResponse; tag: string; question: string; note?: string }[] = [
  { key: 'l1', tag: 'L1', question: 'Хичээлийн агуулга надад ойлгомжтой байлаа.' },
  { key: 'l2', tag: 'L2', question: 'Дэлгэцийн мэдээллийн хэмжээ тохиромжтой байлаа — хэт олон биш, хэт цөөн биш.' },
  { key: 'l3', tag: 'L3', question: 'Хичээлийн үргэлжлэх хугацаа надад…', note: '1=хэт богино · 3=зөв · 5=хэт урт' },
  { key: 'l4', tag: 'L4', question: 'Энэ хичээлийг ирээдүйд дахин үзэх, ашиглах болно.' },
  { key: 'l5', tag: 'L5', question: 'Энэ сургалтын хэрэгслийг найз, ангийнхандаа санал болгох байсан.' },
  { key: 'l6', tag: 'L6', question: 'Хичээлийн дараа энэ сэдвийг сайн ойлгосон гэдэгтээ итгэлтэй байна.' },
  { key: 'l7', tag: 'L7', question: 'Хичээлийн явцад оюун ухаан маань их ачаарсан мэт санагдсан.', note: 'Бага = сайн (когнитив ачаалал)' },
];
const B_LABELS: { key: keyof LikertResponse; tag: string; question: string }[] = [
  { key: 'b1', tag: 'Б1', question: 'Хичээлд хамгийн их юу таалагдсан бэ?' },
  { key: 'b2', tag: 'Б2', question: 'Юуг сайжруулбал илүү дээр байх байсан гэж бодож байна?' },
  { key: 'b3', tag: 'Б3', question: 'Нэмж хэлэхийг хүссэн санал, сэтгэгдэл байвал бичнэ үү.' },
];

type Tab = 'overview' | 'participants' | 'survey';

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>('overview');
  const [surveyTab, setSurveyTab] = useState<'new' | 'old'>('new');
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
  const [likertRows, setLikertRows] = useState<LikertResponse[]>([]);
  const [likertMeans, setLikertMeans] = useState<LikertMeans[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [total, completed, sus, quizMs, labMs, fnl, sAnalytics, pDrills, parts, sMeans, sRows, lRows, lMeans] =
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
            getLikertResponses().catch(() => []),
            getLikertMeans().catch(() => []),
          ]);
        setStats({ total, completed, sus, quizMs, labMs });
        setFunnel(fnl);
        setScreenAnalytics(sAnalytics);
        setPracticeDrills(pDrills);
        setParticipants(parts);
        setSurveyMeans(sMeans);
        setSurveyRows(sRows);
        setLikertRows(lRows);
        setLikertMeans(lMeans);
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
    { id: 'survey',       label: 'Санал асуулга', badge: likertRows.length },
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

          {/* Sub-tab switcher: Шинэ / Хуучин */}
          <div className="flex gap-1 rounded-xl bg-white p-1 ring-1 ring-slate-200 w-fit">
            <button
              onClick={() => setSurveyTab('new')}
              className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                surveyTab === 'new' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              🆕 Шинэ асуулга
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                surveyTab === 'new' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>{likertRows.length}</span>
            </button>
            <button
              onClick={() => setSurveyTab('old')}
              className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                surveyTab === 'old' ? 'bg-slate-700 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              📜 Хуучин асуулга
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                surveyTab === 'old' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>{surveyRows.length}</span>
            </button>
          </div>

          {surveyTab === 'new' && <>
          {/* Likert L1–L7 means · Mazy vs Legacy */}
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-base font-semibold text-slate-900">Likert судалгаа (L1–L7) · Mazy vs Уламжлалт</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              7 Likert + 3 чөлөөт асуулт · within-subject · L7 бага бол сайн (танин мэдэхүйн ачаалал)
            </p>
            {likertMeans.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">Одоогоор хариу алга.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Асуулт</th>
                      {likertMeans.map((m) => (
                        <th key={m.condition} className="px-3 py-2 text-right">
                          {m.condition} <span className="text-slate-400">(n={m.n})</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {L_LABELS.map(({ key, tag, question, note }) => (
                      <tr key={String(key)} className="hover:bg-slate-50/50 align-top">
                        <td className="px-3 py-2 max-w-md">
                          <div className="flex items-baseline gap-2">
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">{tag}</span>
                            <span className="text-slate-900">{question}</span>
                          </div>
                          {note && <p className="mt-1 ml-8 text-[10px] text-slate-400">{note}</p>}
                        </td>
                        {likertMeans.map((m) => {
                          const v = m[key as keyof LikertMeans] as number | null;
                          return (
                            <td key={m.condition} className="px-3 py-2 text-right tabular-nums">
                              {v !== null ? v.toFixed(2) : <span className="text-slate-300">—</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* B1–B3 open-ended quotes */}
          {B_LABELS.map(({ key, tag, question }) => {
            const quotes = likertRows.filter((r) => {
              const v = r[key];
              return typeof v === 'string' && v.trim().length > 0;
            });
            if (quotes.length === 0) return null;
            return (
              <section key={String(key)} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-baseline gap-2">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-700">{tag}</span>
                  <h2 className="text-base font-semibold text-slate-900">{question}</h2>
                </div>
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
                        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                          r.condition.toLowerCase().includes('mazy')
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>{r.condition}</span>
                        {' · '}
                        {new Date(r.submitted_at).toLocaleString('mn-MN')}
                      </footer>
                    </blockquote>
                  ))}
                </div>
              </section>
            );
          })}

          {/* Per-participant Likert table */}
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-base font-semibold text-slate-900">Likert бүх хариу</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Оролцогч</th>
                    <th className="px-3 py-2 text-left">Нөхцөл</th>
                    {(['l1','l2','l3','l4','l5','l6','l7'] as const).map((k) => (
                      <th key={k} className="px-3 py-2 text-right">{k.toUpperCase()}</th>
                    ))}
                    <th className="px-3 py-2 text-left">Огноо</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {likertRows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {r.display_name || r.user_id_client.slice(0, 8)}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                          r.condition.toLowerCase().includes('mazy')
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>{r.condition}</span>
                      </td>
                      {(['l1','l2','l3','l4','l5','l6','l7'] as const).map((k) => (
                        <td key={k} className="px-3 py-2 text-right tabular-nums">
                          {r[k] ?? <span className="text-slate-300">—</span>}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-slate-500 text-xs">
                        {new Date(r.submitted_at).toLocaleString('mn-MN')}
                      </td>
                    </tr>
                  ))}
                  {likertRows.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-6 text-center text-slate-500">Хариу алга.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          </>}

          {surveyTab === 'old' && <>
          {/* Өмнөх судалгаа — нэгдсэн үнэлгээ */}
          {(() => {
            const q6Count = surveyRows.filter((r) => {
              const v = (r.answers as Record<string, unknown>).q6_open_feedback;
              return typeof v === 'string' && v.trim().length > 0;
            }).length;
            const q7Yes = surveyRows.filter((r) => {
              const c = ((r.answers as any).q7_consent ?? {}) as { consent?: string };
              return c.consent === 'yes';
            }).length;
            const q7No = surveyRows.filter((r) => {
              const c = ((r.answers as any).q7_consent ?? {}) as { consent?: string };
              return c.consent && c.consent !== 'yes';
            }).length;

            const QUESTIONS = [
              { key: 'q1', label: 'Q1 · Хөдөлгөөнт график таалагдсан уу?', mean: surveyMeans?.q1_motion_graphic ?? null },
              { key: 'q2', label: 'Q2 · Дэлгэц цэвэрхэн харагдсан уу?',    mean: surveyMeans?.q2_visual_clarity ?? null },
              { key: 'q3', label: 'Q3 · Навигаци ойлгомжтой байсан уу?',   mean: surveyMeans?.q3_navigation ?? null },
              { key: 'q4', label: 'Q4 · Өнгөний сонголт яаж санагдсан?',   mean: surveyMeans?.q4_color_palette ?? null },
              { key: 'q5', label: 'Q5 · Мазаалай ба богино хичээл үр дүнтэй?', mean: surveyMeans?.q5_mascot_microlearning ?? null },
            ];

            return (
              <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <h2 className="text-base font-semibold text-slate-900">Өмнөх судалгаа · Нэгдсэн үнэлгээ</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Хичээл дууссаны дараах 7 асуултын ерөнхий дүн · n = {surveyMeans?.n_responses ?? 0}
                </p>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-3 py-2 text-left">Асуулт</th>
                        <th className="px-3 py-2 text-right">Дундаж</th>
                        <th className="px-3 py-2">Тарьц</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {QUESTIONS.map((q) => (
                        <tr key={q.key} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2 text-slate-900">{q.label}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-semibold">
                            {q.mean !== null ? (
                              <span className={
                                q.mean >= 4 ? 'text-emerald-700'
                                : q.mean >= 3 ? 'text-slate-700'
                                : 'text-amber-700'
                              }>{q.mean.toFixed(2)} / 5</span>
                            ) : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex h-2 w-32 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className={`h-full ${q.mean !== null && q.mean >= 4 ? 'bg-emerald-400' : q.mean !== null && q.mean >= 3 ? 'bg-slate-400' : 'bg-amber-400'}`}
                                style={{ width: q.mean ? `${(q.mean / 5) * 100}%` : '0%' }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                      <tr className="hover:bg-slate-50/50">
                        <td className="px-3 py-2 text-slate-900">Q6 · Чөлөөт санал</td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-700">
                          {q6Count} хариу
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-500">бичсэн оролцогчийн тоо</td>
                      </tr>
                      <tr className="hover:bg-slate-50/50">
                        <td className="px-3 py-2 text-slate-900">Q7 · Дараагийн судалгаанд оролцох</td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold">
                          <span className="text-emerald-700">{q7Yes}</span>
                          <span className="text-slate-400"> / </span>
                          <span className="text-amber-700">{q7No}</span>
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-500">тийм / татгалзсан</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })()}


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
                    <th className="py-2 px-2 text-left">Нэр</th>
                    <th className="px-2 text-right">Q1</th>
                    <th className="px-2 text-right">Q2</th>
                    <th className="px-2 text-right">Q3</th>
                    <th className="px-2 text-right">Q4</th>
                    <th className="px-2 text-right">Q5</th>
                    <th className="px-2 text-left">Q6 · Чөлөөт санал</th>
                    <th className="px-2 text-left">Q7 · Зөвшөөрөл</th>
                    <th className="px-2 text-left">Огноо</th>
                  </tr>
                </thead>
                <tbody>
                  {surveyRows.map((r) => {
                    const a = r.answers as Record<string, unknown>;
                    const q7 = (a.q7_consent ?? {}) as { consent?: string; contact?: string };
                    const q6 = a.q6_open_feedback as string | undefined;
                    return (
                      <tr key={r.id} className="border-t border-slate-100 align-top">
                        <td className="py-2 px-2 font-medium text-slate-900">
                          {r.display_name || r.user_id_client.slice(0, 8)}
                        </td>
                        <td className="px-2 text-right tabular-nums">{String(a.q1_motion_graphic ?? '—')}</td>
                        <td className="px-2 text-right tabular-nums">{String(a.q2_visual_clarity ?? '—')}</td>
                        <td className="px-2 text-right tabular-nums">{String(a.q3_navigation ?? '—')}</td>
                        <td className="px-2 text-right tabular-nums">{String(a.q4_color_palette ?? '—')}</td>
                        <td className="px-2 text-right tabular-nums">{String(a.q5_mascot_microlearning ?? '—')}</td>
                        <td className="px-2 max-w-xs">
                          {q6 && q6.trim() ? (
                            <span className="text-xs italic text-slate-700">&ldquo;{q6}&rdquo;</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-2">
                          {q7.consent === 'yes' ? (
                            <div className="space-y-0.5">
                              <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-800">✓ Тийм</span>
                              {q7.contact && <div className="text-[11px] text-slate-600">{q7.contact}</div>}
                            </div>
                          ) : q7.consent ? (
                            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{q7.consent}</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-2 text-slate-500 text-xs">
                          {new Date(r.submitted_at).toLocaleString('mn-MN')}
                        </td>
                      </tr>
                    );
                  })}
                  {surveyRows.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-slate-500">
                        Хариу алга.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          </>}
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
