// path: apps/web/src/app/api/analytics/collect/route.ts
// purpose: POST /api/analytics/collect. Records one page view (cookieless, no raw IP) and returns its id so the page can report time spent.
import { z } from 'zod';
import { geoFrom, hostOf, parseUa, visitorHash } from '@/lib/analytics';
import { db } from '@/lib/db';
import { allow, clientIp, json } from '@/lib/http';

export const runtime = 'nodejs';

const body = z.object({
  path: z.string().max(300),
  referrer: z.string().max(500).optional(),
  sid: z.string().min(8).max(64),
  utmSource: z.string().max(100).optional(),
  utmMedium: z.string().max(100).optional(),
  utmCampaign: z.string().max(100).optional(),
});

export async function POST(req: Request) {
  const hash = visitorHash(req);
  if (!hash) return new Response(null, { status: 204 });
  if (!allow(`collect:${clientIp(req)}`, 120, 60_000)) return new Response(null, { status: 429 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || parsed.data.path.startsWith('/admin') || parsed.data.path.startsWith('/api')) return new Response(null, { status: 204 });

  const ua = parseUa(req.headers.get('user-agent') ?? '');
  if (ua.device === 'bot') return new Response(null, { status: 204 });
  const d = parsed.data;
  const ref = hostOf(d.referrer);
  const view = await db.pageView.create({
    data: {
      path: d.path, referrer: d.referrer || null, referrerHost: ref && ref !== (req.headers.get('host') ?? '') ? ref : null,
      utmSource: d.utmSource, utmMedium: d.utmMedium, utmCampaign: d.utmCampaign,
      ...geoFrom(req), device: ua.device, browser: ua.browser, os: ua.os, visitorHash: hash, sessionId: d.sid,
    },
    select: { id: true },
  });
  return json({ id: view.id });
}
