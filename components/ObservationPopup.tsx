'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Play, Pause, Trash2, Download, FileJson } from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────────────────── */

type Condition = 'Mazy' | 'Legacy';

type EventType =
  | 'hesitation'
  | 'misclick'
  | 'frustration'
  | 'positive'
  | 'behavioral'
  | 'vocal';

type ScreenId =
  | 'intro' | 'goals' | 'concept' | 'animation'
  | 'lab' | 'practice' | 'hint' | 'quiz' | 'results';

interface ObsEvent {
  id: string;
  session_time: string;
  timestamp: string;
  event_type: EventType;
  screen: ScreenId | '';
  duration_sec: number | null;
  severity: 1 | 2 | 3 | 4 | 5 | null; // H3: 1–5 шкала
  verbatim: string;
  notes: string;
}

interface SessionData {
  participant_id: string;
  condition: Condition;
  session_start: string;
  timer_seconds: number;
  events: ObsEvent[];
}

/* ─── Constants ─────────────────────────────────────────────────────────── */

const EVENT_TYPES: { id: EventType; label: string; sublabel: string; color: string }[] = [
  { id: 'hesitation',  label: 'Танин мэдэхүйн саатал', sublabel: '≥3 сек зогссон тоо',                    color: 'bg-amber-100 text-amber-800 ring-amber-300' },
  { id: 'misclick',    label: 'Буруу даралт',           sublabel: 'Зорилтот бус элемент дарсан тоо',       color: 'bg-red-100 text-red-800 ring-red-300' },
  { id: 'frustration', label: 'Бухимдлын дохио',        sublabel: 'Дургүйцэх/идэвхгүй болох давтамж',      color: 'bg-rose-100 text-rose-800 ring-rose-300' },
  { id: 'positive',    label: 'Эерэг дохио',            sublabel: 'Инээх, уулга алдах давтамж',            color: 'bg-teal-100 text-teal-800 ring-teal-300' },
  { id: 'behavioral',  label: 'Зан төлвийн дохио',      sublabel: 'Нүүрний хувирал (хөмсгөө зангидах г.м)', color: 'bg-orange-100 text-orange-800 ring-orange-300' },
  { id: 'vocal',       label: 'Аман дохио',             sublabel: 'Эерэг/сөрөг verbatim quote',            color: 'bg-purple-100 text-purple-800 ring-purple-300' },
];

const SCREENS: { id: ScreenId; label: string }[] = [
  { id: 'intro',     label: 'Танилцуулга' },
  { id: 'goals',     label: 'Зорилго' },
  { id: 'concept',   label: 'Ойлголт' },
  { id: 'animation', label: 'Видео' },
  { id: 'lab',       label: 'Лаб' },
  { id: 'practice',  label: 'Дасгал' },
  { id: 'hint',      label: 'Санамж' },
  { id: 'quiz',      label: 'Сорил' },
  { id: 'results',   label: 'Үр дүн' },
];

/* ─── LocalStorage helpers ───────────────────────────────────────────────── */

function lsKey(pid: string, cond: Condition) {
  return `mazy_observations_v1:${pid}:${cond}`;
}

function loadSession(pid: string, cond: Condition): SessionData {
  try {
    const raw = localStorage.getItem(lsKey(pid, cond));
    if (raw) return JSON.parse(raw) as SessionData;
  } catch {}
  return {
    participant_id: pid,
    condition: cond,
    session_start: new Date().toISOString(),
    timer_seconds: 0,
    events: [],
  };
}

