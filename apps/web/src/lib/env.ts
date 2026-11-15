// path: apps/web/src/lib/env.ts
// purpose: Validated, lazily parsed environment variables (so builds do not need production secrets).
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  PAYSTACK_SECRET_KEY: z.string().min(10),
  PAYSTACK_WEBHOOK_SECRET: z.string().optional(),
  PAYSTACK_PLAN_WEEKLY: z.string().startsWith('PLN_'),
  PAYSTACK_PLAN_YEARLY: z.string().startsWith('PLN_'),
  LICENSE_SIGNING_KEY: z.string().min(40),
  RESEND_API_KEY: z.string().min(10),
  MAIL_FROM: z.string().min(5),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  /** owner/repository that publishes the installers (public releases). */
  GITHUB_REPO: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
});

let cached: z.infer<typeof schema> | undefined;
/** Throws a readable error (not a raw ZodError) that names every missing or invalid variable. */
export function env() {
  if (cached) return cached;
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment variables in apps/web/.env. ${problems}`);
  }
  return (cached = result.data);
}
