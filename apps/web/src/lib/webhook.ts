// path: apps/web/src/lib/webhook.ts
// purpose: Maps Paystack subscription and invoice events onto license state (renewals, cancellations, payment problems).
import { GRACE_DAYS } from '@ghostdesk/shared';
import { db } from './db';
import { fulfilCharge } from './fulfil';
import { addDays } from './license';
import { planFromCode, type PaystackTransaction } from './paystack';

interface SubscriptionData {
  subscription_code?: string;
  email_token?: string;
  next_payment_date?: string | null;
  customer?: { customer_code: string };
  plan?: { plan_code?: string } | null;
}

const afterGrace = (iso?: string | null) => (iso ? addDays(new Date(iso), GRACE_DAYS) : null);

/** Throws when the related license does not exist yet; Paystack then retries, by which time charge.success has been processed. */
async function bySubscription(code?: string) {
  if (!code) throw new Error('Event has no subscription code');
  const license = await db.license.findUnique({ where: { subscriptionCode: code } });
  if (!license) throw new Error(`No license for subscription ${code}`);
  return license;
}

export async function handleEvent(event: { event: string; data: unknown }): Promise<void> {
  switch (event.event) {
    case 'charge.success':
      await fulfilCharge(event.data as PaystackTransaction);
      return;

    case 'subscription.create': {
      const d = event.data as SubscriptionData;
      const plan = planFromCode(d.plan?.plan_code);
      const license = await db.license.findFirst({ where: { customerCode: d.customer?.customer_code ?? '', plan: plan ?? undefined }, orderBy: { createdAt: 'desc' } });
      if (!license || !d.subscription_code) throw new Error('License not ready for subscription.create');
      const until = afterGrace(d.next_payment_date);
      await db.license.update({
        where: { id: license.id },
        data: { subscriptionCode: d.subscription_code, emailToken: d.email_token, accessUntil: until && until > license.accessUntil ? until : license.accessUntil },
      });
      return;
    }

    case 'subscription.not_renew': {
      const l = await bySubscription((event.data as SubscriptionData).subscription_code);
      await db.license.update({ where: { id: l.id }, data: { status: 'NON_RENEWING' } });
      return;
    }

    case 'subscription.disable': {
      const l = await bySubscription((event.data as SubscriptionData).subscription_code);
      await db.license.update({ where: { id: l.id }, data: { status: 'DISABLED' } });
      return;
    }

    case 'invoice.payment_failed': {
      const l = await bySubscription((event.data as { subscription?: SubscriptionData }).subscription?.subscription_code);
      if (l.status !== 'DISABLED') await db.license.update({ where: { id: l.id }, data: { status: 'ATTENTION' } });
      return;
    }

    case 'invoice.update': {
      const d = event.data as { paid?: boolean | number; subscription?: SubscriptionData };
      if (!d.paid) return;
      const l = await bySubscription(d.subscription?.subscription_code);
      const until = afterGrace(d.subscription?.next_payment_date);
      await db.license.update({ where: { id: l.id }, data: { status: 'ACTIVE', accessUntil: until && until > l.accessUntil ? until : l.accessUntil } });
      return;
    }

    default:
      return; // events we don't act on are acknowledged
  }
}
