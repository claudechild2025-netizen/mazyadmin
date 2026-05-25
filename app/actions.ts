'use server'

import { createClient } from '@supabase/supabase-js'

export async function deleteUserAction(id: string) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY тохируулагдаагүй байна. .env.local файлд нэмнэ үү.');
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  );

  // 1. Get client_uid + display_name
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('client_uid, display_name')
    .eq('id', id)
    .single();

  if (userError) throw new Error('Хэрэглэгч олдсонгүй: ' + userError.message);
  const clientUid = user.client_uid as string | null;
  const displayName = user.display_name as string | null;

  // 2. Delete from all loosely-coupled tables (use Promise.allSettled so a
  //    missing table or RLS rejection on one doesn't abort the rest).
  const cleanups: Promise<{ error: unknown | null; label: string }>[] = [];
  const sb = (label: string, p: PromiseLike<any>) =>
    cleanups.push(Promise.resolve(p).then((r) => ({ error: r.error ?? null, label })));

  if (clientUid) {
    sb('screen_views',         supabase.from('screen_views').delete().eq('client_uid', clientUid));
    sb('quiz_answers',         supabase.from('quiz_answers').delete().eq('client_uid', clientUid));
    sb('events',               supabase.from('events').delete().eq('user_id', clientUid));
    sb('survey_responses',     supabase.from('survey_responses').delete().eq('user_id_client', clientUid));
    sb('practice_attempts',    supabase.from('practice_attempts').delete().eq('client_uid', clientUid));
    sb('live_screen_sessions', supabase.from('live_screen_sessions').delete().eq('client_uid', clientUid));
  }
  // observation_events keys by participant_id which holds display_name (with
  // client_uid slice as a fallback used by ObservationPopup).
  const obsKeys = [displayName, clientUid ? clientUid.slice(0, 8) : null].filter(Boolean) as string[];
  for (const k of obsKeys) {
    sb('observation_events',   supabase.from('observation_events').delete().eq('participant_id', k));
  }

  const results = await Promise.all(cleanups);
  const failed = results.filter((r) => r.error);
  if (failed.length > 0) {
    // Don't abort — surface a warning by logging. The user row is still
    // safe to drop and the orphans (if any) can be retried by the next call.
    console.warn('[deleteUserAction] cleanup partial failures:',
      failed.map((f) => `${f.label}: ${(f.error as any)?.message ?? f.error}`).join(' | '),
    );
  }

  // 3. Delete user row last (cascades strict FKs like sus_responses, quiz_attempts)
  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) {
    throw new Error(error.message);
  }
}
