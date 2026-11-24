// path: apps/web/src/lib/admin-auth.ts
// purpose: Server-side guards for the admin area. Anyone who is not a signed-in admin with two-factor enabled gets a 404, so /admin looks like it does not exist.
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getAuth, isAdminEmail } from './auth';

/** The signed-in admin (allow-listed email), or null. May not have two-factor enabled yet. */
export async function getAdminSession() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session || !isAdminEmail(session.user.email)) return null;
  return session;
}

/** For admin pages: 404 for strangers, set-up page when two-factor is not enabled yet. */
export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) notFound();
  if (!session.user.twoFactorEnabled) redirect('/r/c/vadmin/setup');
  return session;
}

/** For server actions: throws instead of redirecting. */
export async function requireAdminAction() {
  const session = await getAdminSession();
  if (!session || !session.user.twoFactorEnabled) throw new Error('Unauthorized');
  return session;
}
