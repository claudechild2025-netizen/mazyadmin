'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Eye, ListChecks, Activity, Trash2 } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { getParticipantDetail } from '@/lib/queries';
import { deleteUserAction } from '@/app/actions';

type Detail = Awaited<ReturnType<typeof getParticipantDetail>>;

export default function ParticipantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setData(await getParticipantDetail(id));
      } catch (err: any) {
        setError(err.message ?? String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

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

  const user = data!.user;
  const screenViews = data!.screenViews;
  const quizAnswers = data!.quizAnswers;
  const susResponses = data!.susResponses;
  const practiceAttempts = (data as any)!.practiceAttempts ?? [];
  const survey = (data as any)!.survey as
    | { id: number; answers: Record<string, unknown>; submitted_at: string }
    | null;

  const correctCount = quizAnswers.filter((a: any) => a.is_correct).length;
  const isLabSlug = (slug: string) =>
    slug?.startsWith('lab:') || slug?.startsWith('lesson_lab:');
  const labMs = screenViews
    .filter((v: any) => isLabSlug(v.screen_slug))
    .reduce((acc: number, v: any) => acc + (v.time_spent_ms ?? 0), 0);

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft size={14} />
            Бүх оролцогч руу буцах
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            Оролцогч{' '}
            <code className="rounded bg-slate-100 px-2 py-0.5 text-lg">
              {(user as any)?.display_name || id.slice(0, 8)}
            </code>
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {user
              ? `Анги ${(user as any).grade ?? '—'} · Түвшин ${translateLevel((user as any).knowledge_level)} · Эхэлсэн ${new Date((user as any).created_at).toLocaleString('mn-MN')}`
              : 'Энэ ID-тай оролцогч олдсонгүй.'}
          </p>
        </div>
        {user && (
          <button
            onClick={async () => {
              if (confirm('Энэ хэрэглэгчийг устгах уу? Энэ үйлдэл буцаагдахгүй.')) {
                try {
                  await deleteUserAction(user.id);
                  window.location.href = '/';
                } catch (err: any) {
                  alert('Алдаа: ' + err.message + '\n(SUPABASE_SERVICE_ROLE_KEY тохируулагдсан эсэхийг шалгана уу)');
                }
              }
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
          >
            <Trash2 size={16} />
            Хэрэглэгчийг устгах
          </button>
        )}
      </header>

      {/* 1 stat card row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Дэлгэц үзсэн"
          value={screenViews.length}
          icon={<Eye size={18} />}
          hint="screen_views"
        />
        <StatCard
          label="Quiz зөв"
          value={`${correctCount}/${quizAnswers.length}`}
          icon={<ListChecks size={18} />}
          hint="зөв / нийт"
        />
        <StatCard
          label="Лаб дахь хугацаа"
          value={`${(labMs / 1000).toFixed(0)}с`}
          icon={<Activity size={18} />}
          hint="Интерактив дэлгэц"
        />
        <StatCard
          label="SUS хариулт"
          value={`${susResponses.length}/10`}
          icon={<Activity size={18} />}
          hint="асуултын тоо"
        />
      </div>

      {/* Table 1 — screen_views */}
      <Section title="Дэлгэц үзэлтүүд" subtitle="screen_views — дараалсан он-цагаар">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <Th>Дэлгэц (slug)</Th>
              <Th>Үзсэн цаг</Th>
              <Th className="text-right">Хугацаа (мс)</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {screenViews.map((v: any, i: number) => (
              <tr key={v.id ?? i} className="hover:bg-slate-50">
                <Td>
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                    {v.screen_slug}
                  </code>
                </Td>
                <Td className="text-slate-500">
                  {v.viewed_at ? new Date(v.viewed_at).toLocaleString('mn-MN') : '—'}
                </Td>
                <Td className="tabular text-right">
                  {v.time_spent_ms !== null && v.time_spent_ms !== undefined
                    ? v.time_spent_ms.toLocaleString('mn-MN')
                    : '—'}
                </Td>
              </tr>
            ))}
            <EmptyRow show={screenViews.length === 0} cols={3} />
          </tbody>
        </table>
      </Section>

      {/* Table 2 — quiz_answers */}
      <Section title="Quiz хариултууд" subtitle="quiz_answers — асуулт тус бүрд">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <Th>Хичээл</Th>
              <Th>Асуулт (key)</Th>
              <Th>Сонгосон</Th>
              <Th>Үр дүн</Th>
              <Th className="text-right">Бодолтын хугацаа (мс)</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {quizAnswers.map((a: any, i: number) => (
              <tr key={a.id ?? i} className="hover:bg-slate-50">
                <Td className="text-slate-500">{a.lesson_id ?? '—'}</Td>
                <Td>
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                    {a.question_key ?? '—'}
                  </code>
                </Td>
                <Td className="tabular">{a.selected_key ?? '—'}</Td>
                <Td>
                  {a.is_correct ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                      ✓ Зөв
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      Буруу
                    </span>
                  )}
                </Td>
                <Td className="tabular text-right">
                  {a.time_to_answer_ms !== null && a.time_to_answer_ms !== undefined
                    ? a.time_to_answer_ms.toLocaleString('mn-MN')
                    : '—'}
                </Td>
              </tr>
            ))}
            <EmptyRow show={quizAnswers.length === 0} cols={5} />
          </tbody>
        </table>
      </Section>

      {/* Table 3 — sus_responses */}
      <Section title="SUS асуулгын хариултууд" subtitle="sus_responses — 1..5 Likert">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <Th>Асуулт №</Th>
              <Th className="text-right">Хариулт (1–5)</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {susResponses.map((s: any, i: number) => (
              <tr key={s.id ?? i} className="hover:bg-slate-50">
                <Td className="tabular">{s.question_number}</Td>
                <Td className="tabular text-right">{s.response ?? '—'}</Td>
              </tr>
            ))}
            <EmptyRow show={susResponses.length === 0} cols={2} />
          </tbody>
        </table>
      </Section>

      {/* Table 4 — practice_attempts (v5) */}
      <Section title="Дасгалын оролдлого" subtitle="practice_attempts — Phase 3 drill бүрийн дүн">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <Th>Хичээл</Th>
              <Th>Drill</Th>
              <Th>Төрөл</Th>
              <Th className="text-right">Зөв</Th>
              <Th className="text-right">Буруу</Th>
              <Th className="text-right">Хугацаа (мс)</Th>
              <Th>Дууссан</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {practiceAttempts.map((p: any, i: number) => (
              <tr key={p.id ?? i} className="hover:bg-slate-50">
                <Td className="text-slate-500">{p.lesson_id ?? '—'}</Td>
                <Td>
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                    {p.drill_id ?? '—'}
                  </code>
                </Td>
                <Td className="text-slate-500">{p.drill_kind ?? '—'}</Td>
                <Td className="tabular text-right">{p.correct_count}</Td>
                <Td className="tabular text-right">{p.wrong_count}</Td>
                <Td className="tabular text-right">
                  {p.duration_ms != null ? p.duration_ms.toLocaleString('mn-MN') : '—'}
                </Td>
                <Td className="text-slate-500">
                  {p.completed_at ? new Date(p.completed_at).toLocaleString('mn-MN') : '—'}
                </Td>
              </tr>
            ))}
            <EmptyRow show={practiceAttempts.length === 0} cols={7} />
          </tbody>
        </table>
      </Section>

      {/* Table 5 — survey responses (per-question answers) */}
      <Section
        title="Санал асуулгын хариулт"
        subtitle={
          survey
            ? `7 асуултын хариу · илгээсэн ${new Date(survey.submitted_at).toLocaleString('mn-MN')}`
            : 'survey_responses — энэ оролцогч асуулгад хариулаагүй'
        }
      >
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <Th>Асуулт</Th>
              <Th>Хариулт</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {survey ? (
              SURVEY_QUESTIONS.map((q) => {
                const raw = (survey.answers as any)[q.key];
                return (
                  <tr key={q.key} className="hover:bg-slate-50 align-top">
                    <Td>
                      <div className="text-slate-900">{q.label_mn}</div>
                      <div className="text-xs text-slate-500">
                        <code className="rounded bg-slate-100 px-1 py-0.5">{q.key}</code>
                      </div>
                    </Td>
                    <Td>{renderSurveyAnswer(q.kind, raw)}</Td>
                  </tr>
                );
              })
            ) : (
              <EmptyRow show cols={2} />
            )}
          </tbody>
        </table>
      </Section>
    </main>
  );
}

const SURVEY_QUESTIONS: {
  key: string;
  label_mn: string;
  kind: 'likert' | 'text' | 'consent';
}[] = [
  { key: 'q1_motion_graphic',       label_mn: 'Q1 · Хөдөлгөөнт график таалагдсан уу?',       kind: 'likert' },
  { key: 'q2_visual_clarity',       label_mn: 'Q2 · Дэлгэц цэвэрхэн харагдаж байсан уу?',     kind: 'likert' },
  { key: 'q3_navigation',           label_mn: 'Q3 · Навигаци ойлгомжтой байсан уу?',          kind: 'likert' },
  { key: 'q4_color_palette',        label_mn: 'Q4 · Өнгөний сонголт яаж санагдсан бэ?',       kind: 'likert' },
  { key: 'q5_mascot_microlearning', label_mn: 'Q5 · Мазаалай ба богино хичээл хэр үр дүнтэй?', kind: 'likert' },
  { key: 'q6_open_feedback',        label_mn: 'Q6 · Чөлөөт санал хүсэлт',                     kind: 'text' },
  { key: 'q7_consent',              label_mn: 'Q7 · Дараагийн судалгаанд оролцох уу?',        kind: 'consent' },
];

function renderSurveyAnswer(
  kind: 'likert' | 'text' | 'consent',
  raw: unknown,
): React.ReactNode {
  if (raw === undefined || raw === null || raw === '') {
    return <span className="text-slate-400">—</span>;
  }
  if (kind === 'likert') {
    const n = Number(raw);
    if (!Number.isFinite(n)) return String(raw);
    return (
      <span className="inline-flex items-center gap-2">
        <span className="font-semibold text-slate-900 tabular">{n} / 5</span>
        <LikertBar value={n} />
      </span>
    );
  }
  if (kind === 'text') {
    return <span className="text-slate-700">{String(raw)}</span>;
  }
  // consent
  const c = raw as { consent?: string; contact?: string };
  return (
    <div className="space-y-1">
      <div>
        {c.consent === 'yes' ? (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
            ✓ Тийм
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            {c.consent ?? '—'}
          </span>
        )}
      </div>
      {c.contact && (
        <div className="text-xs text-slate-500">
          Холбоо: <span className="font-medium text-slate-700">{c.contact}</span>
        </div>
      )}
    </div>
  );
}

function LikertBar({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          aria-hidden
          className={`h-2 w-3 rounded-sm ${
            i <= value ? 'bg-blue-500' : 'bg-slate-200'
          }`}
        />
      ))}
    </span>
  );
}

/* --- subcomponents (mirrors app/page.tsx + ParticipantTable.tsx style) --- */

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="p-5 pb-4">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function Th({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <th className={`px-3 py-3 text-left ${className}`}>{children}</th>;
}

function Td({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-3 py-3 ${className}`}>{children}</td>;
}

function EmptyRow({ show, cols }: { show: boolean; cols: number }) {
  if (!show) return null;
  return (
    <tr>
      <td colSpan={cols} className="py-12 text-center text-sm text-slate-500">
        Өгөгдөл байхгүй.
      </td>
    </tr>
  );
}

function translateLevel(level: string | null | undefined): string {
  if (!level) return '—';
  return (
    {
      novice: 'Шинэхэн',
      some: 'Зарим',
      confident: 'Сайн',
    }[level] ?? level
  );
}
