// path: apps/web/src/app/admin/(panel)/layout.tsx
// purpose: Guards every admin page. Strangers get a 404; admins without two-factor are sent to set it up; the rest see the dashboard shell.
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const session = await requireAdmin();
  return <AdminShell email={session.user.email}>{children}</AdminShell>;
}
