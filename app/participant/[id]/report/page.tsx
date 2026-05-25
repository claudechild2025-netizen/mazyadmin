'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import { getParticipantDetail, fetchObservationSession, type ObservationEventUpload } from '@/lib/queries';

type Detail = Awaited<ReturnType<typeof getParticipantDetail>>;

const LESSON_NAMES: Record<string, string> = {
  propagation: 'Гэрлийн тархалт', speed: 'Гэрлийн хурд', reflection: 'Гэрлийн ойлт',
  lenses: 'Бөмбөлөг толь ба линз', refraction: 'Гэрлийн хугарал', prism: 'Призм ба дисперс',
  'lens-eye': 'Линз ба Хүний нүд', legacy: 'Уламжлалт',
};
const LIKERT_LABELS: { key: string; label: string }[] = [
  { key: 'L1_clarity',         label: 'L1 · Ойлгомжтой' },
  { key: 'L2_info_density',    label: 'L2 · Мэдээллийн хэмжээ' },
  { key: 'L3_lesson_length',   label: 'L3 · Хичээлийн урт' },
  { key: 'L4_reuse',           label: 'L4 · Давтан хэрэглэх' },
  { key: 'L5_recommend',       label: 'L5 · Санал болгох' },
  { key: 'L6_confidence',      label: 'L6 · Итгэлтэй' },
  { key: 'L7_cognitive_load',  label: 'L7 · Ачаалал ↓' },
];
const SURVEY_LABELS: { key: string; label: string }[] = [
  { key: 'q1_motion_graphic',       label: 'Q1 · Хөдөлгөөнт график' },
  { key: 'q2_visual_clarity',       label: 'Q2 · Цэвэрхэн' },
  { key: 'q3_navigation',           label: 'Q3 · Навигаци' },
  { key: 'q4_color_palette',        label: 'Q4 · Өнгө' },
  { key: 'q5_mascot_microlearning', label: 'Q5 · Мазаалай' },
];
const fmtMs = (ms: number | null | undefined) => {
  if (ms === null || ms === undefined || ms <= 0) return '—';
  if (ms < 60_000) return `${(ms / 1000).toFixed(0)}с`;
  return `${Math.floor(ms / 60_000)}мин ${Math.round((ms % 60_000) / 1000)}с`;
};
const lessonName = (id: string | null | undefined) => id ? (LESSON_NAMES[id] ?? id) : '—';

