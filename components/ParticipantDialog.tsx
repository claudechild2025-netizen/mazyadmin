'use client';

import { useEffect, useState } from 'react';
import { X, Eye, ListChecks, Activity } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { ObservationPopup } from '@/components/ObservationPopup';
import { getParticipantDetail } from '@/lib/queries';

type Detail = Awaited<ReturnType<typeof getParticipantDetail>>;

export function ParticipantDialog({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setData(await getParticipantDetail(userId));
      } catch (err: any) {
        setError(err.message ?? String(err));
      } finally {
        setLoading(false);
      }
    })();
    
    // Disable body scroll
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [userId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="relative w-full max-w-6xl bg-slate-50 rounded-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-white shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Оролцогч: 
              <code className="px-2 py-0.5 bg-slate-100 rounded text-base font-mono font-medium">
                {data?.user ? (data.user as any).display_name || userId.slice(0, 8) : userId.slice(0, 8)}
              </code>
            </h2>
            {data?.user && (
              <p className="mt-1 text-xs text-slate-500">
                Анги: {(data.user as any).grade ?? '—'} · Түвшин: {translateLevel((data.user as any).knowledge_level)} · Эхэлсэн: {new Date((data.user as any).created_at).toLocaleString('mn-MN')}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="py-20 text-center text-sm text-slate-500">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite] opacity-50 mb-3"></div>
              <p>Мэдээллийг уншиж байна...</p>
            </div>
          )}
          {error && <div className="py-20 text-center text-sm text-red-600">Алдаа: {error}</div>}
          
          {data && !loading && <DialogContent data={data} />}
        </div>
      </div>
    </div>
  );
}

