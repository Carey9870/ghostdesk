
// path: apps/web/scripts/verify-plans.ts
// Purpose: Verify that configured Paystack subscription plans
// exist and match the expected GhostDesk subscription catalogue.

import { PLANS, PLAN_IDS } from '@ghostdesk/shared';

const secret = process.env.PAYSTACK_SECRET_KEY;
const weeklyCode = process.env.PAYSTACK_PLAN_WEEKLY;
const yearlyCode = process.env.PAYSTACK_PLAN_YEARLY;

if (!secret) {
  throw new Error('PAYSTACK_SECRET_KEY is missing.');
}

if (!weeklyCode || !yearlyCode) {
  throw new Error('Both Paystack plan codes must be configured.');
}

const configuredCodes: Record<string, string> = {
  weekly: weeklyCode,
  yearly: yearlyCode,
};

type PaystackPlan = {
  plan_code: string;
  name: string;
  amount: number;
  interval: string;
  currency: string;
  domain: string;
};

async function verifyPlan(id: (typeof PLAN_IDS)[number]) {
  const expected = PLANS[id];
  const code = configuredCodes[id];

  const response = await fetch(
    `https://api.paystack.co/plan/${encodeURIComponent(code)}`,
    {
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    },
  );

  const result = await response.json() as {
    status: boolean;
    message: string;
    data?: PaystackPlan;
  };

  if (!response.ok || !result.status || !result.data) {
    throw new Error(`${id}: ${result.message}`);
  }

  const actual = result.data;

  const mismatches: string[] = [];

  if (actual.plan_code !== code) {
    mismatches.push('Plan code mismatch');
  }

  if (actual.amount !== expected.cents) {
    mismatches.push(
      `Amount mismatch: expected ${expected.cents}, received ${actual.amount}`,
    );
  }

  if (actual.currency !== 'USD') {
    mismatches.push(`Currency mismatch: ${actual.currency}`);
  }

  if (actual.interval !== expected.interval) {
    mismatches.push(`Interval mismatch: ${actual.interval}`);
  }

  if (actual.domain !== 'live') {
    mismatches.push(`Expected live plan, received ${actual.domain}`);
  }

  if (mismatches.length) {
    throw new Error(`${id} plan invalid:\n${mismatches.join('\n')}`);
  }

  console.log(`✓ ${id}: ${code}`);
  console.log(`  Amount: ${actual.amount}`);
  console.log(`  Currency: ${actual.currency}`);
  console.log(`  Interval: ${actual.interval}`);
  console.log(`  Environment: ${actual.domain}`);
}

for (const id of PLAN_IDS) {
  await verifyPlan(id);
}

console.log('\nAll GhostDesk subscription plans verified.');
