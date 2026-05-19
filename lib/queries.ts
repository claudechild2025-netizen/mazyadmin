/**
 * Бүх Supabase query энэ файлд төвлөрсөн.
 *
 * Schema is the simplified v4 layout (see mazy-app/supabase/schema_v4_align.sql):
 *   - users.client_uid        ← join key (text)
 *   - screen_views.client_uid + screen_slug
 *   - quiz_answers.client_uid + question_key
 *   - events.user_id (text == client_uid) + meta jsonb
 *   - survey_responses.user_id_client (text)
 */

import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

/* ============================================================================
   Helpers
   ========================================================================= */

const isLabSlug = (slug: string) =>
  slug.startsWith('lab:') || slug.startsWith('lesson_lab:');

const mean = (xs: number[]): number | null =>
  xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length;

function computeSus(responses: Map<number, number>): number | null {
  if (responses.size !== 10) return null;
  let sum = 0;
  for (const [qn, score] of responses) {
    sum += qn % 2 === 1 ? score - 1 : 5 - score;
  }
  return sum * 2.5;
}

async function getSusByClient(): Promise<Map<string, number>> {
  const { data } = await supabase
    .from('events')
    .select('user_id, meta')
    .eq('event', 'sus_response');
  const byClient = new Map<string, Map<number, number>>();
  for (const e of (data ?? []) as any[]) {
    const qn = Number(e.meta?.question_number);
    const score = Number(e.meta?.score);
    if (!Number.isFinite(qn) || !Number.isFinite(score)) continue;
    if (!byClient.has(e.user_id)) byClient.set(e.user_id, new Map());
    byClient.get(e.user_id)!.set(qn, score);
  }
  const result = new Map<string, number>();
  for (const [cuid, responses] of byClient) {
    const s = computeSus(responses);
    if (s !== null) result.set(cuid, s);
  }
  return result;
}

/* ============================================================================
   1. STAT CARDS
   ========================================================================= */

