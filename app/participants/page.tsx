'use client';

import { useEffect, useState } from 'react';
import { AuthGate } from '@/components/AuthGate';
import { Sidebar } from '@/components/Sidebar';
import { ParticipantTable } from '@/components/ParticipantTable';
import { getParticipants, type ParticipantRow } from '@/lib/queries';

export default function ParticipantsPage() {
  return (
    <AuthGate>
      <ParticipantsShell />
    </AuthGate>
  );
}

function ParticipantsShell() {
  const [rows, setRows] = useState<ParticipantRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getParticipants()
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoaded(true));
  }, []);

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <main className="flex-1 px-6 py-8 lg:px-10">
        <header>
          <h1 className="text-2xl font-bold text-slate-900">Оролцогчид</h1>
          <p className="mt-1 text-sm text-slate-500">
            Бүх оролцогчдын жагсаалт · Mazy + Уламжлалт хариулт · Дэлгэрэнгүй болон ажиглалтыг мөр дээр товшиж нээнэ
          </p>
        </header>

        <div className="mt-6">
          {!loaded ? (
            <p className="text-sm text-slate-400">Уншиж байна...</p>
          ) : (
            <ParticipantTable rows={rows} />
          )}
        </div>
      </main>
    </div>
  );
}
