// path: apps/web/scripts/create-plans.ts
// purpose: One-off script that creates the weekly (USD 5) and yearly (USD 20) subscription plans on Paystack and prints their codes.
import { PLANS, PLAN_IDS } from '@ghostdesk/shared';

const secret = process.env.PAYSTACK_SECRET_KEY;
if (!secret) throw new Error('Set PAYSTACK_SECRET_KEY in apps/web/.env first.');

for (const id of PLAN_IDS) {
  const plan = PLANS[id];
  const res = await fetch('https://api.paystack.co/plan', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: `GhostDesk ${plan.label}`, interval: plan.interval, amount: plan.cents, currency: 'USD' }),
  });
  const body = (await res.json()) as { status: boolean; message: string; data?: { plan_code: string } };
  if (!res.ok || !body.status || !body.data) throw new Error(`${plan.label}: ${body.message}`);
  console.log(`PAYSTACK_PLAN_${id.toUpperCase()}=${body.data.plan_code}`);
}
