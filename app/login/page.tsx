'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  getDevPassword,
  hasDevSession,
  hasSupabaseEnv,
  setDevSession,
} from '@/lib/auth';

/*
  /login — entry for the researcher dashboard.

  Two paths, picked by env:
    - hasSupabaseEnv() === true  → Supabase magic-link form
    - hasSupabaseEnv() === false → dev password form (`mazy-2026` by default)

  In either case we land back at `/` after a successful sign-in.
*/
export default function LoginPage() {
  const router = useRouter();
  const supaMode = hasSupabaseEnv();

  // Skip the form entirely if a session already exists (clicked a magic link).
  useEffect(() => {
    if (hasDevSession()) {
      router.replace('/');
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/');
    });
  }, [router]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-lg font-bold text-slate-900">Mazy Admin</h1>
        <p className="mt-1 text-sm text-slate-500">
          {supaMode
            ? 'Имэйл хаягаараа нэвтэрнэ үү. Бид magic link илгээнэ.'
            : 'Хөгжүүлэлтийн горим — нууц үгээр түр нэвтэрнэ үү.'}
        </p>

        {supaMode ? <MagicLinkForm /> : <DevPasswordForm />}
      </div>
    </main>
  );
}

function MagicLinkForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus('sending');
    setErrorMessage(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
          typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    });
    if (error) {
      setStatus('error');
      setErrorMessage(error.message);
    } else {
      setStatus('sent');
    }
  };

  return (
    <form onSubmit={send} className="mt-4">
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Имэйл
        </span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="researcher@example.com"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
        />
      </label>

      <button
        type="submit"
        disabled={status === 'sending'}
        className="mt-4 flex h-10 w-full items-center justify-center rounded-lg bg-slate-900 text-sm font-semibold text-white disabled:opacity-40"
      >
        {status === 'sending' ? 'Илгээж байна…' : 'Magic link илгээх'}
      </button>

      {status === 'sent' && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          Имэйлийг шалгаад линк дээр дарна уу.
        </p>
      )}
      {status === 'error' && errorMessage && (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {errorMessage}
        </p>
      )}
    </form>
  );
}

function DevPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === getDevPassword()) {
      setDevSession();
      router.replace('/');
      return;
    }
    setError('Нууц үг буруу байна.');
  };

  return (
    <form onSubmit={submit} className="mt-4">
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Нууц үг
        </span>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(null);
          }}
          placeholder="••••••••"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
        />
      </label>

      <button
        type="submit"
        className="mt-4 flex h-10 w-full items-center justify-center rounded-lg bg-slate-900 text-sm font-semibold text-white"
      >
        Нэвтрэх
      </button>

      {error && (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {error}
        </p>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
        Хөгжүүлэлтийн нууц үг нь <code className="rounded bg-slate-100 px-1">mazy-2026</code>{' '}
        — production-д Supabase magic link идэвхжинэ.
      </p>
    </form>
  );
}
