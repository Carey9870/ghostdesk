// path: apps/web/src/lib/auth-client.ts
// purpose: Browser-side Better Auth client with the two-factor plugin, used by the hidden admin sign-in and set-up pages.
import { twoFactorClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({ plugins: [twoFactorClient()] });