function saveSession(data: SessionData) {
  try {
    localStorage.setItem(lsKey(data.participant_id, data.condition), JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

function fmtTime(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function nextId(events: ObsEvent[]) {
  return `EV-${String(events.length + 1).padStart(3, '0')}`;
}

/* ─── Main Component ─────────────────────────────────────────────────────── */

export function ObservationPopup({
  participantId,
  participantLabel,
  grade,
  onClose,
}: {
  participantId: string;
  participantLabel: string;
  grade?: number | null;
  onClose: () => void;
}) {
  const [condition, setCondition] = useState<Condition>('Mazy');
  const [session, setSession] = useState<SessionData>(() => loadSession(participantId, 'Mazy'));
  const [timerRunning, setTimerRunning] = useState(false);
  const [tab, setTab] = useState<'new' | 'log' | 'stats'>('new');
  const [saveStatus, setSaveStatus] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);

  // Form state
  const [eventType, setEventType] = useState<EventType | ''>('');
  const [screen, setScreen] = useState<ScreenId | ''>('');
  const [durationSec, setDurationSec] = useState('');
  const [severity, setSeverity] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [verbatim, setVerbatim] = useState('');
  const [notes, setNotes] = useState('');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load session when condition changes
  const switchCondition = useCallback(
    (cond: Condition) => {
      setTimerRunning(false);
      if (timerRef.current) clearInterval(timerRef.current);
      const loaded = loadSession(participantId, cond);
      setCondition(cond);
      setSession(loaded);
    },
    [participantId],
  );

  // Timer
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setSession((prev) => {
          const updated = { ...prev, timer_seconds: prev.timer_seconds + 1 };
          saveSession(updated);
          return updated;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const persist = useCallback((updated: SessionData) => {
    const ok = saveSession(updated);
    const now = new Date().toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit' });
    setSaveStatus(
      ok
        ? `${updated.events.length} ажиглалт · ${now}-д хадгалсан`
        : 'Хадгалах боломжгүй',
    );
  }, []);

  const addEvent = () => {
    if (!eventType || !screen || !severity) return;
    const ev: ObsEvent = {
      id: nextId(session.events),
      session_time: fmtTime(session.timer_seconds),
      timestamp: new Date().toISOString(),
      event_type: eventType,
      screen,
      duration_sec: durationSec ? Number(durationSec) : null,
      severity: severity,
      verbatim,
      notes,
    };
    const updated: SessionData = {
      ...session,
      events: [ev, ...session.events],
    };
    setSession(updated);
    persist(updated);
    // Flash and clear form
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
    setEventType('');
    setScreen('');
    setDurationSec('');
    setSeverity(null);
    setVerbatim('');
    setNotes('');
  };

  const deleteEvent = (id: string) => {
    const updated: SessionData = {
      ...session,
      events: session.events.filter((e) => e.id !== id),
    };
    setSession(updated);
    persist(updated);
  };

  const exportCsv = () => {
    const header = ['event_id', 'participant_id', 'condition', 'session_time', 'timestamp', 'event_type', 'screen', 'duration_sec', 'severity', 'verbatim', 'notes'];
    const esc = (v: unknown) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [header.join(',')];
    for (const e of [...session.events].reverse()) {
      lines.push([e.id, session.participant_id, session.condition, e.session_time, e.timestamp, e.event_type, e.screen, e.duration_sec ?? '', e.severity ?? '', e.verbatim, e.notes].map(esc).join(','));
    }
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `obs_${participantId}_${condition}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `obs_${participantId}_${condition}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Live stats
  const counts = EVENT_TYPES.map((et) => ({
    ...et,
    count: session.events.filter((e) => e.event_type === et.id).length,
  }));
  const lastVerbatim = session.events.find((e) => e.event_type === 'vocal')?.verbatim ?? '';

  // H3: Priority Score per screen = sum(severity) for all events
  const screenScores = SCREENS.map((sc) => {
    const evs = session.events.filter((e) => e.screen === sc.id);
    const score = evs.reduce((acc, e) => acc + (e.severity ?? 2), 0);
    return { ...sc, count: evs.length, score };
  }).filter((sc) => sc.count > 0);

  const totalHesitationSec = session.events
    .filter((e) => e.event_type === 'hesitation')
    .reduce((acc, e) => acc + (e.duration_sec ?? 0), 0);

  const condBtn = (c: Condition) =>
    `rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
      condition === c
        ? c === 'Mazy'
          ? 'bg-blue-600 text-white'
          : 'bg-amber-500 text-white'
        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
    }`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">

        {/* ── A. Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
              {participantLabel.replace(/[^A-Z0-9]/gi, '').slice(0, 3).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-slate-900">{participantLabel}</p>
              <p className="text-xs text-slate-500">
                {grade ? `${grade}-р анги · ` : ''}Ажиглалтын session
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>

        {/* ── B. Session bar ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => switchCondition('Mazy')} className={condBtn('Mazy')}>Mazy</button>
            <button onClick={() => switchCondition('Legacy')} className={condBtn('Legacy')}>Legacy</button>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-semibold text-slate-800 tabular-nums">
              {fmtTime(session.timer_seconds)}
            </span>
            <button
              onClick={() => setTimerRunning((r) => !r)}
              className={`rounded-full p-2 ${timerRunning ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
            >
              {timerRunning ? <Pause size={15} /> : <Play size={15} />}
            </button>
          </div>
        </div>

        {/* ── C. Tabs ───────────────────────────────────────────────────── */}
        <div className="flex border-b border-slate-200 shrink-0">
          {([
            { id: 'new',   label: 'Шинэ ажиглалт' },
            { id: 'log',   label: `Бүртгэл (${session.events.length})` },
            { id: 'stats', label: 'Тоо баримт' },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'border-b-2 border-slate-900 text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── D. Tab Content ────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* D.1 — Шинэ ажиглалт */}
          {tab === 'new' && (
            <div className="p-5 space-y-4">
              {/* Event type chips */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Юу болсон <span className="text-red-500">*</span></p>
                <div className="grid grid-cols-2 gap-2">
                  {EVENT_TYPES.map((et) => (
                    <button
                      key={et.id}
                      onClick={() => setEventType(et.id)}
                      className={`rounded-xl px-3 py-2 text-left ring-1 transition-all ${et.color} ${
                        eventType === et.id ? 'ring-2 scale-[1.02]' : 'ring-transparent opacity-60 hover:opacity-90'
                      }`}
                    >
                      <p className="text-xs font-semibold">{et.label}</p>
                      <p className="mt-0.5 text-[10px] opacity-80">{et.sublabel}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Screen pills */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Аль дэлгэц дээр <span className="text-red-500">*</span></p>
                <div className="flex flex-wrap gap-2">
                  {SCREENS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setScreen(s.id)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                        screen === s.id
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-300 text-slate-600 hover:border-slate-500'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration + Severity */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {eventType === 'hesitation' ? 'Зогссон хугацаа (сек) *' : 'Үргэлжилсэн (сек)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={durationSec}
                    onChange={(e) => setDurationSec(e.target.value)}
                    placeholder={eventType === 'hesitation' ? '≥3' : 'жишээ: 5'}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Хүнд байдал (1–5) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-1">
                    {([1, 2, 3, 4, 5] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setSeverity(s)}
                        className={`h-9 w-9 rounded-lg text-sm font-bold ring-1 transition-all ${
                          severity === s
                            ? s <= 2 ? 'bg-green-500 text-white ring-green-600'
                              : s === 3 ? 'bg-amber-500 text-white ring-amber-600'
                              : 'bg-red-500 text-white ring-red-600'
                            : 'bg-slate-100 text-slate-500 ring-slate-200 hover:ring-slate-400'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Verbatim — primary for vocal, optional for others */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {eventType === 'vocal' ? 'Verbatim quote *' : 'Хэлсэн үг (сонсвол)'}
                </label>
                <textarea
                  rows={2}
                  value={verbatim}
                  onChange={(e) => setVerbatim(e.target.value)}
                  placeholder={eventType === 'vocal' ? '"Энэ нь ойлгомжгүй байна" / "Маш сайхан!"' : '"Яагаад ийм вэ?"'}
                  className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Нэмэлт тэмдэглэл</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Биеийн хэл, нүүрний илэрхийлэл..."
                  className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setEventType(''); setScreen(''); setDurationSec(''); setSeverity(null); setVerbatim(''); setNotes(''); }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Цэвэрлэх
                </button>
                <button
                  onClick={addEvent}
                  disabled={!eventType || !screen || !severity}
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                    eventType && screen && severity
                      ? savedFlash
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-900 text-white hover:bg-slate-700'
                      : 'cursor-not-allowed bg-slate-200 text-slate-400'
                  }`}
                >
                  {savedFlash ? '✓ Нэмэгдлээ' : 'Нэмэх'}
                </button>
              </div>
            </div>
          )}

          {/* D.2 — Бүртгэл */}
          {tab === 'log' && (
            <div className="divide-y divide-slate-100">
              {session.events.length === 0 && (
                <p className="py-12 text-center text-sm text-slate-500">Одоогоор ажиглалт байхгүй.</p>
              )}
              {session.events.map((ev) => {
                const et = EVENT_TYPES.find((e) => e.id === ev.event_type);
                return (
                  <div key={ev.id} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50">
                    <span className="mt-0.5 font-mono text-xs text-slate-400 tabular-nums shrink-0">{ev.session_time}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${et?.color ?? ''}`}>
                          {et?.label ?? ev.event_type}
                        </span>
                        <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-xs text-slate-500">
                          {ev.screen}
                        </span>
                        {ev.duration_sec !== null && (
                          <span className="text-xs text-slate-500">{ev.duration_sec}с</span>
                        )}
                      </div>
                      {ev.verbatim && (
                        <p className="mt-1 text-xs italic text-slate-700">&ldquo;{ev.verbatim}&rdquo;</p>
                      )}
                      {ev.notes && (
                        <p className="mt-0.5 text-xs text-slate-500">{ev.notes}</p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteEvent(ev.id)}
                      className="shrink-0 p-1.5 rounded text-slate-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* D.3 — Тоо баримт */}
          {tab === 'stats' && (
            <div className="p-5 space-y-4">

              {/* H1 */}
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-600">H₁ · Когнитив саатал ба навигацийн алдаа</p>
                <div className="grid grid-cols-3 gap-2">
                  <StatMini label="Танин мэдэхүйн саатал" value={counts.find((c) => c.id === 'hesitation')?.count ?? 0} accent="amber" />
                  <StatMini label="Нийт зогссон (сек)" value={totalHesitationSec} accent="amber" />
                  <StatMini label="Буруу даралт" value={counts.find((c) => c.id === 'misclick')?.count ?? 0} accent="red" />
                </div>
              </div>

              {/* H2 */}
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-teal-600">H₂ · Зан төлөвийн болон аман дохио</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <StatMini label="Эерэг дохио" value={counts.find((c) => c.id === 'positive')?.count ?? 0} accent="teal" />
                  <StatMini label="Бухимдлын дохио" value={counts.find((c) => c.id === 'frustration')?.count ?? 0} accent="rose" />
                  <StatMini label="Зан төлвийн дохио" value={counts.find((c) => c.id === 'behavioral')?.count ?? 0} />
                  <StatMini label="Аман дохио" value={counts.find((c) => c.id === 'vocal')?.count ?? 0} />
                </div>
              </div>

              {/* H3 — per-screen priority scores */}
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">H₃ · Өвдөлтийн цэг · Priority Score = Severity × Давтамж</p>
                {screenScores.length === 0 ? (
                  <p className="text-xs text-slate-400">Одоогоор бүртгэсэн асуудал байхгүй.</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-slate-500">
                        <th className="pb-1 font-medium">Дэлгэц</th>
                        <th className="pb-1 text-right font-medium">Давтамж</th>
                        <th className="pb-1 text-right font-medium">Priority</th>
                        <th className="pb-1 pl-2 font-medium">Түвшин</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {screenScores.sort((a, b) => b.score - a.score).map((sc) => (
                        <tr key={sc.id}>
                          <td className="py-1.5 font-medium text-slate-700">{sc.label}</td>
                          <td className="py-1.5 text-right tabular-nums text-slate-600">{sc.count}</td>
                          <td className="py-1.5 text-right tabular-nums font-bold text-slate-900">{sc.score}</td>
                          <td className="py-1.5 pl-2">
                            <ScoreBar score={sc.score} max={screenScores[0]?.score ?? 1} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Verbatim quote */}
              {lastVerbatim && (
                <div className="rounded-xl bg-purple-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-purple-500">Сүүлийн verbatim quote</p>
                  <p className="mt-1 text-sm italic text-purple-900">&ldquo;{lastVerbatim}&rdquo;</p>
                </div>
              )}

              {/* Session info */}
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Session</p>
                <dl className="space-y-1 text-xs text-slate-600">
                  <div className="flex gap-2"><dt className="text-slate-400">Нөхцөл:</dt><dd className="font-medium">{session.condition}</dd></div>
                  <div className="flex gap-2"><dt className="text-slate-400">Нийт хугацаа:</dt><dd className="font-mono font-medium">{fmtTime(session.timer_seconds)}</dd></div>
                  <div className="flex gap-2"><dt className="text-slate-400">Нийт ажиглалт:</dt><dd className="font-medium">{session.events.length}</dd></div>
                  <div className="flex gap-2"><dt className="text-slate-400">Эхэлсэн:</dt><dd>{new Date(session.session_start).toLocaleString('mn-MN')}</dd></div>
                </dl>
              </div>
            </div>
          )}
        </div>

        {/* ── E. Footer ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 shrink-0 bg-slate-50">
          <p className="text-xs text-slate-500 truncate max-w-[200px]">
            {saveStatus || 'Ажиглалт нэмэхэд автоматаар хадгалагдана'}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCsv}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download size={13} />
              CSV
            </button>
            <button
              onClick={exportJson}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <FileJson size={13} />
              JSON
            </button>
            <button
              onClick={onClose}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
            >
              Session дуусгах
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

/* ─── StatMini ────────────────────────────────────────────────────────────── */

function StatMini({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: 'amber' | 'red' | 'teal' | 'rose';
}) {
  const colorMap: Record<string, string> = {
    amber: 'text-amber-700',
    red: 'text-red-600',
    teal: 'text-teal-700',
    rose: 'text-rose-600',
  };
  const color = (accent ? colorMap[accent] : undefined) ?? 'text-slate-900';

  return (
    <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function ScoreBar({ score, max }: { score: number; max: number }) {
  const pct = max > 0 ? Math.round((score / max) * 100) : 0;
  const color = pct >= 67 ? 'bg-red-500' : pct >= 34 ? 'bg-amber-400' : 'bg-green-400';
  return (
    <div className="h-2 w-20 rounded-full bg-slate-200">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
