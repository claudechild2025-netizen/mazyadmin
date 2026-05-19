'use client';

import { useEffect, useState } from 'react';
import { AuthGate } from '@/components/AuthGate';
import { Sidebar } from '@/components/Sidebar';
import { getConsentLeads, type ConsentLead } from '@/lib/queries';

/*
  /leads — Q7 consenting respondents with their contact details.
*/
export default function LeadsPage() {
  return (
    <AuthGate>
      <LeadsShell />
    </AuthGate>
  );
}

function LeadsShell() {
  const [leads, setLeads] = useState<ConsentLead[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getConsentLeads()
      .then((r) => setLeads(r))
      .catch(() => setLeads([]))
      .finally(() => setLoaded(true));
  }, []);

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <main className="flex-1 px-6 py-8 lg:px-10">
        <header>
          <h1 className="text-2xl font-bold text-slate-900">
            Холбоо барих жагсаалт
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Q7-д "Тийм" гэж хариулсан хүмүүсийн холбоо мэдээлэл.
          </p>
        </header>

        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2 text-left">Нэр</th>
                <th className="text-left">Холбоо барих</th>
                <th className="text-left">Огноо</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((c) => (
                <tr key={c.uid + c.submitted_at} className="border-t border-slate-100">
                  <td className="py-2">
                    <span className="font-medium text-slate-900">
                      {c.display_name || c.uid.slice(0, 8)}
                    </span>
                  </td>
                  <td>{c.contact}</td>
                  <td className="text-slate-500">
                    {new Date(c.submitted_at).toLocaleString('mn-MN')}
                  </td>
                </tr>
              ))}
              {loaded && leads.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="py-6 text-center text-sm text-slate-500"
                  >
                    Одоогоор бүртгэлтэй холбоо мэдээлэл алга.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
