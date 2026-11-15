// path: apps/web/src/lib/legal.ts
// purpose: Business details (name, contact email) and the effective date used by the Privacy Policy and Terms pages.
import { z } from 'zod';

const schema = z.object({
  NEXT_PUBLIC_COMPANY_NAME: z.string().min(2),
  NEXT_PUBLIC_SUPPORT_EMAIL: z.string().email(),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
});

export const EFFECTIVE_DATE = '13 November 2026';

export function legal() {
  const e = schema.parse(process.env);
  return { company: e.NEXT_PUBLIC_COMPANY_NAME, email: e.NEXT_PUBLIC_SUPPORT_EMAIL, site: e.NEXT_PUBLIC_SITE_URL };
}