function DialogContent({ data }: { data: Detail }) {
  const user = data.user;
  const screenViews = data.screenViews;
  const quizAnswers = data.quizAnswers;
  const susResponses = data.susResponses;
  const practiceAttempts = (data as any).practiceAttempts ?? [];
  const survey = (data as any).survey as
    | { id: number; answers: Record<string, unknown>; submitted_at: string }
    | null;
  const likertResponses = ((data as any).likertResponses ?? []) as {
    id: number;
    variant: string;
    answers: Record<string, unknown>;
    submitted_at: string;
  }[];

  const correctCount = quizAnswers.filter((a: any) => a.is_correct).length;
  const isLabSlug = (slug: string) =>
    slug?.startsWith('lab:') || slug?.startsWith('lesson_lab:');
  const labMs = screenViews
    .filter((v: any) => isLabSlug(v.screen_slug))
    .reduce((acc: number, v: any) => acc + (v.time_spent_ms ?? 0), 0);

  const [tab, setTab] = useState<'detail' | 'observation'>('detail');

  const participantName =
    (user as any)?.display_name || (user as any)?.client_uid?.slice(0, 8) || 'unknown';

  return (
    <>
      {/* Tab switcher */}
      <div className="flex gap-1 rounded-xl bg-white p-1 ring-1 ring-slate-200 w-fit">
        <button
          onClick={() => setTab('detail')}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === 'detail'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Дэлгэрэнгүй
        </button>
        <button
          onClick={() => setTab('observation')}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === 'observation'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Ажиглалт
        </button>
      </div>

      {tab === 'observation' ? (
        <ObservationPopup
          embedded
          participantId={participantName}
          participantLabel={participantName}
          grade={(user as any)?.grade ?? null}
        />
      ) : (
      <>
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
                  {v.time_spent_ms != null ? v.time_spent_ms.toLocaleString('mn-MN') : '—'}
                </Td>
              </tr>
            ))}
            <EmptyRow show={screenViews.length === 0} cols={3} />
          </tbody>
        </table>
      </Section>

      <Section title="Quiz хариултууд" subtitle="quiz_answers — асуулт тус бүрд">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <Th>Хичээл</Th>
              <Th>Асуулт (key)</Th>
              <Th>Сонгосон</Th>
              <Th>Үр дүн</Th>
              <Th className="text-right">Хугацаа (мс)</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {quizAnswers.map((a: any, i: number) => (
              <tr key={a.id ?? i} className="hover:bg-slate-50">
                <Td className="text-slate-500">{a.lesson_id ?? '—'}</Td>
                <Td><code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{a.question_key ?? '—'}</code></Td>
                <Td className="tabular">{a.selected_key ?? '—'}</Td>
                <Td>
                  {a.is_correct ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">✓ Зөв</span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Буруу</span>
                  )}
                </Td>
                <Td className="tabular text-right">
                  {a.time_to_answer_ms != null ? a.time_to_answer_ms.toLocaleString('mn-MN') : '—'}
                </Td>
              </tr>
            ))}
            <EmptyRow show={quizAnswers.length === 0} cols={5} />
          </tbody>
        </table>
      </Section>

      <Section title="Дасгалын оролдлого" subtitle="practice_attempts — Phase 3">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <Th>Хичээл</Th>
              <Th>Drill</Th>
              <Th className="text-right">Зөв</Th>
              <Th className="text-right">Буруу</Th>
              <Th className="text-right">Хугацаа</Th>
              <Th>Дууссан</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {practiceAttempts.map((p: any, i: number) => (
              <tr key={p.id ?? i} className="hover:bg-slate-50">
                <Td className="text-slate-500">{p.lesson_id ?? '—'}</Td>
                <Td><code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{p.drill_id ?? '—'}</code></Td>
                <Td className="tabular text-right">{p.correct_count}</Td>
                <Td className="tabular text-right">{p.wrong_count}</Td>
                <Td className="tabular text-right">{p.duration_ms != null ? p.duration_ms.toLocaleString('mn-MN') : '—'}</Td>
                <Td className="text-slate-500">{p.completed_at ? new Date(p.completed_at).toLocaleString('mn-MN') : '—'}</Td>
              </tr>
            ))}
            <EmptyRow show={practiceAttempts.length === 0} cols={6} />
          </tbody>
        </table>
      </Section>

      <Section
        title="Санал асуулга"
        subtitle={survey ? `Илгээсэн: ${new Date(survey.submitted_at).toLocaleString('mn-MN')}` : 'Асуулгад хариулаагүй'}
      >
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr><Th>Асуулт</Th><Th>Хариулт</Th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {survey ? (
              SURVEY_QUESTIONS.map((q) => {
                const raw = (survey.answers as any)[q.key];
                return (
                  <tr key={q.key} className="hover:bg-slate-50 align-top">
                    <Td>
                      <div className="text-slate-900">{q.label_mn}</div>
                      <div className="text-xs text-slate-500"><code className="rounded bg-slate-100 px-1 py-0.5">{q.key}</code></div>
                    </Td>
                    <Td>{renderSurveyAnswer(q.kind, raw)}</Td>
                  </tr>
                );
              })
            ) : <EmptyRow show cols={2} />}
          </tbody>
        </table>
      </Section>

      <Section
        title="Likert судалгаа · Mazy vs Legacy"
        subtitle={
          likertResponses.length > 0
            ? `${likertResponses.length} variant хариулсан`
            : 'Likert судалгаанд хариулаагүй'
        }
      >
        {likertResponses.length === 0 ? (
          <table className="w-full text-sm"><tbody><EmptyRow show cols={2} /></tbody></table>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <Th>Асуулт</Th>
                {likertResponses.map((lr) => (
                  <Th key={lr.id} className="text-right">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                        lr.variant.toLowerCase().includes('mazy')
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {lr.variant}
                    </span>
                  </Th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {LIKERT_QUESTIONS.map((q) => (
                <tr key={q.key} className="hover:bg-slate-50 align-top">
                  <Td>
                    <div className="text-slate-900">{q.label_mn}</div>
                    <div className="text-xs text-slate-500"><code className="rounded bg-slate-100 px-1 py-0.5">{q.key}</code></div>
                  </Td>
                  {likertResponses.map((lr) => (
                    <Td key={lr.id} className="align-top">
                      {renderSurveyAnswer(q.kind, (lr.answers as any)[q.key])}
                    </Td>
                  ))}
                </tr>
              ))}
              <tr className="bg-slate-50">
                <Td className="text-xs text-slate-500">Илгээсэн</Td>
                {likertResponses.map((lr) => (
                  <Td key={lr.id} className="text-xs text-slate-500">
                    {new Date(lr.submitted_at).toLocaleString('mn-MN')}
                  </Td>
                ))}
              </tr>
            </tbody>
          </table>
        )}
      </Section>
      </>
      )}
    </>
  );
}