export default function ParticipantReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<Detail | null>(null);
  const [obs, setObs] = useState<ObservationEventUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const detail = await getParticipantDetail(id);
        setData(detail);
        const dn = (detail.user as any)?.display_name as string | null;
        const fallback = (detail.user as any)?.client_uid?.slice(0, 8) as string | undefined;
        const obsKeys = [dn, fallback].filter(Boolean) as string[];
        const all: ObservationEventUpload[] = [];
        for (const k of obsKeys) {
          for (const cond of ['Mazy', 'Legacy']) {
            try {
              const rows = await fetchObservationSession(k, cond);
              all.push(...rows);
            } catch {}
          }
        }
        setObs(all);
      } catch (err: any) {
        setError(err.message ?? String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <main className="mx-auto max-w-5xl p-8 text-sm text-slate-500">Уншиж байна...</main>;
  if (error || !data || !data.user) return <main className="mx-auto max-w-5xl p-8 text-sm text-red-600">{error ?? 'Олдсонгүй'}</main>;

  const user = data.user as any;
  const screenViews = data.screenViews as any[];
  const quizAnswers = data.quizAnswers as any[];
  const survey = (data as any).survey;
  const likertResponses = ((data as any).likertResponses ?? []) as { id: number; variant: string; answers: Record<string, unknown>; submitted_at: string }[];

  // ── Quiz aggregate
  const quizMazy = quizAnswers.filter((a) => a.lesson_id !== 'legacy');
  const quizLegacy = quizAnswers.filter((a) => a.lesson_id === 'legacy');
  const aggQuiz = (list: any[]) => {
    const att = list.length;
    const cor = list.filter((a) => a.is_correct).length;
    const tt = list.reduce((acc, a) => acc + (a.time_to_answer_ms ?? 0), 0);
    return {
      attempts: att,
      correct: cor,
      wrong: att - cor,
      accuracy: att > 0 ? cor / att : 0,
      totalMs: tt,
      avgMs: att > 0 ? tt / att : 0,
    };
  };
  const qMz = aggQuiz(quizMazy);
  const qLg = aggQuiz(quizLegacy);

  // ── Time aggregate
  const screenMs = (matcher: (slug: string) => boolean) =>
    screenViews.filter((v) => matcher(v.screen_slug)).reduce((acc, v) => acc + (v.time_spent_ms ?? 0), 0);
  const tMazyRead = screenMs((s) => s.startsWith('lesson_intro:') || s.startsWith('motion_player:') || s.startsWith('lab:') || s.startsWith('lesson_lab:') || s.startsWith('lesson_practice:'));
  const tMazyQuiz = screenMs((s) => s.startsWith('quiz:'));
  const tLegacyRead = screenMs((s) => /^legacy:topic-0[1-4]$/.test(s));
  const tLegacyQuiz = screenMs((s) => s === 'legacy:quiz');
  const tMazyTotal = tMazyRead + tMazyQuiz;
  const tLegacyTotal = tLegacyRead + tLegacyQuiz;

  // ── Observation aggregate
  const obsByType = new Map<string, number>();
  for (const e of obs) obsByType.set(e.event_type, (obsByType.get(e.event_type) ?? 0) + 1);
  const obsByCond = new Map<string, number>();
  for (const e of obs) obsByCond.set(e.condition, (obsByCond.get(e.condition) ?? 0) + 1);
  const obsTotalSeverity = obs.reduce((acc, e) => acc + (e.severity ?? 0), 0);

  const downloadCsv = () => {
    const escape = (v: unknown) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const file = (name: string, header: string[], rows: any[][]) => {
      const lines = [header.join(','), ...rows.map((r) => r.map(escape).join(','))];
      const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    const slug = (user.display_name ?? user.client_uid ?? id).replace(/[^a-zA-Z0-9_-]/g, '_');
    file(
      `${slug}_quiz.csv`,
      ['lesson_id', 'question_key', 'selected_key', 'is_correct', 'time_to_answer_ms', 'answered_at'],
      quizAnswers.map((a) => [a.lesson_id, a.question_key, a.selected_key, a.is_correct, a.time_to_answer_ms, a.answered_at]),
    );
    file(
      `${slug}_screen_views.csv`,
      ['screen_slug', 'time_spent_ms', 'viewed_at'],
      screenViews.map((v) => [v.screen_slug, v.time_spent_ms, v.viewed_at]),
    );
    file(
      `${slug}_likert.csv`,
      ['variant', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'B1', 'B2', 'B3', 'submitted_at'],
      likertResponses.map((r) => {
        const a = r.answers as any;
        return [r.variant, a.L1_clarity, a.L2_info_density, a.L3_lesson_length, a.L4_reuse, a.L5_recommend, a.L6_confidence, a.L7_cognitive_load, a.B1_liked, a.B2_improve, a.B3_extra, r.submitted_at];
      }),
    );
    file(
      `${slug}_observations.csv`,
      ['condition', 'event_id', 'session_time', 'event_type', 'screen', 'duration_sec', 'severity', 'verbatim', 'notes', 'timestamp'],
      obs.map((e) => [e.condition, e.event_id, e.session_time, e.event_type, e.screen, e.duration_sec, e.severity, e.verbatim, e.notes, e.timestamp]),
    );
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-8">
      {/* Header */}
      <header className="flex items-center justify-between flex-wrap gap-3 no-print">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft size={16} /> Буцах
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            <Download size={14} /> CSV
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white"
          >
            <Printer size={14} /> PDF
          </button>
        </div>
      </header>

      {/* Title */}
      <div>
        <p className="text-xs uppercase tracking-wider text-slate-500">Оролцогчийн тайлан</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">{user.display_name || user.client_uid?.slice(0, 8) || 'Тодорхойгүй'}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {user.grade ? `${user.grade}-р анги` : ''}
          {user.knowledge_level ? ` · ${user.knowledge_level} түвшин` : ''}
          {user.created_at ? ` · Эхэлсэн ${new Date(user.created_at).toLocaleString('mn-MN')}` : ''}
        </p>
      </div>

      {/* Quiz dashboard */}
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-base font-semibold text-slate-900">Quiz үр дүн</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CondMini title="Mazy" color="blue" agg={qMz} />
          <CondMini title="Уламжлалт" color="amber" agg={qLg} />
        </div>
      </section>

      {/* Time dashboard */}
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-base font-semibold text-slate-900">Дундаж хурд · зарцуулсан хугацаа</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile label="Mazy унших" value={fmtMs(tMazyRead)} accent="blue" />
          <Tile label="Mazy quiz" value={fmtMs(tMazyQuiz)} accent="blue" />
          <Tile label="Уламжлалт унших" value={fmtMs(tLegacyRead)} accent="amber" />
          <Tile label="Уламжлалт quiz" value={fmtMs(tLegacyQuiz)} accent="amber" />
          <Tile label="Mazy нийт" value={fmtMs(tMazyTotal)} accent="blue" />
          <Tile label="Уламжлалт нийт" value={fmtMs(tLegacyTotal)} accent="amber" />
          <Tile label="Quiz дунд. бодолт (Mazy)" value={fmtMs(qMz.avgMs)} accent="blue" />
          <Tile label="Quiz дунд. бодолт (Уламж.)" value={fmtMs(qLg.avgMs)} accent="amber" />
        </div>
      </section>

      {/* Observation dashboard */}
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-base font-semibold text-slate-900">Ажиглалт</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Нийт {obs.length} ажиглалт · Severity нийлбэр {obsTotalSeverity}
          {' · '}Mazy session: {obsByCond.get('Mazy') ?? 0}
          {' · '}Legacy session: {obsByCond.get('Legacy') ?? 0}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {([
            ['hesitation',  'Танин мэдэхүйн саатал', 'bg-amber-50'],
            ['misclick',    'Буруу даралт',          'bg-red-50'],
            ['frustration', 'Бухимдал',              'bg-rose-50'],
            ['positive',    'Эерэг дохио',           'bg-teal-50'],
            ['behavioral',  'Зан төлвийн дохио',     'bg-orange-50'],
            ['vocal',       'Аман дохио',            'bg-purple-50'],
          ] as const).map(([k, lbl, bg]) => (
            <div key={k} className={`rounded-xl ${bg} p-3 ring-1 ring-slate-200`}>
              <p className="text-[10px] uppercase text-slate-600">{lbl}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{obsByType.get(k) ?? 0}</p>
            </div>
          ))}
        </div>
        {obs.length > 0 && (
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer text-xs text-slate-500">Бүх ажиглалтыг харах</summary>
            <table className="mt-2 w-full text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
                <tr>
                  <th className="px-2 py-1 text-left">Нөхцөл</th>
                  <th className="px-2 py-1 text-left">Дэлгэц</th>
                  <th className="px-2 py-1 text-left">Төрөл</th>
                  <th className="px-2 py-1 text-right">Sev</th>
                  <th className="px-2 py-1 text-left">Quote</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {obs.map((e, i) => (
                  <tr key={`${e.event_id}:${i}`}>
                    <td className="px-2 py-1">{e.condition}</td>
                    <td className="px-2 py-1">{e.screen ?? '—'}</td>
                    <td className="px-2 py-1">{e.event_type}</td>
                    <td className="px-2 py-1 text-right">{e.severity ?? '—'}</td>
                    <td className="px-2 py-1 italic text-slate-700">{e.verbatim || e.notes || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        )}
      </section>

      {/* Likert (new) */}
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-base font-semibold text-slate-900">Likert судалгаа · Mazy vs Уламжлалт</h2>
        {likertResponses.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">Хариулаагүй.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Асуулт</th>
                  {likertResponses.map((lr) => (
                    <th key={lr.id} className="px-3 py-2 text-right">{lr.variant}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {LIKERT_LABELS.map(({ key, label }) => (
                  <tr key={key}>
                    <td className="px-3 py-2">{label}</td>
                    {likertResponses.map((lr) => {
                      const v = (lr.answers as any)[key];
                      return <td key={lr.id} className="px-3 py-2 text-right tabular-nums">{v ?? '—'}</td>;
                    })}
                  </tr>
                ))}
                {(['B1_liked', 'B2_improve', 'B3_extra'] as const).map((k) => (
                  <tr key={k}>
                    <td className="px-3 py-2">{k}</td>
                    {likertResponses.map((lr) => {
                      const v = (lr.answers as any)[k] as string | undefined;
                      return (
                        <td key={lr.id} className="px-3 py-2 italic text-slate-700">
                          {v && v.trim() ? `“${v}”` : <span className="text-slate-300">—</span>}
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

      {/* Survey (old Q1-Q7) */}
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-base font-semibold text-slate-900">Хуучин Post-session асуулга</h2>
        {!survey ? (
          <p className="mt-2 text-sm text-slate-400">Хариулаагүй.</p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {SURVEY_LABELS.map(({ key, label }) => (
              <div key={key} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <p className="text-[10px] uppercase text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
                  {String((survey.answers as any)[key] ?? '—')}
                </p>
              </div>
            ))}
            <div className="col-span-2 sm:col-span-5 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
              <p className="text-[10px] uppercase text-slate-500">Q6 · Чөлөөт санал</p>
              <p className="mt-1 text-sm italic text-slate-800">
                {(survey.answers as any).q6_open_feedback || <span className="text-slate-400">—</span>}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Quiz answers (detail) */}
      {quizAnswers.length > 0 && (
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-base font-semibold text-slate-900">Quiz хариултууд</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Хичээл</th>
                  <th className="px-3 py-2 text-left">Асуулт</th>
                  <th className="px-3 py-2 text-left">Сонгосон</th>
                  <th className="px-3 py-2 text-left">Үр дүн</th>
                  <th className="px-3 py-2 text-right">Хугацаа</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quizAnswers.map((a) => (
                  <tr key={a.id}>
                    <td className="px-3 py-2 text-slate-700">{lessonName(a.lesson_id)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{a.question_key}</td>
                    <td className="px-3 py-2">{a.selected_key}</td>
                    <td className="px-3 py-2">
                      {a.is_correct
                        ? <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">✓ Зөв</span>
                        : <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-800">✗ Буруу</span>}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-500">{fmtMs(a.time_to_answer_ms)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <footer className="pt-4 text-center text-xs text-slate-400">
        Mazy Admin · {new Date().toLocaleString('mn-MN')}
      </footer>
    </main>
  );
}

function CondMini({ title, color, agg }: {
  title: string;
  color: 'blue' | 'amber';
  agg: { attempts: number; correct: number; wrong: number; accuracy: number; totalMs: number; avgMs: number };
}) {
  const bg = color === 'blue' ? 'bg-blue-50/60 ring-blue-200' : 'bg-amber-50/60 ring-amber-200';
  const t  = color === 'blue' ? 'text-blue-800' : 'text-amber-800';
  return (
    <div className={`rounded-xl p-4 ring-2 ${bg}`}>
      <h3 className={`text-sm font-bold ${t}`}>{title}</h3>
      <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
        <div><p className="text-[10px] uppercase text-slate-500">Оролдлого</p><p className="font-bold tabular-nums text-slate-900">{agg.attempts}</p></div>
        <div><p className="text-[10px] uppercase text-slate-500">Зөв</p><p className="font-bold tabular-nums text-emerald-700">{agg.correct}</p></div>
        <div><p className="text-[10px] uppercase text-slate-500">Буруу</p><p className="font-bold tabular-nums text-red-600">{agg.wrong}</p></div>
        <div className="col-span-3">
          <p className="text-[10px] uppercase text-slate-500">Нарийвчлал</p>
          <p className={`font-bold tabular-nums ${agg.accuracy >= 0.7 ? 'text-emerald-700' : agg.accuracy >= 0.4 ? 'text-amber-700' : 'text-red-600'}`}>
            {agg.attempts > 0 ? `${Math.round(agg.accuracy * 100)}%` : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent: 'blue' | 'amber' }) {
  const bg = accent === 'blue' ? 'bg-blue-50' : 'bg-amber-50';
  return (
    <div className={`rounded-xl ${bg} p-3 ring-1 ring-slate-200`}>
      <p className="text-[10px] uppercase text-slate-600">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}
