'use client';

import { supabase } from './supabase';

/*
  Admin auth helpers.

  Two paths exist for nevtr:
    1. Supabase magic-link (production) — requires NEXT_PUBLIC_SUPABASE_URL/KEY
       to point at a real project.
    2. Dev password (fallback) — any time the env vars are missing or stub,
       the dashboard accepts a hardcoded password and stores a localStorage
       flag. Useful for local screenshots and the 3-day usability test
       window where Supabase isn't required to demo the UI.

  The dev password defaults to 'mazy-2026' but can be overridden by
  NEXT_PUBLIC_ADMIN_DEV_PASSWORD in .env.local.

  AuthGate accepts EITHER signal as a valid session.
*/

const DEV_FLAG = 'mzl_admin_dev_session';
const DEFAULT_DEV_PASSWORD = 'mazy-2026';

export function getDevPassword(): string {
  return process.env.NEXT_PUBLIC_ADMIN_DEV_PASSWORD || DEFAULT_DEV_PASSWORD;
}

export function hasSupabaseEnv(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return Boolean(url && url.length > 0 && !url.includes('stub'));
}

export function setDevSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DEV_FLAG, '1');
}

export function clearDevSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(DEV_FLAG);
}

export function hasDevSession(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(DEV_FLAG) === '1';
}

/** Returns true when the user has *some* valid signal: Supabase or dev. */
export async function isAuthenticated(): Promise<boolean> {
  if (hasDevSession()) return true;
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session);
}

/** Sign out from both Supabase and dev. Safe to call when neither is active. */
export async function signOut(): Promise<void> {
  clearDevSession();
  try {
    await supabase.auth.signOut();
  } catch {
    // Network failure — dev flag is already cleared, redirect proceeds anyway.
  }
}
