// path: apps/web/src/lib/auth.ts
// purpose: Better Auth configuration for the admin area: email + password, mandatory authenticator-app (TOTP) two-factor, Prisma storage, an email allow-list and a one-time bootstrap of the first admin.
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { nextCookies } from 'better-auth/next-js';
import { twoFactor } from 'better-auth/plugins';
import { db } from './db';

const adminEmails = () => (process.env.ADMIN_EMAILS ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
export const isAdminEmail = (email: string) => adminEmails().includes(email.trim().toLowerCase());

function createAuth() {
  const site = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL;
  return betterAuth({
    appName: 'GhostDesk Admin',
    baseURL: site,
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: site ? [site] : [],
    database: prismaAdapter(db, { provider: 'postgresql' }),
    emailAndPassword: { enabled: true, minPasswordLength: 12, maxPasswordLength: 128, autoSignIn: true },
    session: { expiresIn: 60 * 60 * 8, updateAge: 60 * 15 },
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 30,
      customRules: {
        '/sign-in/email': { window: 300, max: 5 },
        '/sign-up/email': { window: 300, max: 3 },
        '/two-factor/verify-totp': { window: 300, max: 5 },
        '/two-factor/verify-backup-code': { window: 300, max: 5 },
      },
    },
    advanced: { useSecureCookies: process.env.NODE_ENV === 'production', cookiePrefix: 'gd-admin' },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        const email = String((ctx.body as { email?: unknown } | undefined)?.email ?? '').trim().toLowerCase();
        if (ctx.path === '/sign-up/email') {
          // Sign-up exists only to create the very first admin, and only for an allow-listed email.
          if (!isAdminEmail(email) || (await db.user.count()) > 0) throw new APIError('FORBIDDEN', { message: 'Not available.' });
        }
        if (ctx.path === '/sign-in/email' && !isAdminEmail(email)) {
          throw new APIError('UNAUTHORIZED', { message: 'Invalid email or password.' });
        }
      }),
    },
    plugins: [twoFactor({ issuer: 'GhostDesk Admin' }), nextCookies()],
  });
}

let instance: ReturnType<typeof createAuth> | undefined;
/** Created on first use so that builds do not need the secret. */
export const getAuth = () => (instance ??= createAuth());