export async function getTotalParticipants(): Promise<number> {
  const { count, error } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function getCompletedLessons(): Promise<number> {
  const { data, error } = await supabase
    .from('screen_views')
    .select('client_uid')
    .eq('screen_slug', 'done');
  if (error) throw error;
  return new Set((data ?? []).map((r: any) => r.client_uid)).size;
}

export async function getMeanSusScore(): Promise<number | null> {
  const susByClient = await getSusByClient();
  const m = mean(Array.from(susByClient.values()));
  return m === null ? null : Math.round(m * 10) / 10;
}

export async function getMeanQuizAnswerTimeMs(): Promise<number | null> {
  const { data, error } = await supabase
    .from('quiz_answers')
    .select('time_to_answer_ms, client_uid');
  if (error) throw error;
  
  const byClient = new Map<string, number>();
  for (const r of data ?? []) {
    byClient.set(r.client_uid, (byClient.get(r.client_uid) ?? 0) + (r.time_to_answer_ms ?? 0));
  }
  const m = mean(Array.from(byClient.values()));
  return m === null ? null : Math.round(m);
}

export async function getMeanLabTimeMs(): Promise<number | null> {
  const { data, error } = await supabase
    .from('screen_views')
    .select('time_spent_ms, screen_slug, client_uid');
  if (error) throw error;
  
  const labs = (data ?? []).filter((r: any) => isLabSlug(r.screen_slug));
  const byClient = new Map<string, number>();
  for (const r of labs) {
    byClient.set(r.client_uid, (byClient.get(r.client_uid) ?? 0) + (r.time_spent_ms ?? 0));
  }
  const m = mean(Array.from(byClient.values()));
  return m === null ? null : Math.round(m);
}

/* ============================================================================
   2. COMPLETION FUNNEL
   ========================================================================= */

export type FunnelStep = {
  step: string;
  label_mn: string;
  count: number;
};

// Mazy app actually emits these screen slugs (see app/.../useTimeOnScreen calls).
// Stages follow the user journey: home → lesson list → into a lesson →
// lab/practice/distill → quiz → complete → done → survey.
const FUNNEL_STAGES: { key: string; label: string; match: (s: string) => boolean }[] = [
  { key: 'home',             label: 'Нүүр',             match: (s) => s === 'home' },
  { key: 'lessons',          label: 'Хичээлийн жагсаалт', match: (s) => s === 'lessons' },
  { key: 'lesson_intro',     label: 'Танилцуулга',      match: (s) => s.startsWith('lesson_intro:') },
  { key: 'motion_player',    label: 'Видео үзсэн',      match: (s) => s.startsWith('motion_player:') },
  { key: 'lab',              label: 'Интерактив лаб',   match: (s) => isLabSlug(s) },
  { key: 'lesson_practice',  label: 'Дасгал',           match: (s) => s.startsWith('lesson_practice:') },
  { key: 'lesson_distill',   label: 'Хураангуй',        match: (s) => s.startsWith('lesson_distill:') },
  { key: 'quiz',             label: 'Сорилт',           match: (s) => s.startsWith('quiz:') },
  { key: 'lesson_complete',  label: 'Хичээл дуусгасан', match: (s) => s.startsWith('lesson_complete:') },
  { key: 'done',             label: 'Бүх хичээл дууссан', match: (s) => s === 'done' },
  { key: 'survey',           label: 'Судалгаа',         match: (s) => s === 'survey' },
];

export async function getCompletionFunnel(): Promise<FunnelStep[]> {
  const { data, error } = await supabase
    .from('screen_views')
    .select('client_uid, screen_slug');
  if (error) throw error;

  return FUNNEL_STAGES.map((stage) => {
    const set = new Set<string>();
    for (const row of (data ?? []) as any[]) {
      if (stage.match(row.screen_slug)) set.add(row.client_uid);
    }
    return { step: stage.key, label_mn: stage.label, count: set.size };
  });
}

/* ============================================================================
   3. PARTICIPANT TABLE
   ========================================================================= */

export type ParticipantRow = {
  id: string;
  short_id: string;
  grade: number | null;
  knowledge_level: string | null;
  created_at: string;
  completed: boolean;
  quiz_score: number | null;
  sus_score: number | null;
  lab_time_ms: number | null;
};

export async function getParticipants(): Promise<ParticipantRow[]> {
  const { data: users, error: u_err } = await supabase
    .from('users')
    .select('id, client_uid, display_name, grade, knowledge_level, created_at')
    .order('created_at', { ascending: false });
  if (u_err) throw u_err;
  if (!users || users.length === 0) return [];

  const cuids = users.map((u: any) => u.client_uid);

  const [{ data: answers }, { data: views }, susByClient] = await Promise.all([
    supabase.from('quiz_answers').select('client_uid, is_correct').in('client_uid', cuids),
    supabase.from('screen_views').select('client_uid, screen_slug, time_spent_ms').in('client_uid', cuids),
    getSusByClient(),
  ]);

  const quizByClient = new Map<string, { correct: number; total: number }>();
  for (const a of (answers ?? []) as any[]) {
    const prev = quizByClient.get(a.client_uid) ?? { correct: 0, total: 0 };
    prev.total += 1;
    if (a.is_correct) prev.correct += 1;
    quizByClient.set(a.client_uid, prev);
  }

  const labByClient = new Map<string, number>();
  const doneSet = new Set<string>();
  for (const v of (views ?? []) as any[]) {
    if (isLabSlug(v.screen_slug)) {
      labByClient.set(v.client_uid, (labByClient.get(v.client_uid) ?? 0) + (v.time_spent_ms ?? 0));
    }
    if (v.screen_slug === 'done') doneSet.add(v.client_uid);
  }

  return users.map((u: any) => {
    const q = quizByClient.get(u.client_uid);
    const sus = susByClient.get(u.client_uid);
    return {
      id: u.id,
      short_id: (u.display_name as string) || (u.client_uid as string).slice(0, 8),
      grade: u.grade ?? null,
      knowledge_level: u.knowledge_level ?? null,
      created_at: u.created_at,
      completed: doneSet.has(u.client_uid),
      quiz_score: q ? q.correct : null,
      sus_score: sus !== undefined ? Math.round(sus * 10) / 10 : null,
      lab_time_ms: labByClient.get(u.client_uid) ?? null,
    };
  });
}

/* ============================================================================
   4. PARTICIPANT DETAIL — `app/participant/[id]/page.tsx`
   ========================================================================= */

export async function getParticipantDetail(userId: string) {
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (!user) {
    return { user: null, screenViews: [], quizAnswers: [], susResponses: [] };
  }

  const cuid = (user as any).client_uid;

  const [screenViews, quizAnswers, susEvents, practiceAttempts, surveyRow] = await Promise.all([
    supabase
      .from('screen_views')
      .select('*')
      .eq('client_uid', cuid)
      .order('viewed_at'),
    supabase
      .from('quiz_answers')
      .select('*')
      .eq('client_uid', cuid)
      .order('answered_at'),
    supabase
      .from('events')
      .select('*')
      .eq('event', 'sus_response')
      .eq('user_id', cuid)
      .order('inserted_at'),
    getPracticeAttemptsForClient(cuid).catch(() => []),
    supabase
      .from('survey_responses')
      .select('id, answers, submitted_at')
      .eq('user_id_client', cuid)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const susResponses = (susEvents.data ?? [])
    .map((e: any) => ({
      id: e.id,
      question_number: Number(e.meta?.question_number),
      response: Number(e.meta?.score),
    }))
    .filter((r) => Number.isFinite(r.question_number))
    .sort((a, b) => a.question_number - b.question_number);

  return {
    user,
    screenViews: screenViews.data ?? [],
    quizAnswers: quizAnswers.data ?? [],
    susResponses,
    practiceAttempts,
    survey: surveyRow.data
      ? {
          id: (surveyRow.data as any).id as number,
          answers: (surveyRow.data as any).answers as Record<string, unknown>,
          submitted_at: (surveyRow.data as any).submitted_at as string,
        }
      : null,
  };
}

/* ============================================================================
   5. SURVEY RESPONSES (post-session questionnaire, v3 schema)
   ========================================================================= */

export type SurveyResponse = {
  id: number;
  user_id_client: string;
  display_name: string | null;
  answers: Record<string, unknown>;
  submitted_at: string;
};

export type SurveyMeans = {
  n_responses: number;
  q1_motion_graphic: number | null;
  q2_visual_clarity: number | null;
  q3_navigation: number | null;
  q4_color_palette: number | null;
  q5_mascot_microlearning: number | null;
};

export async function getSurveyResponses(): Promise<SurveyResponse[]> {
  const { data, error } = await supabase
    .from('survey_responses')
    .select('id, user_id_client, answers, submitted_at')
    .order('submitted_at', { ascending: false });
  if (error) throw error;

  // Deduplicate: only take latest response per user
  const latestMap = new Map<string, any>();
  for (const r of data ?? []) {
    if (!latestMap.has(r.user_id_client)) {
      latestMap.set(r.user_id_client, r);
    }
  }
  
  const rows = Array.from(latestMap.values()) as Omit<SurveyResponse, 'display_name'>[];
  const nameByCuid = await getDisplayNameMap(rows.map((r) => r.user_id_client));
  return rows.map((r) => ({
    ...r,
    display_name: nameByCuid.get(r.user_id_client) ?? null,
  }));
}

export async function getSurveyMeans(): Promise<SurveyMeans> {
  const { data, error } = await supabase
    .from('survey_responses')
    .select('user_id_client, answers, submitted_at')
    .order('submitted_at', { ascending: false });
  if (error) throw error;

  // Deduplicate by user_id_client, taking only the latest
  const latestMap = new Map<string, any>();
  for (const r of data ?? []) {
    if (!latestMap.has(r.user_id_client)) {
      latestMap.set(r.user_id_client, r.answers);
    }
  }

  const responses = Array.from(latestMap.values()).filter((a: any) => a && a.q1_motion_graphic !== undefined);

  if (responses.length === 0) {
    return {
      n_responses: 0,
      q1_motion_graphic: null,
      q2_visual_clarity: null,
      q3_navigation: null,
      q4_color_palette: null,
      q5_mascot_microlearning: null,
    };
  }

  const sum = (key: string) => responses.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
  const n = responses.length;

  return {
    n_responses: n,
    q1_motion_graphic: sum('q1_motion_graphic') / n,
    q2_visual_clarity: sum('q2_visual_clarity') / n,
    q3_navigation: sum('q3_navigation') / n,
    q4_color_palette: sum('q4_color_palette') / n,
    q5_mascot_microlearning: sum('q5_mascot_microlearning') / n,
  };
}

/* ============================================================================
   6. CONSENT LEADS (Q7 = "want to be contacted")
   ========================================================================= */

export type ConsentLead = {
  uid: string;
  display_name: string | null;
  contact: string;
  submitted_at: string;
};

export async function getConsentLeads(): Promise<ConsentLead[]> {
  const { data, error } = await supabase
    .from('survey_responses')
    .select('user_id_client, answers, submitted_at')
    .order('submitted_at', { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as any[];
  
  // Deduplicate
  const latestMap = new Map<string, any>();
  for (const r of rows) {
    if (!latestMap.has(r.user_id_client)) {
      latestMap.set(r.user_id_client, r);
    }
  }
  
  const dedupedRows = Array.from(latestMap.values());
  const nameByCuid = await getDisplayNameMap(dedupedRows.map((r) => r.user_id_client));

  const leads: ConsentLead[] = [];
  for (const row of dedupedRows) {
    const q7 = row.answers?.q7_consent as { consent?: string; contact?: string } | undefined;
    const contact = q7?.contact?.trim();
    if (!contact) continue;
    if (q7?.consent && q7.consent !== 'yes') continue;
    leads.push({
      uid: row.user_id_client,
      display_name: nameByCuid.get(row.user_id_client) ?? null,
      contact,
      submitted_at: row.submitted_at,
    });
  }
  return leads;
}

/* ============================================================================
   8. PEDAGOGY PHASES (v5) — practice attempts + per-lesson funnel
   ========================================================================= */

export type LessonFunnelRow = {
  lesson_id: string;
  lab_reached: number;
  distill_reached: number;
  practice_reached: number;
  quiz_reached: number;
};

export async function getLessonFunnel(): Promise<LessonFunnelRow[]> {
  const { data, error } = await supabase
    .from('v_lesson_funnel')
    .select('*')
    .order('lesson_id');
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => ({
    lesson_id: r.lesson_id,
    lab_reached:      Number(r.lab_reached) || 0,
    distill_reached:  Number(r.distill_reached) || 0,
    practice_reached: Number(r.practice_reached) || 0,
    quiz_reached:     Number(r.quiz_reached) || 0,
  }));
}

export type PracticeDrillRow = {
  lesson_id: string;
  drill_id: string;
  drill_kind: string | null;
  attempts: number;
  avg_correct: number;
  avg_wrong: number;
  avg_duration_ms: number | null;
};

export async function getPracticeDrillSummary(): Promise<PracticeDrillRow[]> {
  const { data, error } = await supabase
    .from('v_practice_drill_summary')
    .select('*')
    .order('lesson_id')
    .order('drill_id');
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => ({
    lesson_id: r.lesson_id,
    drill_id: r.drill_id,
    drill_kind: r.drill_kind ?? null,
    attempts: Number(r.attempts) || 0,
    avg_correct: Number(r.avg_correct) || 0,
    avg_wrong:   Number(r.avg_wrong)   || 0,
    avg_duration_ms: r.avg_duration_ms == null ? null : Number(r.avg_duration_ms),
  }));
}

export type PracticeAttempt = {
  id: number;
  client_uid: string;
  lesson_id: string;
  drill_id: string;
  drill_kind: string | null;
  correct_count: number;
  wrong_count: number;
  duration_ms: number | null;
  completed_at: string;
};

async function getPracticeAttemptsForClient(cuid: string): Promise<PracticeAttempt[]> {
  const { data, error } = await supabase
    .from('practice_attempts')
    .select('*')
    .eq('client_uid', cuid)
    .order('completed_at');
  if (error) throw error;
  return (data ?? []) as PracticeAttempt[];
}

/** Look up display_name for a list of client_uids in one round-trip. */
async function getDisplayNameMap(cuids: string[]): Promise<Map<string, string>> {
  if (cuids.length === 0) return new Map();
  const unique = Array.from(new Set(cuids));
  const { data } = await supabase
    .from('users')
    .select('client_uid, display_name')
    .in('client_uid', unique);
  const map = new Map<string, string>();
  for (const u of (data ?? []) as any[]) {
    if (u.display_name) map.set(u.client_uid, u.display_name);
  }
  return map;
}

/* ============================================================================
   7. SCREEN ANALYTICS — per-surface views / taps / avg time
   ========================================================================= */

export type ScreenAnalyticRow = {
  surface: string;
  views: number;
  taps: number;
  avg_time_ms: number;
};

export async function getScreenAnalytics(): Promise<ScreenAnalyticRow[]> {
  // Views and durations come from screen_views. Taps come from `events` —
  // mazy app emits non-`screen_view` events whose meta.screen_id (or path)
  // identifies the surface. We aggregate views per slug, average time, and
  // count companion events (taps) sharing the same surface.
  const [viewsRes, eventsRes] = await Promise.all([
    supabase.from('screen_views').select('screen_slug, time_spent_ms'),
    supabase.from('events').select('event, meta'),
  ]);
  if (viewsRes.error) throw viewsRes.error;
  if (eventsRes.error) throw eventsRes.error;

  type Acc = { views: number; total_ms: number; taps: number };
  const acc = new Map<string, Acc>();
  const ensure = (slug: string): Acc => {
    let v = acc.get(slug);
    if (!v) {
      v = { views: 0, total_ms: 0, taps: 0 };
      acc.set(slug, v);
    }
    return v;
  };

  for (const row of (viewsRes.data ?? []) as any[]) {
    const v = ensure(row.screen_slug);
    v.views += 1;
    v.total_ms += row.time_spent_ms ?? 0;
  }

  for (const e of (eventsRes.data ?? []) as any[]) {
    if (e.event === 'screen_view') continue; // already counted as a view
    const slug = (e.meta?.screen_id as string) || (e.meta?.surface as string);
    if (!slug) continue;
    ensure(slug).taps += 1;
  }

  const rows: ScreenAnalyticRow[] = [];
  for (const [surface, v] of acc) {
    rows.push({
      surface,
      views: v.views,
      taps: v.taps,
      avg_time_ms: v.views > 0 ? Math.round(v.total_ms / v.views) : 0,
    });
  }
  rows.sort((a, b) => b.views - a.views);
  return rows;
}
