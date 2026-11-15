// path: apps/web/src/lib/paystack.ts
// purpose: Paystack API client (initialize, verify, manage link) and webhook signature verification following Paystack's documented algorithm.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { CURRENCY, PLANS, type PlanId } from '@ghostdesk/shared';
import { env } from './env';

const BASE = 'https://api.paystack.co';

export class PaystackError extends Error {}

async function ps<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(BASE + path, {
    ...init,
    cache: 'no-store',
    headers: { Authorization: `Bearer ${env().PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json', ...(init.headers as Record<string, string> | undefined) },
  });
  const body = (await res.json().catch(() => null)) as { status?: boolean; message?: string; data?: T } | null;
  if (!res.ok || !body?.status) throw new PaystackError(body?.message ?? `Paystack request failed (${res.status})`);
  return body.data as T;
}

export const planCode = (id: PlanId) => (id === 'weekly' ? env().PAYSTACK_PLAN_WEEKLY : env().PAYSTACK_PLAN_YEARLY);

export function planFromCode(code?: string | null): PlanId | null {
  if (!code) return null;
  if (code === env().PAYSTACK_PLAN_WEEKLY) return 'weekly';
  if (code === env().PAYSTACK_PLAN_YEARLY) return 'yearly';
  return null;
}

export interface PaystackTransaction {
  reference: string;
  status: string;
  amount: number;
  currency: string;
  paid_at?: string | null;
  customer: { email: string; customer_code: string };
  plan?: { plan_code?: string } | null;
  metadata?: { plan?: string } | string | null;
}

/** Starts a subscription checkout. When `plan` is sent, Paystack charges the plan amount. */
export const initializeTransaction = (p: { email: string; plan: PlanId; callbackUrl: string }) =>
  ps<{ access_code: string; reference: string; authorization_url: string }>('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({ email: p.email, amount: PLANS[p.plan].cents, currency: CURRENCY, plan: planCode(p.plan), callback_url: p.callbackUrl, metadata: { plan: p.plan } }),
  });

export const verifyTransaction = (reference: string) => ps<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);

export const manageLink = (subscriptionCode: string) => ps<{ link: string }>(`/subscription/${encodeURIComponent(subscriptionCode)}/manage/link`);

const HEX128 = /^[0-9a-f]{128}$/;

/**
 * Verifies a webhook against the raw request body.
 * Preferred: `Paystack-Signature: t=...,v1=<kid>:<hex>` (HMAC SHA512 of `t.` + body with the whsec_ secret, 300 s tolerance).
 * Fallback while no signing secret exists: `x-paystack-signature` (HMAC SHA512 of the body with the secret key).
 */
export function verifyWebhookSignature(raw: Buffer, headers: Headers, now = Math.floor(Date.now() / 1000)): boolean {
  const header = headers.get('paystack-signature');
  const secret = env().PAYSTACK_WEBHOOK_SECRET;
  if (header && secret) {
    let t: number | null = null;
    const sigs: string[] = [];
    for (const part of header.split(',')) {
      const i = part.indexOf('=');
      if (i < 0) continue;
      const k = part.slice(0, i).trim();
      const v = part.slice(i + 1).trim();
      if (k === 't') { if (t !== null || !/^[0-9]+$/.test(v)) return false; t = Number(v); }
      else if (k === 'v1') { const j = v.indexOf(':'); if (j >= 0) sigs.push(v.slice(j + 1)); }
    }
    if (t === null || sigs.length === 0 || Math.abs(now - t) > 300) return false;
    const expected = createHmac('sha512', secret).update(`${t}.`).update(raw).digest();
    return sigs.some((hex) => HEX128.test(hex) && timingSafeEqual(expected, Buffer.from(hex, 'hex')));
  }
  const legacy = headers.get('x-paystack-signature');
  if (!legacy || !HEX128.test(legacy)) return false;
  const expected = createHmac('sha512', env().PAYSTACK_SECRET_KEY).update(raw).digest();
  return timingSafeEqual(expected, Buffer.from(legacy, 'hex'));
}
