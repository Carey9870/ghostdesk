// path: packages/shared/src/plans.ts
// purpose: Subscription plan catalogue, license-key format and limits shared by the website and the desktop app.
export const PLAN_IDS = ['weekly', 'yearly'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export interface Plan {
  id: PlanId;
  label: string;
  /** Price in US cents, the unit Paystack expects. */
  cents: number;
  priceUsd: number;
  period: 'week' | 'year';
  /** Length of one billing period in days. */
  days: number;
  /** Paystack plan interval. */
  interval: 'weekly' | 'annually';
}

export const PLANS: Record<PlanId, Plan> = {
  weekly: { id: 'weekly', label: 'Weekly', cents: 500, priceUsd: 5, period: 'week', days: 7, interval: 'weekly' },
  yearly: { id: 'yearly', label: 'Yearly', cents: 2000, priceUsd: 20, period: 'year', days: 365, interval: 'annually' },
};

export const CURRENCY = 'USD';
export const LICENSE_KEY_PATTERN = /^GD(-[A-Z0-9]{4}){4}$/;
export const MAX_DEVICES = 3;
/** Days of access kept after a billing period ends, so a late renewal does not lock anyone out. */
export const GRACE_DAYS = 3;
/** Lifetime of a signed license token. The app refreshes it while online. */
export const TOKEN_DAYS = 14;
