'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, ClipboardList, UserCheck, LogOut, BarChart3 } from 'lucide-react';
import { signOut as authSignOut } from '@/lib/auth';

const ITEMS = [
  { href: '/',        label: 'Хяналт',              Icon: LayoutDashboard },
  { href: '/survey',  label: 'Санал асуулга',        Icon: ClipboardList },
  { href: '/likert',  label: 'Likert · Mazy vs Legacy', Icon: BarChart3 },
  { href: '/leads',   label: 'Холбоо барих',         Icon: UserCheck },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const signOut = async () => {
    await authSignOut();
    router.replace('/login');
  };

  return (
    <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white p-4 lg:block">
      <p className="px-2 text-sm font-bold text-slate-900">Mazy Admin</p>
      <p className="mt-0.5 px-2 text-xs text-slate-500">Судлаачийн самбар</p>

      <nav className="mt-6 space-y-1">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={
                active
                  ? 'flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white'
                  : 'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100'
              }
            >
              <Icon size={16} strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={signOut}
        className="mt-8 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
      >
        <LogOut size={16} strokeWidth={2} />
        Гарах
      </button>
    </aside>
  );
}
