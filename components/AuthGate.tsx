'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';

/*
  Wraps protected pages — redirects to /login when neither a Supabase session
  nor the dev-mode flag is present.
*/
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    isAuthenticated().then((ok) => {
      if (!ok) {
        router.replace('/login');
        return;
      }
      setReady(true);
    });
  }, [router]);

  if (!ready) {
    return (
      <main className="flex min-h-dvh items-center justify-center text-sm text-slate-500">
        Шалгаж байна…
      </main>
    );
  }
  return <>{children}</>;
}
