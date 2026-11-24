// path: apps/web/src/app/r/c/vadmin/page.tsx
// purpose: The hidden admin entry point (/r/c/vadmin). Email + password, then the authenticator-app code, then on to /admin. Creates the first admin once, when no admin exists.
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AdminLogin } from '@/components/admin/AdminLogin';
import { getAdminSession } from '@/lib/admin-auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Sign in', robots: { index: false, follow: false } };

export default async function AdminEntry() {
  const session = await getAdminSession();
  if (session) redirect(session.user.twoFactorEnabled ? '/admin' : '/r/c/vadmin/setup');
  const firstRun = (await db.user.count()) === 0;
  return <AdminLogin firstRun={firstRun} />;
}
