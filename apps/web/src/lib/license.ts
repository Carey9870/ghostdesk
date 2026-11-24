// path: apps/web/src/lib/license.ts
// purpose: License keys, entitlement rules, signed Ed25519 tokens and device registration.
import { createPrivateKey, randomBytes, sign } from 'node:crypto';
import { MAX_DEVICES, TOKEN_DAYS } from '@ghostdesk/shared';
import type { License } from '@prisma/client';
import { db } from './db';
import { recordEvent } from './analytics';
import { env } from './env';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** 16 random characters from a 32-symbol alphabet: GD-XXXX-XXXX-XXXX-XXXX (80 bits). */
export function generateKey(): string {
  const chars = [...randomBytes(16)].map((b) => ALPHABET[b & 31]).join('');
  return `GD-${chars.match(/.{4}/g)!.join('-')}`;
}

export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

/** NON_RENEWING and ATTENTION keep access until the paid period (plus grace) ends; DISABLED does not. */
export const isEntitled = (l: Pick<License, 'status' | 'accessUntil'>, now = new Date()) => l.status !== 'DISABLED' && now < l.accessUntil;

export function signToken(l: License, now = new Date()): { token: string; exp: Date } {
  const exp = new Date(Math.min(addDays(now, TOKEN_DAYS).getTime(), l.accessUntil.getTime()));
  const claims = { v: 1, sub: l.id, plan: l.plan, iat: Math.floor(now.getTime() / 1000), exp: Math.floor(exp.getTime() / 1000) };
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const key = createPrivateKey({ key: Buffer.from(env().LICENSE_SIGNING_KEY, 'base64'), format: 'der', type: 'pkcs8' });
  const signature = sign(null, Buffer.from(`GD1.${payload}`), key).toString('base64url');
  return { token: `GD1.${payload}.${signature}`, exp };
}

/** Registers the device, or returns false when the licence already has MAX_DEVICES other devices. */
export async function registerDevice(licenseId: string, deviceId: string): Promise<boolean> {
  const existing = await db.activation.findUnique({ where: { licenseId_deviceId: { licenseId, deviceId } } });
  if (existing) { await db.activation.update({ where: { id: existing.id }, data: { lastSeenAt: new Date() } }); return true; }
  if ((await db.activation.count({ where: { licenseId } })) >= MAX_DEVICES) return false;
  await db.activation.create({ data: { licenseId, deviceId } });
  await recordEvent('license_activated');
  return true;
}
