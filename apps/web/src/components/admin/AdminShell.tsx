'use client';
// path: apps/web/src/components/admin/AdminShell.tsx
// purpose: Admin layout. A coloured sidebar on large screens that becomes a top navigation bar on smaller screens, with sign-out.
import { BarChart3, CreditCard, LayoutDashboard, LogOut, Users, Webhook, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { authClient } from '@/lib/auth-client';

const NAV: { href: string; label: string; icon: LucideIcon; icon_color: string; active: string }[] = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, icon_color: 'text-indigo-300', active: 'bg-indigo-500/25 text-white' },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3, icon_color: 'text-sky-300', active: 'bg-sky-500/25 text-white' },
  { href: '/admin/customers', label: 'Customers', icon: Users, icon_color: 'text-emerald-300', active: 'bg-emerald-500/25 text-white' },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard, icon_color: 'text-amber-300', active: 'bg-amber-500/25 text-white' },
  { href: '/admin/events', label: 'Webhooks', icon: Webhook, icon_color: 'text-rose-300', active: 'bg-rose-500/25 text-white' },
];

export function AdminShell({ email, children }: { email: string; children: ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));
  const signOut = async () => { await authClient.signOut(); window.location.href = '/'; };

  return (
    <div className="min-h-dvh bg-slate-100 text-slate-900">
      {/* Large screens: sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-linear-to-b from-indigo-950 via-indigo-900 to-slate-900 p-5 lg:flex">
        <div className="mb-8 flex items-center gap-3 px-2 text-white">
          <span className="grid size-10 place-items-center rounded-xl bg-indigo-500"><svg viewBox="0 0 24 24" className="size-5" aria-hidden="true"><path d="M12 2C7.6 2 5 5.3 5 9.5V21l2.5-2 2.3 2 2.2-2 2.2 2 2.3-2 2.5 2V9.5C19 5.3 16.4 2 12 2z" fill="currentColor" /></svg></span>
          <div><p className="font-semibold leading-tight">GhostDesk</p><p className="text-xs text-indigo-300">Control room</p></div>
        </div>
        <nav className="flex flex-1 flex-col gap-1" aria-label="Admin">
          {NAV.map(({ href, label, icon: Icon, icon_color, active }) => (
            <Link key={href} href={href} aria-current={isActive(href) ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${isActive(href) ? active : 'text-indigo-100/80 hover:bg-white/10'}`}>
              <Icon size={18} className={icon_color} />{label}
            </Link>
          ))}
        </nav>
        <div className="rounded-xl bg-white/10 p-3 text-xs text-indigo-100">
          <p className="truncate">{email}</p>
          <button onClick={() => void signOut()} className="mt-2 flex items-center gap-2 font-semibold text-rose-300 hover:text-rose-200"><LogOut size={15} />Sign out</button>
        </div>
      </aside>

      {/* Smaller screens: top navigation bar */}
      <header className="sticky top-0 z-30 bg-linear-to-r from-indigo-950 to-indigo-800 text-white lg:hidden">
        <div className="flex items-center justify-between px-4 pt-3">
          <p className="font-semibold">GhostDesk <span className="text-indigo-300">Control room</span></p>
          <button onClick={() => void signOut()} className="flex items-center gap-1.5 text-sm font-semibold text-rose-300"><LogOut size={15} />Sign out</button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 py-2" aria-label="Admin">
          {NAV.map(({ href, label, icon: Icon, icon_color, active }) => (
            <Link key={href} href={href} aria-current={isActive(href) ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium ${isActive(href) ? active : 'text-indigo-100/80'}`}>
              <Icon size={16} className={icon_color} />{label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="px-4 py-6 sm:px-8 lg:ml-64 lg:py-8">{children}</main>
    </div>
  );
}
