'use client';

import { useEffect, useState } from 'react';
import { Users, CheckCircle2, Activity, Timer, FlaskConical, Download, Printer } from 'lucide-react';
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
  getQuizQuestionStats,
  getTimingComparison,
  fetchAllObservationEvents,
  deleteObservationEvents,
  type TimingRow,
  type ObservationEventUpload,
  type FunnelStep,
  type ParticipantRow,
  type ScreenAnalyticRow,
  type PracticeDrillRow,
  type SurveyResponse,
  type SurveyMeans,
  type LikertResponse,
  type LikertMeans,
  type QuizQuestionStat,
} from '@/lib/queries';

const LESSON_NAMES: Record<string, string> = {
  propagation: 'Гэрлийн тархалт',
  speed:       'Гэрлийн хурд',
  reflection:  'Гэрлийн ойлт',
  lenses:      'Бөмбөлөг толь ба линз',
  refraction:  'Гэрлийн хугарал',
  prism:       'Призм ба дисперс',
  'lens-eye':  'Линз ба Хүний нүд',
  legacy:      'Уламжлалт',
};

const QUIZ_PROMPTS: Record<string, Record<string, string>> = {
  propagation: {
    q1: 'Гэрэл нэг төрлийн орчинд хэрхэн тархах вэ?',
  },
  speed: {
    q1: 'Вакуумд (хоосон огторгуйд) гэрлийн хурд (c) ойролцоогоор хэд вэ?',
    q2: 'Гэрэл агаараас усанд орохдоо хурд нь хэрхэн өөрчлөгдөх вэ?',
    q3: 'Физо гэрлийн хурдыг тооцох томьёо c = 4·N·n·L-д "N" нь юу вэ?',
  },
  reflection: {
    q1: 'Тусах өнцөг 35° байх үед ойлтын өнцөг хэдэн градус байх вэ?',
    q2: 'Бүх өнцөг алинаас хэмжигддэг вэ?',
    q3: 'Гэрлийн ойлтын хууль аль гадаргуунд үйлчлэх вэ?',
  },
  lenses: {
    q1: 'Хүнхэр толинд параллел туссан цацраг ойсныхоо дараа хаагуур очих вэ?',
    q2: 'Бөмбөлөг толины томьёо аль нь вэ?',
    q3: 'Машины ар талын толь ямар толь вэ?',
  },
  refraction: {
    q1: 'Снеллийн хуулийг илэрхийлэх зөв томьёо аль нь вэ?',
    q2: 'Бүрэн дотоод ойлт хэзээ үүсэх вэ?',
    q3: 'Гэрэл нягт орчноос сийрэг рүү орохдоо хэрхэн хугарах вэ?',
  },
  prism: {
    q1: 'Цагаан гэрлийг призмээр нэвтрүүлбэл юу болох вэ?',
    q2: 'Дисперс гэж юу вэ?',
    q3: 'Солонго юунаас үүсдэг вэ?',
  },
  'lens-eye': {
    q1: 'Гүдгэр (+) линзний онцлог аль нь вэ?',
    q2: 'Оптик хүчийг (диоптри) тооцох томьёо аль нь вэ?',
    q3: 'Миопи (ойрын хараа) гажгийг ямар линзээр засдаг вэ?',
  },
  legacy: {
    'lq-01': 'Гэрэл вакуумд хэдэн км/с хурдтай тархдаг вэ?',
    'lq-02': 'Физогийн томьёонд N = 720, n = 12.6 эргэлт/с, l = 8 633 м бол c = 4·N·n·l томьёогоор хэд гарах вэ?',
    'lq-03': 'Тусах өнцөг 35° бол ойлтын өнцөг хэд вэ?',
    'lq-04': 'Биеийн өндөр 1.6 м бол биеийн бүрэн дүрсийг харахын тулд хавтгай толь хамгийн багадаа хэдэн метр өндөртэй байх шаардлагатай вэ?',
    'lq-05': 'Хүнхэр толинд бие нь фокусын цэгээс гадуур (a > f) байвал ямар дүрс үүсдэг вэ?',
    'lq-06': 'n = c/v томьёонд v = 2 × 10⁸ м/с бол n хэд вэ?',
    'lq-07': 'Усны хугарлын илтгэлцүүр 1.33 бол усны эгзэгтэй өнцгийг тооцоолно уу.',
    'lq-08': 'Призмээр нарны цагаан гэрэл хэдэн өнгөнд задардаг вэ?',
    'lq-09': 'Фокусын зай нь 0.5 м цуглуулагч линзний оптик хүч хэд вэ?',
    'lq-10': 'Холын зүйлийг тод харж чаддаггүй нүдийг (миопи) засахын тулд ямар линзтэй шил зүүх шаардлагатай вэ?',
    // legacy quiz page tracks as legacy_q1, legacy_q2, legacy_q3 (3 items only)
    legacy_q1: 'Уламжлалт сорил · 1-р асуулт',
    legacy_q2: 'Уламжлалт сорил · 2-р асуулт',
    legacy_q3: 'Уламжлалт сорил · 3-р асуулт',
  },
};

function quizPrompt(lessonId: string | null, questionKey: string): string | null {
  if (!lessonId) return null;
  return QUIZ_PROMPTS[lessonId]?.[questionKey] ?? null;
}

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

type Tab = 'overview' | 'participants' | 'quiz' | 'observation' | 'survey';

const TABS: Tab[] = ['overview', 'participants', 'quiz', 'observation', 'survey'];
const isTab = (v: string): v is Tab => (TABS as string[]).includes(v);

