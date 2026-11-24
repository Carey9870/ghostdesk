'use server';
// path: apps/web/src/app/admin/(panel)/actions.ts
// purpose: Admin server actions: resend the license email, extend or revoke access, reset devices. Every action re-checks the admin session and two-factor.
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireAdminAction } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { addDays } from '@/lib/license';
import { sendLicenseEmail } from '@/lib/mail';

const id = z.string().min(5).max(40);
const done = (licenseId: string, msg: string) => { revalidatePath(`/admin/customers/${licenseId}`); redirect(`/admin/customers/${licenseId}?msg=${msg}`); };

export async function resendEmail(form: FormData) {
  await requireAdminAction();
  const licenseId = id.parse(form.get('id'));
  const license = await db.license.findUnique({ where: { id: licenseId } });
  if (!license) redirect('/admin/customers');
  let msg = 'email-sent';
  try { await sendLicenseEmail(license.email, license.key); } catch (e) { console.error('admin resend failed', e); msg = 'email-failed'; }
  done(licenseId, msg);
}

export async function extendAccess(form: FormData) {
  await requireAdminAction();
  const licenseId = id.parse(form.get('id'));
  const days = z.coerce.number().int().min(1).max(3650).parse(form.get('days'));
  const license = await db.license.findUnique({ where: { id: licenseId } });
  if (!license) redirect('/admin/customers');
  const from = license.accessUntil > new Date() ? license.accessUntil : new Date();
  await db.license.update({ where: { id: licenseId }, data: { accessUntil: addDays(from, days), status: 'ACTIVE' } });
  done(licenseId, 'extended');
}

export async function setStatus(form: FormData) {
  await requireAdminAction();
  const licenseId = id.parse(form.get('id'));
  const status = z.enum(['ACTIVE', 'DISABLED']).parse(form.get('status'));
  await db.license.update({ where: { id: licenseId }, data: { status } });
  done(licenseId, 'status');
}

export async function resetDevices(form: FormData) {
  await requireAdminAction();
  const licenseId = id.parse(form.get('id'));
  await db.activation.deleteMany({ where: { licenseId } });
  done(licenseId, 'devices');
}
