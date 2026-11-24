// path: apps/web/src/app/r/c/vadmin/setup/page.tsx
// purpose: Hidden page where a signed-in admin links an authenticator app (two-factor is mandatory before the dashboard opens).
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { TwoFactorSetup } from '@/components/admin/TwoFactorSetup';
import { getAdminSession } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Set up two-factor', robots: { index: false, follow: false } };

export default async function AdminSetup() {
  const session = await getAdminSession();
  if (!session) notFound();
  if (session.user.twoFactorEnabled) redirect('/admin');
  return <TwoFactorSetup email={session.user.email} />;
}
