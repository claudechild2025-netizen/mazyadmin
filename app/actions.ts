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

  // 1. Get client_uid
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('client_uid')
    .eq('id', id)
    .single();

  if (userError) throw new Error('Хэрэглэгч олдсонгүй: ' + userError.message);
  const clientUid = user.client_uid;

  // 2. Delete from all loosely-coupled tables
  if (clientUid) {
    await Promise.all([
      supabase.from('screen_views').delete().eq('client_uid', clientUid),
      supabase.from('quiz_answers').delete().eq('client_uid', clientUid),
      supabase.from('events').delete().eq('user_id', clientUid),
      supabase.from('survey_responses').delete().eq('user_id_client', clientUid),
      supabase.from('practice_attempts').delete().eq('client_uid', clientUid),
    ]);
  }

  // 3. Delete user row (cascades strict FKs like sus_responses, quiz_attempts)
  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) {
    throw new Error(error.message);
  }
}
