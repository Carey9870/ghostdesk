// path: apps/web/src/lib/fulfil.ts
// purpose: Turns a successful Paystack charge into a license (or extends an existing one). Idempotent: webhook and the welcome page can both call it.
import { CURRENCY, GRACE_DAYS, PLAN_IDS, PLANS, type PlanId } from '@ghostdesk/shared';
import { Prisma, type License } from '@prisma/client';
import { db } from './db';
import { addDays, generateKey } from './license';
import { recordEvent } from './analytics';
import { sendLicenseEmail } from './mail';
import { planFromCode, verifyTransaction, type PaystackTransaction } from './paystack';

export interface Fulfilment { license: License; created: boolean }

function planOf(tx: PaystackTransaction): PlanId | null {
  const fromCode = planFromCode(tx.plan?.plan_code);
  if (fromCode) return fromCode;
  const meta = typeof tx.metadata === 'object' && tx.metadata ? tx.metadata.plan : undefined;
  return (PLAN_IDS as readonly string[]).includes(meta ?? '') ? (meta as PlanId) : null;
}

/** Returns null for charges that are not a GhostDesk subscription payment. Throws when amount or currency do not match the plan. */
export async function fulfilCharge(tx: PaystackTransaction): Promise<Fulfilment | null> {
  if (tx.status !== 'success') return null;
  const planId = planOf(tx);
  if (!planId) return null;
  const plan = PLANS[planId];
  if (tx.amount !== plan.cents || tx.currency !== CURRENCY) throw new Error(`Charge ${tx.reference} does not match the ${planId} plan`);

  const existing = await db.payment.findUnique({ where: { reference: tx.reference }, include: { license: true } });
  if (existing) return { license: existing.license, created: false };

  const paidAt = new Date(tx.paid_at ?? Date.now());
  const until = addDays(paidAt, plan.days + GRACE_DAYS);
  let result: Fulfilment;
  try {
    result = await db.$transaction(async (t) => {
      let license = await t.license.findFirst({ where: { customerCode: tx.customer.customer_code, plan: planId }, orderBy: { createdAt: 'desc' } });
      let created = false;
      if (license) {
        license = await t.license.update({ where: { id: license.id }, data: { status: 'ACTIVE', accessUntil: license.accessUntil > until ? license.accessUntil : until } });
      } else {
        license = await t.license.create({ data: { key: generateKey(), email: tx.customer.email, plan: planId, customerCode: tx.customer.customer_code, accessUntil: until } });
        created = true;
      }
      await t.payment.create({ data: { reference: tx.reference, licenseId: license.id, amount: tx.amount, currency: tx.currency, paidAt } });
      return { license, created };
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const again = await db.payment.findUnique({ where: { reference: tx.reference }, include: { license: true } });
      if (again) return { license: again.license, created: false };
    }
    throw e;
  }
  await recordEvent('payment_completed', { plan: planId });
  if (result.created) {
    await sendLicenseEmail(result.license.email, result.license.key).catch((e) => console.error('license email failed', e));
  }
  return result;
}

/** Verifies a reference with Paystack, then fulfils it. Used by the welcome page after checkout. */
export async function fulfilReference(reference: string): Promise<Fulfilment | null> {
  return fulfilCharge(await verifyTransaction(reference));
}
