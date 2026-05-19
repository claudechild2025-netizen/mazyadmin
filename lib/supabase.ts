'use client';

import { createBrowserClient } from '@supabase/ssr';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://stub.supabase.co';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'stub-anon-key';

/*
  Browser-side Supabase client used by the researcher dashboard. Auth flows
  through this same client (magic link), so the session cookie is set by
  @supabase/ssr automatically. Server-side reads are not needed for v1 — the
  dashboard fetches everything client-side after login.
*/
export const supabase = createBrowserClient(url, anonKey);
