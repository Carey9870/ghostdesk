// path: apps/web/src/lib/analytics.ts
// purpose: First-party analytics helpers: user-agent parsing, approximate location from edge headers, a daily-rotating visitor hash (no raw IPs stored) and server-side event recording.
import { createHash, createHmac } from 'node:crypto';
import { db } from './db';
import { clientIp } from './http';

export const EVENT_NAMES = ['pricing_opened', 'checkout_started', 'download_clicked'] as const;

export function parseUa(ua: string): { device: 'mobile' | 'tablet' | 'desktop' | 'bot'; browser: string; os: string } {
  const u = ua.toLowerCase();
  if (!ua || /bot|crawl|spider|slurp|preview|headless|lighthouse|monitor|curl|wget/.test(u)) return { device: 'bot', browser: 'Bot', os: 'Other' };
  const device = /ipad|tablet/.test(u) ? 'tablet' : /mobi|android|iphone/.test(u) ? 'mobile' : 'desktop';
  const browser = /edg\//.test(u) ? 'Edge' : /opr\/|opera/.test(u) ? 'Opera' : /firefox/.test(u) ? 'Firefox'
    : /brave/.test(u) ? 'Brave' : /chrome|crios/.test(u) ? 'Chrome' : /safari/.test(u) ? 'Safari' : 'Other';
  const os = /windows/.test(u) ? 'Windows' : /android/.test(u) ? 'Android' : /iphone|ipad|ios/.test(u) ? 'iOS'
    : /mac os|macintosh/.test(u) ? 'macOS' : /linux|x11/.test(u) ? 'Linux' : 'Other';
  return { device, browser, os };
}

/** Country, region and city from Vercel's edge headers (approximate, derived from the IP but never stored with it). */
export function geoFrom(req: Request): { country: string | null; region: string | null; city: string | null } {
  const dec = (v: string | null) => { try { return v ? decodeURIComponent(v) : null; } catch { return v; } };
  return {
    country: req.headers.get('x-vercel-ip-country'),
    region: dec(req.headers.get('x-vercel-ip-country-region')),
    city: dec(req.headers.get('x-vercel-ip-city')),
  };
}

/**
 * Salted hash of IP + user agent. The salt changes every day, so a visitor is only recognised within one day,
 * and the hash cannot be turned back into an IP address. Returns null when analytics isn't configured.
 */
export function visitorHash(req: Request): string | null {
  const secret = process.env.ANALYTICS_SECRET;
  if (!secret || secret.length < 16) return null;
  const salt = createHmac('sha256', secret).update(new Date().toISOString().slice(0, 10)).digest();
  return createHash('sha256').update(salt).update(clientIp(req)).update(req.headers.get('user-agent') ?? '').digest('hex').slice(0, 32);
}

/** Server-side funnel event (payment completed, app activated). Never throws. */
export async function recordEvent(name: string, extra: { plan?: string } = {}): Promise<void> {
  try { await db.analyticsEvent.create({ data: { name, visitorHash: 'server', plan: extra.plan } }); } catch (e) { console.error('analytics event failed', e); }
}

export function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return null; }
}