/* Helpers */
const LIKERT_QUESTIONS: { key: string; label_mn: string; kind: 'likert' | 'text' | 'consent' }[] = [
  { key: 'L1_clarity',         label_mn: 'L1 · Ойлгомжтой байдал',         kind: 'likert' },
  { key: 'L2_info_density',    label_mn: 'L2 · Мэдээллийн хэмжээ',         kind: 'likert' },
  { key: 'L3_lesson_length',   label_mn: 'L3 · Хичээлийн урт',             kind: 'likert' },
  { key: 'L4_reuse',           label_mn: 'L4 · Давтан хэрэглэх',           kind: 'likert' },
  { key: 'L5_recommend',       label_mn: 'L5 · Санал болгох',              kind: 'likert' },
  { key: 'L6_confidence',      label_mn: 'L6 · Итгэлтэй байдал',           kind: 'likert' },
  { key: 'L7_cognitive_load',  label_mn: 'L7 · Танин мэдэхүйн ачаалал',    kind: 'likert' },
  { key: 'B1_liked',           label_mn: 'Б1 · Хамгийн таалагдсан тал',    kind: 'text' },
  { key: 'B2_improve',         label_mn: 'Б2 · Сайжруулах зүйл',           kind: 'text' },
  { key: 'B3_extra',           label_mn: 'Б3 · Нэмэлт санал',              kind: 'text' },
];

const SURVEY_QUESTIONS: { key: string; label_mn: string; kind: 'likert' | 'text' | 'consent'; }[] = [
  { key: 'q1_motion_graphic',       label_mn: 'Q1 · Хөдөлгөөнт график таалагдсан уу?',       kind: 'likert' },
  { key: 'q2_visual_clarity',       label_mn: 'Q2 · Дэлгэц цэвэрхэн харагдаж байсан уу?',     kind: 'likert' },
  { key: 'q3_navigation',           label_mn: 'Q3 · Навигаци ойлгомжтой байсан уу?',          kind: 'likert' },
  { key: 'q4_color_palette',        label_mn: 'Q4 · Өнгөний сонголт яаж санагдсан бэ?',       kind: 'likert' },
  { key: 'q5_mascot_microlearning', label_mn: 'Q5 · Мазаалай ба богино хичээл хэр үр дүнтэй?', kind: 'likert' },
  { key: 'q6_open_feedback',        label_mn: 'Q6 · Чөлөөт санал хүсэлт',                     kind: 'text' },
  { key: 'q7_consent',              label_mn: 'Q7 · Дараагийн судалгаанд оролцох уу?',        kind: 'consent' },
];

function renderSurveyAnswer(kind: 'likert' | 'text' | 'consent', raw: unknown): React.ReactNode {
  if (raw === undefined || raw === null || raw === '') return <span className="text-slate-400">—</span>;
  if (kind === 'likert') {
    const n = Number(raw);
    if (!Number.isFinite(n)) return String(raw);
    return (
      <span className="inline-flex items-center gap-2">
        <span className="font-semibold text-slate-900 tabular">{n} / 5</span>
        <span className="inline-flex gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <span key={i} className={`h-2 w-3 rounded-sm ${i <= n ? 'bg-blue-500' : 'bg-slate-200'}`} />
          ))}
        </span>
      </span>
    );
  }
  if (kind === 'text') return <span className="text-slate-700">{String(raw)}</span>;
  const c = raw as { consent?: string; contact?: string };
  return (
    <div className="space-y-1">
      <div>{c.consent === 'yes' ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">✓ Тийм</span> : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{c.consent ?? '—'}</span>}</div>
      {c.contact && <div className="text-xs text-slate-500">Холбоо: <span className="font-medium text-slate-700">{c.contact}</span></div>}
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode; }) {
  return (
    <div className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="p-4 border-b border-slate-100">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string; }) {
  return <th className={`px-4 py-3 text-left font-medium ${className}`}>{children}</th>;
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string; }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}

function EmptyRow({ show, cols }: { show: boolean; cols: number }) {
  if (!show) return null;
  return <tr><td colSpan={cols} className="py-8 text-center text-sm text-slate-500">Өгөгдөл байхгүй.</td></tr>;
}

function translateLevel(level: string | null | undefined): string {
  if (!level) return '—';
  return { novice: 'Шинэхэн', some: 'Зарим', confident: 'Сайн' }[level] ?? level;
}