function readTabFromHash(): Tab {
  if (typeof window === 'undefined') return 'overview';
  const h = window.location.hash.replace(/^#/, '');
  return isTab(h) ? h : 'overview';
}

export default function Dashboard() {
  const [tab, setTabState] = useState<Tab>('overview');
  const [surveyTab, setSurveyTab] = useState<'new' | 'old'>('new');

  // Sync tab ↔ URL hash so refresh preserves the active tab
  useEffect(() => {
    setTabState(readTabFromHash());
    const onHash = () => setTabState(readTabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const setTab = (next: Tab) => {
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${next}`);
    }
    setTabState(next);
  };
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
  const [quizStats, setQuizStats] = useState<QuizQuestionStat[]>([]);
  const [timingRows, setTimingRows] = useState<TimingRow[]>([]);
  const [observations, setObservations] = useState<ObservationEventUpload[]>([]);
  const [selectedObs, setSelectedObs] = useState<Set<string>>(new Set());
  const [obsDeleting, setObsDeleting] = useState(false);
  const obsKey = (e: ObservationEventUpload) => `${e.participant_id}::${e.condition}::${e.event_id}`;
  const toggleObs = (k: string) => {
    setSelectedObs((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  };
  const bulkDeleteObs = async () => {
    if (selectedObs.size === 0) return;
    if (!confirm(`${selectedObs.size} ажиглалтыг устгах уу?`)) return;
    setObsDeleting(true);
    const rows = observations
      .filter((e) => selectedObs.has(obsKey(e)))
      .map((e) => ({ participant_id: e.participant_id, condition: e.condition, event_id: e.event_id }));
    const res = await deleteObservationEvents(rows);
    setObsDeleting(false);
    if (res.errors.length > 0) {
      alert(`Зарим устгал амжилтгүй:\n${res.errors.slice(0, 5).join('\n')}`);
    }
    // Reload observations
    try {
      const fresh = await fetchAllObservationEvents();
      setObservations(fresh);
    } catch {}
    setSelectedObs(new Set());
  };

  useEffect(() => {
    (async () => {
      try {
        const [total, completed, sus, quizMs, labMs, fnl, sAnalytics, pDrills, parts, sMeans, sRows, lRows, lMeans, qStats, timing, obsEvents] =
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
            getQuizQuestionStats().catch(() => []),
            getTimingComparison().catch(() => ({ rows: [] as TimingRow[], summary: null as any })),
            fetchAllObservationEvents().catch(() => [] as ObservationEventUpload[]),
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
        setQuizStats(qStats);
        setTimingRows(timing.rows);
        setObservations(obsEvents);
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
    { id: 'quiz',         label: 'Quiz',          badge: quizStats.length },
    { id: 'observation',  label: 'Ажиглалт',      badge: observations.length },
    { id: 'survey',       label: 'Санал асуулга', badge: likertRows.length },
  ];

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-8">
      {/* Header */}
      <header className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mazy Admin</h1>
          <p className="mt-1 text-sm text-slate-600">
            Тестийн өгөгдлийн самбар · {new Date().toLocaleString('mn-MN')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadAllCsv({
              participants, surveyRows, likertRows, quizStats, timingRows, screenAnalytics, observations,
            })}
            title="Бүх өгөгдлийг ZIP-гүй CSV байдлаар татна"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            <Download size={14} /> CSV (бүгд)
          </button>
          <button
            onClick={() => window.print()}
            title="Идэвхтэй tab-ыг тайланд зориулж PDF болгож хэвлэнэ"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            <Printer size={14} /> PDF
          </button>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            ↻ Шинэчлэх
          </button>
        </div>
      </header>

      {/* Print-only title (visible only when printing) */}
      <div className="hidden print:block">
        <h1 className="text-2xl font-bold">Mazy Admin · Тайлан</h1>
        <p className="text-sm text-slate-600">
          {new Date().toLocaleString('mn-MN')} · Идэвхтэй tab: {tab}
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-xl bg-white p-1 ring-1 ring-slate-200 w-fit no-print">
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

          {/* Хэрэглэгчдийн ангилал — Mazy / Уламжлалт / Хоёулаа */}
          {(() => {
            const mazyOnly   = participants.filter((p) => p.has_mazy  && !p.has_legacy).length;
            const legacyOnly = participants.filter((p) => !p.has_mazy && p.has_legacy ).length;
            const both       = participants.filter((p) => p.has_mazy  && p.has_legacy ).length;
            const neither    = participants.filter((p) => !p.has_mazy && !p.has_legacy).length;

            return (
              <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <h2 className="text-base font-semibold text-slate-900">Хэрэглэгчдийн ангилал</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Нийт {participants.length} оролцогчийг screen_views-аас derivable байдлаар Mazy/Уламжлалтаар ангилсан
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl bg-blue-50 p-4 ring-1 ring-blue-200">
                    <p className="text-xs uppercase tracking-wider text-blue-700">🟦 Зөвхөн Mazy</p>
                    <p className="mt-1 text-3xl font-bold tabular-nums text-blue-800">{mazyOnly}</p>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
                    <p className="text-xs uppercase tracking-wider text-amber-700">🟧 Зөвхөн Уламжлалт</p>
                    <p className="mt-1 text-3xl font-bold tabular-nums text-amber-800">{legacyOnly}</p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
                    <p className="text-xs uppercase tracking-wider text-emerald-700">✅ Хоёуланг хийсэн</p>
                    <p className="mt-1 text-3xl font-bold tabular-nums text-emerald-800">{both}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <p className="text-xs uppercase tracking-wider text-slate-600">⏳ Эхлээгүй</p>
                    <p className="mt-1 text-3xl font-bold tabular-nums text-slate-700">{neither}</p>
                  </div>
                </div>
              </section>
            );
          })()}

          {/* Танилцах/унших хугацаа — Mazy vs Уламжлалт (quiz-аас бусад) */}
          {(() => {
            // Reading = intro + video + lab + practice for Mazy; topic1-4 for Legacy.
            // Quiz screens excluded.
            const mazyReads = timingRows
              .map((r) => r.mazy_intro_ms + r.mazy_video_ms + r.mazy_lab_ms + r.mazy_practice_ms)
              .filter((v) => v > 0);
            const legacyReads = timingRows
              .map((r) => r.legacy_topic1_ms + r.legacy_topic2_ms + r.legacy_topic3_ms + r.legacy_topic4_ms)
              .filter((v) => v > 0);
            const mean = (xs: number[]) => xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length;
            const median = (xs: number[]) => {
              if (xs.length === 0) return null;
              const s = [...xs].sort((a, b) => a - b);
              const m = Math.floor(s.length / 2);
              return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
            };
            const fmtMs = (ms: number | null) => {
              if (ms === null || ms <= 0) return '—';
              if (ms < 60_000) return `${(ms / 1000).toFixed(0)}с`;
              return `${Math.floor(ms / 60_000)}мин ${Math.round((ms % 60_000) / 1000)}с`;
            };
            const mzMean = mean(mazyReads);
            const lgMean = mean(legacyReads);
            const delta = mzMean !== null && lgMean !== null ? mzMean - lgMean : null;

            return (
              <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <h2 className="text-base font-semibold text-slate-900">Танилцах · унших хугацаа</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Quiz-аас бусад хичээлийн дэлгэц дээр зарцуулсан хугацаа · Mazy (танилц.+видео+лаб+дасгал) vs Уламжлалт (бүлэг 1–4)
                </p>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-blue-50 p-4 ring-1 ring-blue-200">
                    <div className="flex items-baseline justify-between">
                      <p className="text-xs font-bold uppercase tracking-wider text-blue-800">🟦 Mazy</p>
                      <span className="text-xs text-blue-700">n={mazyReads.length}</span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] uppercase text-slate-500">Дундаж</p>
                        <p className="text-xl font-bold tabular-nums text-blue-800">{fmtMs(mzMean)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-slate-500">Медиан</p>
                        <p className="text-xl font-bold tabular-nums text-blue-800">{fmtMs(median(mazyReads))}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
                    <div className="flex items-baseline justify-between">
                      <p className="text-xs font-bold uppercase tracking-wider text-amber-800">🟧 Уламжлалт</p>
                      <span className="text-xs text-amber-700">n={legacyReads.length}</span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] uppercase text-slate-500">Дундаж</p>
                        <p className="text-xl font-bold tabular-nums text-amber-800">{fmtMs(lgMean)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-slate-500">Медиан</p>
                        <p className="text-xl font-bold tabular-nums text-amber-800">{fmtMs(median(legacyReads))}</p>
                      </div>
                    </div>
                  </div>
                </div>
                {delta !== null && (
                  <p className="mt-3 text-sm text-slate-700">
                    Дундаж зөрүү (Mazy − Уламжлалт):{' '}
                    <span className={`font-bold ${delta < 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {delta > 0 ? '+' : '−'}{fmtMs(Math.abs(delta))} {delta < 0 ? 'хурдан' : 'удаан'}
                    </span>
                  </p>
                )}
              </section>
            );
          })()}

          {/* Хуучин Mazy — post-session Q1–Q5 means + SUS recap */}
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-base font-semibold text-slate-900">📜 Хуучин Mazy · Post-session дүн</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Хуучин Q1–Q5 Likert + SUS — нийт {surveyMeans?.n_responses ?? 0} хариу
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                Хуучин асуулга
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-6">
              <StatCard label="SUS оноо"     value={stats!.sus !== null ? stats!.sus : '—'} hint="0–100" />
              <StatCard label="Q1 Хөдөлгөөнт" value={fmtMean(surveyMeans?.q1_motion_graphic)} hint="/5" />
              <StatCard label="Q2 Цэвэрхэн"   value={fmtMean(surveyMeans?.q2_visual_clarity)} hint="/5" />
              <StatCard label="Q3 Навигаци"   value={fmtMean(surveyMeans?.q3_navigation)} hint="/5" />
              <StatCard label="Q4 Өнгө"       value={fmtMean(surveyMeans?.q4_color_palette)} hint="/5" />
              <StatCard label="Q5 Мазаалай"   value={fmtMean(surveyMeans?.q5_mascot_microlearning)} hint="/5" />
            </div>
          </section>

          <ScreenAnalyticsTable rows={screenAnalytics} />
        </div>
      )}

      {/* ─── Participants tab ───────────────────────────────────────────── */}
      {tab === 'participants' && <ParticipantTable rows={participants} />}

      {/* ─── Quiz tab ───────────────────────────────────────────────────── */}
      {tab === 'quiz' && (() => {
        if (quizStats.length === 0) {
          return (
            <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-400 shadow-sm ring-1 ring-slate-200">
              Quiz хариулт алга.
            </div>
          );
        }
        const byLesson = new Map<string, QuizQuestionStat[]>();
        for (const q of quizStats) {
          const k = q.lesson_id ?? '_';
          const arr = byLesson.get(k) ?? [];
          arr.push(q);
          byLesson.set(k, arr);
        }

        // Mazy vs Уламжлалт aggregate
        const mazyQs   = quizStats.filter((q) => q.lesson_id !== 'legacy');
        const legacyQs = quizStats.filter((q) => q.lesson_id === 'legacy');
        const summarize = (list: QuizQuestionStat[]) => {
          const att = list.reduce((a, q) => a + q.attempts, 0);
          const cor = list.reduce((a, q) => a + q.correct, 0);
          const wro = list.reduce((a, q) => a + q.wrong, 0);
          // Total thinking time = sum over each question of (avg × attempts)
          const totalMs = list.reduce(
            (a, q) => a + (q.avg_time_ms !== null ? q.avg_time_ms * q.attempts : 0),
            0,
          );
          return {
            att, cor, wro,
            acc: att > 0 ? cor / att : 0,
            qcount: list.length,
            totalMs,
            avgMs: att > 0 ? totalMs / att : 0,
          };
        };
        const mz = summarize(mazyQs);
        const lg = summarize(legacyQs);

        return (
          <div className="space-y-6">
            {/* Aggregate dashboard — Mazy vs Уламжлалт */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ConditionStatCard
                title="Mazy"
                color="blue"
                qcount={mz.qcount}
                attempts={mz.att}
                correct={mz.cor}
                wrong={mz.wro}
                accuracy={mz.acc}
                totalMs={mz.totalMs}
                avgMs={mz.avgMs}
              />
              <ConditionStatCard
                title="Уламжлалт"
                color="amber"
                qcount={lg.qcount}
                attempts={lg.att}
                correct={lg.cor}
                wrong={lg.wro}
                accuracy={lg.acc}
                totalMs={lg.totalMs}
                avgMs={lg.avgMs}
              />
            </div>
            {Array.from(byLesson.entries()).map(([lessonId, qs]) => {
              const lessonName = lessonId === '_' ? 'Тодорхойгүй' : (LESSON_NAMES[lessonId] ?? lessonId);
              const totalAttempts = qs.reduce((acc, q) => acc + q.attempts, 0);
              const totalCorrect  = qs.reduce((acc, q) => acc + q.correct, 0);
              const overallAcc = totalAttempts > 0 ? totalCorrect / totalAttempts : 0;
              const isLegacy = lessonId === 'legacy';
              return (
                <section
                  key={lessonId}
                  className={`rounded-2xl bg-white p-5 shadow-sm ring-2 ${
                    isLegacy ? 'ring-amber-300' : 'ring-blue-200'
                  }`}
                >
                  <div className="flex items-baseline justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                        isLegacy ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {isLegacy ? 'Уламжлалт' : 'Mazy'}
                      </span>
                      <h2 className="text-lg font-bold text-slate-900">{lessonName}</h2>
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">
                        {lessonId}
                      </code>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-600">
                      <span>{qs.length} асуулт</span>
                      <span className="text-slate-300">·</span>
                      <span>{totalAttempts} нийт оролдлого</span>
                      <span className="text-slate-300">·</span>
                      <span className={`font-bold ${
                        overallAcc >= 0.7 ? 'text-emerald-700' :
                        overallAcc >= 0.4 ? 'text-amber-700' : 'text-red-600'
                      }`}>
                        {Math.round(overallAcc * 100)}% нарийвчлал
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-3 py-2 text-left">Асуулт</th>
                          <th className="px-3 py-2 text-right">Нийт</th>
                          <th className="px-3 py-2 text-right">Зөв</th>
                          <th className="px-3 py-2 text-right">Буруу</th>
                          <th className="px-3 py-2 text-right">Нарийвчлал</th>
                          <th className="px-3 py-2 text-right">Дунд. хугацаа</th>
                          <th className="px-3 py-2 text-left">Сонголтын тархалт</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {qs.map((q) => {
                          const prompt = quizPrompt(q.lesson_id, q.question_key);
                          return (
                          <tr key={q.question_key} className="hover:bg-slate-50/50 align-top">
                            <td className="px-3 py-2 max-w-md">
                              <div className="flex items-baseline gap-2">
                                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] shrink-0 text-slate-600">{q.question_key}</code>
                                <span className="text-slate-900">
                                  {prompt ?? <span className="italic text-slate-400">Текст алга</span>}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">{q.attempts}</td>
                            <td className="px-3 py-2 text-right tabular-nums font-medium text-emerald-700">{q.correct}</td>
                            <td className="px-3 py-2 text-right tabular-nums font-medium text-red-600">{q.wrong}</td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <span className={`font-semibold tabular-nums ${
                                  q.accuracy >= 0.7 ? 'text-emerald-700' :
                                  q.accuracy >= 0.4 ? 'text-amber-700' : 'text-red-600'
                                }`}>
                                  {Math.round(q.accuracy * 100)}%
                                </span>
                                <div className="h-2 w-16 rounded-full bg-slate-100 overflow-hidden">
                                  <div
                                    className={
                                      q.accuracy >= 0.7 ? 'h-full bg-emerald-400' :
                                      q.accuracy >= 0.4 ? 'h-full bg-amber-400' : 'h-full bg-red-400'
                                    }
                                    style={{ width: `${q.accuracy * 100}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-slate-500">
                              {q.avg_time_ms !== null ? `${(q.avg_time_ms / 1000).toFixed(1)}с` : '—'}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(q.option_dist)
                                  .sort((a, b) => b[1].count - a[1].count)
                                  .map(([opt, info]) => (
                                    <span
                                      key={opt}
                                      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium ${
                                        info.correct
                                          ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200'
                                          : 'bg-slate-100 text-slate-700'
                                      }`}
                                    >
                                      {info.correct && '✓ '}{opt}: {info.count}
                                    </span>
                                  ))}
                              </div>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })}

            {/* Хуучин дасгал — practice attempts dashboard */}
            {(() => {
              const totalAttempts = practiceDrills.reduce((acc, d) => acc + d.attempts, 0);
              const totalCorrect = practiceDrills.reduce((acc, d) => acc + d.avg_correct * d.attempts, 0);
              const totalWrong   = practiceDrills.reduce((acc, d) => acc + d.avg_wrong   * d.attempts, 0);
              const overallAcc   = totalCorrect + totalWrong > 0
                ? totalCorrect / (totalCorrect + totalWrong)
                : 0;
              const totalMs = practiceDrills.reduce(
                (acc, d) => acc + (d.avg_duration_ms !== null ? d.avg_duration_ms * d.attempts : 0),
                0,
              );
              const avgMs = totalAttempts > 0 ? totalMs / totalAttempts : 0;
              const fmtMs = (ms: number) => {
                if (ms <= 0) return '—';
                if (ms < 60_000) return `${(ms / 1000).toFixed(1)}с`;
                return `${Math.floor(ms / 60_000)}мин ${Math.round((ms % 60_000) / 1000)}с`;
              };

              return (
                <details className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 mt-6" open>
                  <summary className="cursor-pointer text-base font-semibold text-slate-900 select-none">
                    Хуучин дасгал (Phase 3 practice drills)
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      {practiceDrills.length} drill
                    </span>
                  </summary>
                  <p className="mt-1 text-xs text-slate-500">
                    Хичээл дотор хийсэн дасгал. Mazy quiz-ээс тусдаа phase. Нийт оноо нь бүх оролдлогын нийлбэр.
                  </p>

                  {/* Summary cards */}
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                      <p className="text-xs uppercase text-slate-500">Нийт оролдлого</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{totalAttempts}</p>
                    </div>
                    <div className="rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
                      <p className="text-xs uppercase text-emerald-700">Нийт зөв</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-800">{Math.round(totalCorrect)}</p>
                    </div>
                    <div className="rounded-xl bg-red-50 p-4 ring-1 ring-red-200">
                      <p className="text-xs uppercase text-red-700">Нийт буруу</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums text-red-800">{Math.round(totalWrong)}</p>
                    </div>
                    <div className={`rounded-xl p-4 ring-1 ${
                      overallAcc >= 0.7 ? 'bg-emerald-50 ring-emerald-200' :
                      overallAcc >= 0.4 ? 'bg-amber-50 ring-amber-200' : 'bg-red-50 ring-red-200'
                    }`}>
                      <p className="text-xs uppercase text-slate-500">Нарийвчлал</p>
                      <p className={`mt-1 text-2xl font-bold tabular-nums ${
                        overallAcc >= 0.7 ? 'text-emerald-800' :
                        overallAcc >= 0.4 ? 'text-amber-800' : 'text-red-800'
                      }`}>{Math.round(overallAcc * 100)}%</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                      <p className="text-xs uppercase text-slate-500">Нийт хугацаа</p>
                      <p className="mt-1 text-lg font-bold tabular-nums text-slate-800">{fmtMs(totalMs)}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                      <p className="text-xs uppercase text-slate-500">Дунд. хугацаа</p>
                      <p className="mt-1 text-lg font-bold tabular-nums text-slate-800">{fmtMs(avgMs)}</p>
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-3 text-left">Хичээл</th>
                          <th className="px-4 py-3 text-left">Drill</th>
                          <th className="px-4 py-3 text-left">Төрөл</th>
                          <th className="px-4 py-3 text-right">Оролдлого</th>
                          <th className="px-4 py-3 text-right">Нийт зөв</th>
                          <th className="px-4 py-3 text-right">Нийт буруу</th>
                          <th className="px-4 py-3 text-right">Нарийвчлал</th>
                          <th className="px-4 py-3 text-right">Дунд. хугацаа</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {practiceDrills.map((d, i) => {
                          const totC = d.avg_correct * d.attempts;
                          const totW = d.avg_wrong * d.attempts;
                          const acc = totC + totW > 0 ? totC / (totC + totW) : 0;
                          return (
                            <tr key={`${d.lesson_id}:${d.drill_id}:${i}`} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3 text-slate-700">
                                {LESSON_NAMES[d.lesson_id] ?? d.lesson_id}
                              </td>
                              <td className="px-4 py-3 font-mono text-xs">{d.drill_id}</td>
                              <td className="px-4 py-3 text-slate-500">{d.drill_kind ?? '—'}</td>
                              <td className="px-4 py-3 text-right tabular-nums">{d.attempts}</td>
                              <td className="px-4 py-3 text-right tabular-nums font-medium text-emerald-700">{Math.round(totC)}</td>
                              <td className="px-4 py-3 text-right tabular-nums font-medium text-red-600">{Math.round(totW)}</td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <span className={`font-semibold tabular-nums ${
                                    acc >= 0.7 ? 'text-emerald-700' :
                                    acc >= 0.4 ? 'text-amber-700' : 'text-red-600'
                                  }`}>{Math.round(acc * 100)}%</span>
                                  <div className="h-2 w-16 rounded-full bg-slate-100 overflow-hidden">
                                    <div
                                      className={
                                        acc >= 0.7 ? 'h-full bg-emerald-400' :
                                        acc >= 0.4 ? 'h-full bg-amber-400' : 'h-full bg-red-400'
                                      }
                                      style={{ width: `${acc * 100}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                                {d.avg_duration_ms != null ? `${(d.avg_duration_ms / 1000).toFixed(1)}с` : '—'}
                              </td>
                            </tr>
                          );
                        })}
                        {practiceDrills.length === 0 && (
                          <tr>
                            <td colSpan={8} className="py-6 text-center text-sm text-slate-400">
                              Одоохондоо drill хийгдээгүй.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </details>
              );
            })()}
          </div>
        );
      })()}

      {/* ─── Observation tab ────────────────────────────────────────────── */}
      {tab === 'observation' && (() => {
        if (observations.length === 0) {
          return (
            <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-400 shadow-sm ring-1 ring-slate-200">
              Ажиглалт алга. Оролцогчийн дэлгэрэнгүй → Ажиглалт tab дотор event нэмэхэд энд жагсагдана.
            </div>
          );
        }
        const EVENT_LABELS: Record<string, string> = {
          hesitation:  'Танин мэдэхүйн саатал',
          misclick:    'Буруу даралт',
          frustration: 'Бухимдлын дохио',
          positive:    'Эерэг дохио',
          behavioral:  'Зан төлвийн дохио',
          vocal:       'Аман дохио',
        };
        const FRUSTRATION_TYPES = new Set(['hesitation', 'misclick', 'frustration', 'behavioral']);
        const POSITIVE_TYPES    = new Set(['positive']);

        const aggregateBy = (filter: (e: ObservationEventUpload) => boolean) => {
          const list = observations.filter(filter);
          const severityVals = list.map((e) => e.severity).filter((v): v is number => v !== null && v !== undefined);
          const meanSev = severityVals.length === 0 ? null : severityVals.reduce((a, b) => a + b, 0) / severityVals.length;
          const byType = new Map<string, number>();
          for (const e of list) byType.set(e.event_type, (byType.get(e.event_type) ?? 0) + 1);
          const frustration = list.filter((e) => FRUSTRATION_TYPES.has(e.event_type)).length;
          const positive    = list.filter((e) => POSITIVE_TYPES.has(e.event_type)).length;
          const participants = new Set(list.map((e) => e.participant_id));
          return { list, meanSev, byType, frustration, positive, participants };
        };

        const cond = (name: string) => aggregateBy((e) => e.condition.toLowerCase() === name.toLowerCase());
        const mazy   = cond('Mazy');
        const legacy = cond('Legacy');
        const meanSevDelta = mazy.meanSev !== null && legacy.meanSev !== null ? mazy.meanSev - legacy.meanSev : null;

        const sentimentRatio = (a: typeof mazy) =>
          a.frustration + a.positive === 0 ? null : a.positive / (a.frustration + a.positive);
        const mzSent = sentimentRatio(mazy);
        const lgSent = sentimentRatio(legacy);

        // Plain-language winner decision
        let winner: 'mazy' | 'legacy' | 'tie' = 'tie';
        let winScore = { m: 0, l: 0 };
        if (meanSevDelta !== null) {
          if (meanSevDelta < 0) winScore.m += 1; else if (meanSevDelta > 0) winScore.l += 1;
        }
        if (mzSent !== null && lgSent !== null) {
          if (mzSent > lgSent) winScore.m += 1; else if (lgSent > mzSent) winScore.l += 1;
        }
        if ((mazy.byType.get('hesitation') ?? 0) < (legacy.byType.get('hesitation') ?? 0)) winScore.m += 1;
        else if ((legacy.byType.get('hesitation') ?? 0) < (mazy.byType.get('hesitation') ?? 0)) winScore.l += 1;
        winner = winScore.m > winScore.l ? 'mazy' : winScore.l > winScore.m ? 'legacy' : 'tie';

        return (
          <div className="space-y-6">

            {/* Plain-language explainer */}
            <section className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">📖 Энэ хуудас юу харуулах вэ?</h2>
              <p className="mt-2 text-sm text-slate-700 leading-relaxed">
                Судлаач оролцогч бүрийн дэлгэрэнгүйд орж <strong>Ажиглалт</strong> хийсэн бүхий л үйлдлийг энэ дотор цуглуулж,
                <strong> Mazy</strong> болон <strong>Уламжлалт</strong> хичээлийн аль нь хүүхдэд илүү таалагдсан,
                бухимдуулсныг харьцуулдаг. Тоо нь бага байх тусам тэр хичээл хүүхдэд хөнгөн.
              </p>
            </section>

            {/* Big verdict banner */}
            <section className={`rounded-2xl p-6 ring-2 ${
              winner === 'mazy'   ? 'bg-blue-50 ring-blue-300' :
              winner === 'legacy' ? 'bg-amber-50 ring-amber-300' :
                                    'bg-slate-50 ring-slate-300'
            }`}>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">Ерөнхий дүгнэлт</p>
                  <p className={`mt-1 text-3xl font-extrabold ${
                    winner === 'mazy'   ? 'text-blue-800' :
                    winner === 'legacy' ? 'text-amber-800' :
                                          'text-slate-700'
                  }`}>
                    {winner === 'mazy'   ? '🏆 Mazy илүү таалагдсан'
                      : winner === 'legacy' ? '📖 Уламжлалт илүү таалагдсан'
                      : '⚖ Хоёул ижил'}
                  </p>
                  <p className="mt-2 text-sm text-slate-700">
                    {observations.length} ажиглалтад тулгуурлан 3 шинж тэмдгээр харьцуулсан:
                    {' '}<strong className="text-slate-900">Mazy {winScore.m}</strong>
                    {' '}vs <strong className="text-slate-900">Уламжлалт {winScore.l}</strong>
                  </p>
                </div>
                <div className="text-7xl leading-none">
                  {winner === 'mazy' ? '🥇' : winner === 'legacy' ? '📚' : '🤝'}
                </div>
              </div>
            </section>

            {/* Two simple comparison cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ObsConditionCard title="🟦 Mazy" color="blue" agg={mazy} eventLabels={EVENT_LABELS} sentiment={mzSent} />
              <ObsConditionCard title="🟧 Уламжлалт" color="amber" agg={legacy} eventLabels={EVENT_LABELS} sentiment={lgSent} />
            </div>

            {/* Friendly findings */}
            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-base font-bold text-slate-900">Гол үр дүн · энгийн үгээр</h2>
              <div className="mt-3 space-y-3 text-sm">
                <FindingRow
                  icon="🤔"
                  title="Хэн илүү бухимдсан бэ?"
                  detail={
                    meanSevDelta === null
                      ? 'Хангалттай өгөгдөл алга'
                      : meanSevDelta < 0
                        ? `Уламжлалт дээр илүү бухимдсан. Mazy дунд. ${mazy.meanSev!.toFixed(2)}/5 · Уламжлалт дунд. ${legacy.meanSev!.toFixed(2)}/5`
                        : meanSevDelta > 0
                          ? `Mazy дээр илүү бухимдсан. Mazy дунд. ${mazy.meanSev!.toFixed(2)}/5 · Уламжлалт дунд. ${legacy.meanSev!.toFixed(2)}/5`
                          : 'Ижил түвшинд'
                  }
                  winner={meanSevDelta === null ? 'tie' : meanSevDelta < 0 ? 'mazy' : meanSevDelta > 0 ? 'legacy' : 'tie'}
                />
                <FindingRow
                  icon="😊"
                  title="Хэн илүү эерэгээр хариулсан бэ?"
                  detail={
                    mzSent === null || lgSent === null
                      ? 'Хангалттай өгөгдөл алга'
                      : `Mazy: ${Math.round(mzSent * 100)}% эерэг · Уламжлалт: ${Math.round(lgSent * 100)}% эерэг`
                  }
                  winner={mzSent === null || lgSent === null ? 'tie' : mzSent > lgSent ? 'mazy' : lgSent > mzSent ? 'legacy' : 'tie'}
                />
                <FindingRow
                  icon="🧠"
                  title="Хэн дээр илүү ойлгомжтой байсан бэ?"
                  detail={`Удаашрах удаа: Mazy ${mazy.byType.get('hesitation') ?? 0} · Уламжлалт ${legacy.byType.get('hesitation') ?? 0}. Цөөн нь сайн.`}
                  winner={
                    (mazy.byType.get('hesitation') ?? 0) < (legacy.byType.get('hesitation') ?? 0) ? 'mazy' :
                    (legacy.byType.get('hesitation') ?? 0) < (mazy.byType.get('hesitation') ?? 0) ? 'legacy' : 'tie'
                  }
                />
                <FindingRow
                  icon="👥"
                  title="Хэдэн хүний өгөгдөл цуглуулсан бэ?"
                  detail={`Mazy: ${mazy.participants.size} оролцогч · Уламжлалт: ${legacy.participants.size} оролцогч`}
                  winner="tie"
                />
              </div>
            </section>

            {/* Event type bar chart */}
            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-base font-semibold text-slate-900">Юу яаж тохиолдсон бэ?</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Ажиглалт болгоны төрөл — урт зураас нь олон удаа болсон гэсэн үг
              </p>
              <div className="mt-4 space-y-3">
                {Object.entries(EVENT_LABELS).map(([k, lbl]) => {
                  const m = mazy.byType.get(k) ?? 0;
                  const l = legacy.byType.get(k) ?? 0;
                  const max = Math.max(m, l, 1);
                  return (
                    <div key={k}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-800">{lbl}</span>
                        <span className="text-slate-400">
                          Mazy {m} · Уламжлалт {l}
                        </span>
                      </div>
                      <div className="mt-1.5 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-12 text-[10px] uppercase text-blue-700">Mazy</span>
                          <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full bg-blue-500" style={{ width: `${(m / max) * 100}%` }} />
                          </div>
                          <span className="w-8 text-right text-xs tabular-nums font-medium text-blue-700">{m}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-12 text-[10px] uppercase text-amber-700">Уламж.</span>
                          <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full bg-amber-500" style={{ width: `${(l / max) * 100}%` }} />
                          </div>
                          <span className="w-8 text-right text-xs tabular-nums font-medium text-amber-700">{l}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* All events log */}
            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              {(() => {
                const visible = observations.slice(0, 200);
                const visibleKeys = visible.map(obsKey);
                const allVisibleChecked = visibleKeys.length > 0 && visibleKeys.every((k) => selectedObs.has(k));
                const toggleAllVisible = () => {
                  setSelectedObs((prev) => {
                    const next = new Set(prev);
                    if (allVisibleChecked) visibleKeys.forEach((k) => next.delete(k));
                    else visibleKeys.forEach((k) => next.add(k));
                    return next;
                  });
                };
                return (
                  <>
                    <div className="flex items-baseline justify-between flex-wrap gap-2">
                      <div>
                        <h2 className="text-base font-semibold text-slate-900">Бүх ажиглалт · {observations.length} event</h2>
                        <p className="mt-0.5 text-xs text-slate-500">Checkbox-оор сонгож олноор устгаж болно.</p>
                      </div>
                      {selectedObs.size > 0 && (
                        <button
                          onClick={bulkDeleteObs}
                          disabled={obsDeleting}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                        >
                          {obsDeleting ? 'Устгаж байна…' : `Устгах (${selectedObs.size})`}
                        </button>
                      )}
                    </div>
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
                          <tr>
                            <th className="px-2 py-2 w-8">
                              <input
                                type="checkbox"
                                aria-label="Бүгдийг сонгох"
                                checked={allVisibleChecked}
                                onChange={toggleAllVisible}
                                className="h-3.5 w-3.5 cursor-pointer rounded border-slate-300"
                              />
                            </th>
                            <th className="px-2 py-2 text-left">Оролцогч</th>
                            <th className="px-2 py-2 text-left">Нөхцөл</th>
                            <th className="px-2 py-2 text-left">Дэлгэц</th>
                            <th className="px-2 py-2 text-left">Event</th>
                            <th className="px-2 py-2 text-right">Sev</th>
                            <th className="px-2 py-2 text-right">Хугацаа</th>
                            <th className="px-2 py-2 text-left">Quote / Тэмдэглэл</th>
                            <th className="px-2 py-2 text-left">Цаг</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {visible.map((e, i) => {
                            const k = obsKey(e);
                            const checked = selectedObs.has(k);
                            return (
                              <tr key={`${e.event_id}:${i}`} className={`hover:bg-slate-50/50 ${checked ? 'bg-blue-50/40' : ''}`}>
                                <td className="px-2 py-1">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleObs(k)}
                                    className="h-3.5 w-3.5 cursor-pointer rounded border-slate-300"
                                  />
                                </td>
                                <td className="px-2 py-1 font-medium text-slate-800">{e.participant_id}</td>
                                <td className="px-2 py-1">
                                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                    e.condition.toLowerCase().includes('mazy')
                                      ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                                  }`}>{e.condition}</span>
                                </td>
                                <td className="px-2 py-1 text-slate-500">{e.screen ?? '—'}</td>
                                <td className="px-2 py-1 text-slate-700">{EVENT_LABELS[e.event_type] ?? e.event_type}</td>
                                <td className="px-2 py-1 text-right tabular-nums">{e.severity ?? '—'}</td>
                                <td className="px-2 py-1 text-right tabular-nums text-slate-500">{e.duration_sec ?? '—'}с</td>
                                <td className="px-2 py-1 italic text-slate-700 max-w-xs truncate">
                                  {e.verbatim || e.notes || '—'}
                                </td>
                                <td className="px-2 py-1 text-slate-400">{new Date(e.timestamp).toLocaleString('mn-MN')}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {observations.length > 200 && (
                        <p className="mt-2 text-xs text-slate-400">{observations.length - 200} мөр илүү — CSV-ээр татаарай.</p>
                      )}
                    </div>
                  </>
                );
              })()}
            </section>
          </div>
        );
      })()}

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
          {/* Шинэ асуулга — overall summary dashboard */}
          {(() => {
            const mazyMean = likertMeans.find((m) => m.condition.toLowerCase().includes('mazy'));
            const legacyMean = likertMeans.find((m) => !m.condition.toLowerCase().includes('mazy'));
            const avgSatisf = (m: typeof mazyMean) => {
              if (!m) return null;
              const vals = (['l1', 'l2', 'l3', 'l4', 'l5', 'l6'] as const)
                .map((k) => m[k] as number | null)
                .filter((v): v is number => v !== null);
              return vals.length === 0 ? null : vals.reduce((a, b) => a + b, 0) / vals.length;
            };
            const mzAvg = avgSatisf(mazyMean);
            const lgAvg = avgSatisf(legacyMean);
            const mzL7 = mazyMean?.l7 ?? null;
            const lgL7 = legacyMean?.l7 ?? null;
            const both = new Set<string>();
            const onlyM = new Set<string>();
            const onlyL = new Set<string>();
            const byUser = new Map<string, { m?: true; l?: true }>();
            for (const r of likertRows) {
              const slot = byUser.get(r.user_id_client) ?? {};
              if (r.condition.toLowerCase().includes('mazy')) slot.m = true;
              else slot.l = true;
              byUser.set(r.user_id_client, slot);
            }
            for (const [uid, slot] of byUser) {
              if (slot.m && slot.l) both.add(uid);
              else if (slot.m) onlyM.add(uid);
              else if (slot.l) onlyL.add(uid);
            }

            return (
              <section className="space-y-3">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <LikertConditionCard
                    title="Mazy"
                    color="blue"
                    n={mazyMean?.n ?? 0}
                    satisfMean={mzAvg}
                    loadL7={mzL7}
                  />
                  <LikertConditionCard
                    title="Уламжлалт"
                    color="amber"
                    n={legacyMean?.n ?? 0}
                    satisfMean={lgAvg}
                    loadL7={lgL7}
                  />
                </div>
                <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Within-subject — нэг хүн хариулсан
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-sm">
                    <span><strong className="text-emerald-700 tabular-nums">{both.size}</strong> · хоёуланг</span>
                    <span className="text-slate-300">·</span>
                    <span><strong className="text-blue-700 tabular-nums">{onlyM.size}</strong> · зөвхөн Mazy</span>
                    <span className="text-slate-300">·</span>
                    <span><strong className="text-amber-700 tabular-nums">{onlyL.size}</strong> · зөвхөн Уламжлалт</span>
                    {mzAvg !== null && lgAvg !== null && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span>
                          Δ сэтгэл ханамж (L1–L6):{' '}
                          <strong className={mzAvg > lgAvg ? 'text-blue-700' : mzAvg < lgAvg ? 'text-amber-700' : 'text-slate-600'}>
                            {mzAvg > lgAvg ? '+' : ''}{(mzAvg - lgAvg).toFixed(2)}
                          </strong>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </section>
            );
          })()}

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
          {/* Hero dashboard — Q1-Q5 satisfaction summary */}
          {(() => {
            const n = surveyMeans?.n_responses ?? 0;
            const q1to5 = [
              surveyMeans?.q1_motion_graphic,
              surveyMeans?.q2_visual_clarity,
              surveyMeans?.q3_navigation,
              surveyMeans?.q4_color_palette,
              surveyMeans?.q5_mascot_microlearning,
            ].filter((v): v is number => v !== null && v !== undefined);
            const overall = q1to5.length === 0 ? null : q1to5.reduce((a, b) => a + b, 0) / q1to5.length;
            const q7Yes = surveyRows.filter((r) => ((r.answers as any).q7_consent ?? {}).consent === 'yes').length;
            const q7No  = surveyRows.filter((r) => {
              const c = ((r.answers as any).q7_consent ?? {}) as { consent?: string };
              return c.consent && c.consent !== 'yes';
            }).length;
            const q6Count = surveyRows.filter((r) => {
              const v = (r.answers as any).q6_open_feedback;
              return typeof v === 'string' && v.trim().length > 0;
            }).length;
            const consentRate = q7Yes + q7No === 0 ? null : q7Yes / (q7Yes + q7No);
            const bestQ = [
              { k: 'Q1', label: 'Хөдөлгөөнт график', v: surveyMeans?.q1_motion_graphic ?? null },
              { k: 'Q2', label: 'Цэвэрхэн',         v: surveyMeans?.q2_visual_clarity ?? null },
              { k: 'Q3', label: 'Навигаци',          v: surveyMeans?.q3_navigation ?? null },
              { k: 'Q4', label: 'Өнгө',              v: surveyMeans?.q4_color_palette ?? null },
              { k: 'Q5', label: 'Мазаалай',          v: surveyMeans?.q5_mascot_microlearning ?? null },
            ];
            const ranked = bestQ.filter((q) => q.v !== null) as { k: string; label: string; v: number }[];
            const top = ranked.length ? ranked.reduce((a, b) => a.v >= b.v ? a : b) : null;
            const bottom = ranked.length ? ranked.reduce((a, b) => a.v <= b.v ? a : b) : null;

            return (
              <section className="space-y-3">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-5 ring-2 ring-slate-300">
                    <p className="text-xs uppercase tracking-wider text-slate-500">Нийт хариу</p>
                    <p className="mt-2 text-4xl font-bold tabular-nums text-slate-900">{n}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {q6Count} нь чөлөөт санал бичсэн
                    </p>
                  </div>
                  <div className={`rounded-2xl p-5 ring-2 ${
                    overall === null ? 'bg-slate-50 ring-slate-200' :
                    overall >= 4 ? 'bg-emerald-50 ring-emerald-300' :
                    overall >= 3 ? 'bg-amber-50 ring-amber-300' : 'bg-red-50 ring-red-300'
                  }`}>
                    <p className="text-xs uppercase tracking-wider text-slate-500">Q1–Q5 ерөнхий ханамж</p>
                    <p className={`mt-2 text-4xl font-bold tabular-nums ${
                      overall === null ? 'text-slate-400' :
                      overall >= 4 ? 'text-emerald-700' :
                      overall >= 3 ? 'text-amber-700' : 'text-red-600'
                    }`}>
                      {overall !== null ? `${overall.toFixed(2)}` : '—'}
                      <span className="ml-1 text-lg font-normal text-slate-400">/ 5</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {overall !== null && overall >= 4 ? 'Сайн санал' : overall !== null && overall >= 3 ? 'Дунд' : 'Сайжруулах хэрэгтэй'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-blue-50 p-5 ring-2 ring-blue-200">
                    <p className="text-xs uppercase tracking-wider text-blue-700">Q7 · Цаашид оролцох</p>
                    <p className="mt-2 text-4xl font-bold tabular-nums text-blue-800">
                      {consentRate !== null ? `${Math.round(consentRate * 100)}%` : '—'}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      <strong className="text-emerald-700">{q7Yes}</strong> тийм / <strong className="text-amber-700">{q7No}</strong> үгүй
                    </p>
                  </div>
                </div>

                {top && bottom && top.k !== bottom.k && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
                      <p className="text-xs uppercase tracking-wider text-emerald-700">🏆 Хамгийн өндөр оноо</p>
                      <p className="mt-1 text-lg font-bold text-emerald-900">
                        {top.k} · {top.label}
                      </p>
                      <p className="mt-0.5 text-sm tabular-nums text-emerald-700">{top.v.toFixed(2)} / 5</p>
                    </div>
                    <div className="rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
                      <p className="text-xs uppercase tracking-wider text-amber-700">⚠ Хамгийн доод оноо</p>
                      <p className="mt-1 text-lg font-bold text-amber-900">
                        {bottom.k} · {bottom.label}
                      </p>
                      <p className="mt-0.5 text-sm tabular-nums text-amber-700">{bottom.v.toFixed(2)} / 5</p>
                    </div>
                  </div>
                )}
              </section>
            );
          })()}

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

function FindingRow({
  icon, title, detail, winner,
}: {
  icon: string;
  title: string;
  detail: string;
  winner: 'mazy' | 'legacy' | 'tie';
}) {
  const badge = winner === 'mazy'
    ? <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">🏆 Mazy</span>
    : winner === 'legacy'
      ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">🏆 Уламжлалт</span>
      : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">Тэнцсэн</span>;
  return (
    <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <span className="text-2xl leading-none shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-slate-900">{title}</p>
          {badge}
        </div>
        <p className="mt-0.5 text-xs text-slate-600">{detail}</p>
      </div>
    </div>
  );
}

function ObsConditionCard({
  title, color, agg, eventLabels, sentiment,
}: {
  title: string;
  color: 'blue' | 'amber';
  agg: { list: ObservationEventUpload[]; meanSev: number | null; byType: Map<string, number>; frustration: number; positive: number; participants: Set<string> };
  eventLabels: Record<string, string>;
  sentiment: number | null;
}) {
  const ring = color === 'blue' ? 'ring-blue-300' : 'ring-amber-300';
  const bg   = color === 'blue' ? 'bg-blue-50/60' : 'bg-amber-50/60';
  const titleColor = color === 'blue' ? 'text-blue-800' : 'text-amber-800';
  const sevColor = (v: number | null) =>
    v === null ? 'text-slate-400' :
    v <= 2 ? 'text-emerald-700' :
    v <= 3.5 ? 'text-amber-700' : 'text-red-600';
  return (
    <div className={`rounded-2xl ${bg} p-5 ring-2 ${ring}`}>
      <div className="flex items-baseline justify-between">
        <h3 className={`text-lg font-bold ${titleColor}`}>{title}</h3>
        <span className="text-xs text-slate-600">{agg.list.length} event · {agg.participants.size} session</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">Дунд. severity</p>
          <p className={`mt-1 text-3xl font-bold tabular-nums ${sevColor(agg.meanSev)}`}>
            {agg.meanSev !== null ? agg.meanSev.toFixed(2) : '—'}
            <span className="ml-1 text-base font-normal text-slate-400">/ 5</span>
          </p>
          <p className="mt-0.5 text-[10px] text-slate-400">Бага сайн ↓</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">Эерэг харьцаа</p>
          <p className={`mt-1 text-3xl font-bold tabular-nums ${
            sentiment === null ? 'text-slate-400' :
            sentiment >= 0.6 ? 'text-emerald-700' :
            sentiment >= 0.3 ? 'text-amber-700' : 'text-red-600'
          }`}>
            {sentiment !== null ? `${Math.round(sentiment * 100)}%` : '—'}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-400">positive / (positive+frustration)</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-1.5 text-xs">
        {Object.entries(eventLabels).map(([k, lbl]) => (
          <div key={k} className="rounded bg-white/80 px-2 py-1 ring-1 ring-slate-200">
            <p className="text-[9px] uppercase text-slate-500">{lbl}</p>
            <p className="font-bold tabular-nums text-slate-900">{agg.byType.get(k) ?? 0}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LikertConditionCard({
  title, color, n, satisfMean, loadL7,
}: {
  title: string;
  color: 'blue' | 'amber';
  n: number;
  satisfMean: number | null;
  loadL7: number | null;
}) {
  const ring = color === 'blue' ? 'ring-blue-300' : 'ring-amber-300';
  const bg   = color === 'blue' ? 'bg-blue-50/60' : 'bg-amber-50/60';
  const titleColor = color === 'blue' ? 'text-blue-800' : 'text-amber-800';
  const sBucket = (v: number | null) =>
    v === null ? 'text-slate-400' : v >= 4 ? 'text-emerald-700' : v >= 3 ? 'text-slate-700' : 'text-red-600';
  const lBucket = (v: number | null) =>
    v === null ? 'text-slate-400' : v <= 2.5 ? 'text-emerald-700' : v >= 4 ? 'text-red-600' : 'text-slate-700';
  return (
    <div className={`rounded-2xl ${bg} p-5 ring-2 ${ring}`}>
      <div className="flex items-baseline justify-between">
        <h3 className={`text-lg font-bold ${titleColor}`}>{title}</h3>
        <span className="text-xs text-slate-600">n={n}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">L1–L6 сэтгэл ханамж</p>
          <p className={`mt-1 text-2xl font-bold tabular-nums ${sBucket(satisfMean)}`}>
            {satisfMean !== null ? `${satisfMean.toFixed(2)} / 5` : '—'}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-400">Өндөр сайн</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">L7 ачаалал</p>
          <p className={`mt-1 text-2xl font-bold tabular-nums ${lBucket(loadL7)}`}>
            {loadL7 !== null ? `${loadL7.toFixed(2)} / 5` : '—'}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-400">Бага сайн ↓</p>
        </div>
      </div>
    </div>
  );
}

function ConditionStatCard({
  title, color, qcount, attempts, correct, wrong, accuracy, totalMs, avgMs,
}: {
  title: string;
  color: 'blue' | 'amber';
  qcount: number;
  attempts: number;
  correct: number;
  wrong: number;
  accuracy: number;
  totalMs: number;
  avgMs: number;
}) {
  const ring = color === 'blue' ? 'ring-blue-300' : 'ring-amber-300';
  const bg   = color === 'blue' ? 'bg-blue-50/60' : 'bg-amber-50/60';
  const titleColor = color === 'blue' ? 'text-blue-800' : 'text-amber-800';
  const fmtMs = (ms: number) => {
    if (ms <= 0) return '—';
    if (ms < 60_000) return `${(ms / 1000).toFixed(1)}с`;
    return `${Math.floor(ms / 60_000)}мин ${Math.round((ms % 60_000) / 1000)}с`;
  };
  return (
    <div className={`rounded-2xl ${bg} p-5 ring-2 ${ring}`}>
      <div className="flex items-baseline justify-between">
        <h3 className={`text-lg font-bold ${titleColor}`}>{title}</h3>
        <span className="text-xs text-slate-600">{qcount} асуулт</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">Нийт оролдлого</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{attempts}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">Нарийвчлал</p>
          <p className={`mt-1 text-2xl font-bold tabular-nums ${
            accuracy >= 0.7 ? 'text-emerald-700' :
            accuracy >= 0.4 ? 'text-amber-700' : 'text-red-600'
          }`}>{attempts > 0 ? `${Math.round(accuracy * 100)}%` : '—'}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">Зөв</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-700">{correct}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">Буруу</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-red-600">{wrong}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">Нийт бодсон</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-800">{fmtMs(totalMs)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">Дунд. бодолт</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-800">{fmtMs(avgMs)}</p>
        </div>
      </div>
    </div>
  );
}

function downloadAllCsv(args: {
  participants: ParticipantRow[];
  surveyRows: SurveyResponse[];
  likertRows: LikertResponse[];
  quizStats: QuizQuestionStat[];
  timingRows: TimingRow[];
  screenAnalytics: ScreenAnalyticRow[];
  observations: ObservationEventUpload[];
}) {
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const downloadFile = (name: string, header: string[], rows: any[][]) => {
    const lines = [header.join(','), ...rows.map((r) => r.map(escape).join(','))];
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // 1. Participants
  downloadFile(
    'mazy_participants.csv',
    ['id', 'short_id', 'display_name', 'grade', 'knowledge_level', 'created_at', 'completed', 'has_legacy', 'has_mazy', 'quiz_score', 'sus_score', 'lab_time_ms'],
    args.participants.map((p) => [
      p.id, p.short_id, p.display_name, p.grade, p.knowledge_level, p.created_at,
      p.completed, p.has_legacy, p.has_mazy, p.quiz_score, p.sus_score, p.lab_time_ms,
    ]),
  );

  // 2. Survey (old Q1-Q7)
  downloadFile(
    'mazy_survey_q1q7.csv',
    ['uid', 'submitted_at', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6_open', 'q7_consent', 'q7_contact'],
    args.surveyRows.map((r) => {
      const a = r.answers as Record<string, unknown>;
      const c = (a.q7_consent ?? {}) as { consent?: string; contact?: string };
      return [r.user_id_client, r.submitted_at, a.q1_motion_graphic, a.q2_visual_clarity, a.q3_navigation, a.q4_color_palette, a.q5_mascot_microlearning, a.q6_open_feedback, c.consent, c.contact];
    }),
  );

  // 3. Likert L1-L7 + B1-B3
  downloadFile(
    'mazy_likert.csv',
    ['participant_id', 'display_name', 'condition', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'B1', 'B2', 'B3', 'submitted_at'],
    args.likertRows.map((r) => [
      r.user_id_client, r.display_name, r.condition,
      r.l1, r.l2, r.l3, r.l4, r.l5, r.l6, r.l7,
      r.b1, r.b2, r.b3, r.submitted_at,
    ]),
  );

  // 4. Quiz per-question
  downloadFile(
    'mazy_quiz_questions.csv',
    ['lesson_id', 'question_key', 'attempts', 'correct', 'wrong', 'accuracy', 'avg_time_ms'],
    args.quizStats.map((q) => [q.lesson_id, q.question_key, q.attempts, q.correct, q.wrong, q.accuracy.toFixed(3), q.avg_time_ms]),
  );

  // 5. Timing comparison
  downloadFile(
    'mazy_timing.csv',
    ['client_uid', 'display_name', 'mazy_total_ms', 'mazy_intro_ms', 'mazy_video_ms', 'mazy_lab_ms', 'mazy_practice_ms', 'mazy_quiz_ms', 'legacy_total_ms', 'legacy_topic1_ms', 'legacy_topic2_ms', 'legacy_topic3_ms', 'legacy_topic4_ms', 'legacy_quiz_ms', 'legacy_complete_ms'],
    args.timingRows.map((r) => [r.client_uid, r.display_name, r.mazy_total_ms, r.mazy_intro_ms, r.mazy_video_ms, r.mazy_lab_ms, r.mazy_practice_ms, r.mazy_quiz_ms, r.legacy_total_ms, r.legacy_topic1_ms, r.legacy_topic2_ms, r.legacy_topic3_ms, r.legacy_topic4_ms, r.legacy_quiz_ms, r.legacy_complete_ms]),
  );

  // 6. Screen analytics
  downloadFile(
    'mazy_screens.csv',
    ['surface', 'views', 'taps', 'avg_time_ms'],
    args.screenAnalytics.map((s) => [s.surface, s.views, s.taps, s.avg_time_ms]),
  );

  // 7. Observations (Mazy vs Legacy comparative UX log)
  downloadFile(
    'mazy_observations.csv',
    ['participant_id', 'condition', 'event_id', 'event_type', 'screen', 'severity', 'duration_sec', 'verbatim', 'notes', 'session_time', 'timestamp'],
    args.observations.map((o) => [o.participant_id, o.condition, o.event_id, o.event_type, o.screen, o.severity, o.duration_sec, o.verbatim, o.notes, o.session_time, o.timestamp]),
  );
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
