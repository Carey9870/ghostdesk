// path: apps/web/src/app/api/auth/[...all]/route.ts
// purpose: Better Auth HTTP endpoints (sign-in, sign-up, two-factor, sign-out) under /api/auth.
import { toNextJsHandler } from 'better-auth/next-js';
import { getAuth } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) { return toNextJsHandler(getAuth()).GET(req); }
export async function POST(req: Request) { return toNextJsHandler(getAuth()).POST(req); }
