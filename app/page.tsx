'use client';

import { useEffect, useState } from 'react';
import { Users, CheckCircle2, Activity, Timer, FlaskConical } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { CompletionFunnel } from '@/components/CompletionFunnel';
import { ScreenAnalyticsTable } from '@/components/ScreenAnalyticsTable';
import {
  getTotalParticipants,
  getCompletedLessons,
  getMeanSusScore,
  getMeanQuizAnswerTimeMs,
  getMeanLabTimeMs,
  getCompletionFunnel,
  getScreenAnalytics,
  getPracticeDrillSummary,
  type FunnelStep,
  type ScreenAnalyticRow,
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
  const [screenAnalytics, setScreenAnalytics] = useState<ScreenAnalyticRow[]>([]);
  const [practiceDrills, setPracticeDrills] = useState<PracticeDrillRow[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [total, completed, sus, quizMs, labMs, funnel, sAnalytics, pDrills] = await Promise.all([
          getTotalParticipants(),
          getCompletedLessons(),
          getMeanSusScore(),
          getMeanQuizAnswerTimeMs(),
          getMeanLabTimeMs(),
          getCompletionFunnel(),
          getScreenAnalytics().catch(() => []),
          getPracticeDrillSummary().catch(() => []),
        ]);
        setStats({ total, completed, sus, quizMs, labMs });
        setFunnel(funnel);
        setScreenAnalytics(sAnalytics);
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

      {/* Screen Analytics Table — categorized into Mazy / Уламжлалт / Үндсэн */}
      <ScreenAnalyticsTable rows={screenAnalytics} />

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

      {/* Footer */}
      <footer className="pt-4 text-center text-xs text-slate-500">
        Mazy Admin · Read-only · Дипломын ажил 2026
      </footer>
    </main>
  );
}

