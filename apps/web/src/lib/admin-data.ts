// path: apps/web/src/lib/admin-data.ts
// purpose: Database queries behind the admin dashboard: overview, analytics, customers, payments and the webhook log.
import { db } from './db';
import { num } from './format';

export type Range = '7d' | '30d' | '90d';
const DAYS: Record<Range, number> = { '7d': 7, '30d': 30, '90d': 90 };
export const parseRange = (v?: string): Range => (v === '7d' || v === '90d' ? v : '30d');

export function rangeStart(r: Range): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - (DAYS[r] - 1));
  return d;
}

function series(since: Date, days: number, rows: { day: Date; n: bigint | number | null }[]) {
  const map = new Map(rows.map((r) => [r.day.toISOString().slice(0, 10), num(r.n)]));
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(since);
    d.setUTCDate(d.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    return { label: key.slice(5), value: map.get(key) ?? 0 };
  });
}

const group = <T extends { _count: { _all: number } } & Record<string, unknown>>(rows: T[], key: string, fallback: string) =>
  rows.map((r) => ({ label: String(r[key] ?? fallback), value: r._count._all }));

export async function overview(range: Range) {
  const since = rangeStart(range);
  const days = DAYS[range];
  const where = { createdAt: { gte: since } };
  const [views, visitorsRow, avg, topPages, sources, countries, devices, daily, revDaily, revenue, newLicenses, activeLicenses, pricing, checkout, downloads, activated, paid, recent] = await Promise.all([
    db.pageView.count({ where }),
    db.$queryRaw<{ n: bigint }[]>`SELECT count(DISTINCT "visitorHash") AS n FROM "PageView" WHERE "createdAt" >= ${since}`,
    db.pageView.aggregate({ _avg: { durationMs: true }, where: { ...where, durationMs: { gt: 0 } } }),
    db.pageView.groupBy({ by: ['path'], where, _count: { _all: true }, orderBy: { _count: { path: 'desc' } }, take: 6 }),
    db.pageView.groupBy({ by: ['referrerHost'], where, _count: { _all: true }, orderBy: { _count: { referrerHost: 'desc' } }, take: 6 }),
    db.pageView.groupBy({ by: ['country'], where, _count: { _all: true }, orderBy: { _count: { country: 'desc' } }, take: 6 }),
    db.pageView.groupBy({ by: ['device'], where, _count: { _all: true }, orderBy: { _count: { device: 'desc' } } }),
    db.$queryRaw<{ day: Date; n: bigint }[]>`SELECT date_trunc('day', "createdAt") AS day, count(DISTINCT "visitorHash") AS n FROM "PageView" WHERE "createdAt" >= ${since} GROUP BY 1 ORDER BY 1`,
    db.$queryRaw<{ day: Date; n: bigint }[]>`SELECT date_trunc('day', "paidAt") AS day, sum(amount) AS n FROM "Payment" WHERE "paidAt" >= ${since} GROUP BY 1 ORDER BY 1`,
    db.payment.aggregate({ _sum: { amount: true }, _count: true, where: { paidAt: { gte: since } } }),
    db.license.count({ where }),
    db.license.count({ where: { status: { not: 'DISABLED' }, accessUntil: { gt: new Date() } } }),
    db.$queryRaw<{ n: bigint }[]>`SELECT count(DISTINCT "visitorHash") AS n FROM "AnalyticsEvent" WHERE name = 'pricing_opened' AND "createdAt" >= ${since}`,
    db.$queryRaw<{ n: bigint }[]>`SELECT count(DISTINCT "visitorHash") AS n FROM "AnalyticsEvent" WHERE name = 'checkout_started' AND "createdAt" >= ${since}`,
    db.$queryRaw<{ n: bigint }[]>`SELECT count(DISTINCT "visitorHash") AS n FROM "AnalyticsEvent" WHERE name = 'download_clicked' AND "createdAt" >= ${since}`,
    db.analyticsEvent.count({ where: { name: 'license_activated', ...where } }),
    db.payment.count({ where: { paidAt: { gte: since } } }),
    db.payment.findMany({ orderBy: { paidAt: 'desc' }, take: 6, include: { license: { select: { id: true, email: true, plan: true } } } }),
  ]);
  const visitors = num(visitorsRow[0]?.n);
  return {
    visitors, views, avgMs: num(avg._avg.durationMs),
    revenueCents: num(revenue._sum.amount), payments: revenue._count, newLicenses, activeLicenses,
    conversion: visitors > 0 ? (paid / visitors) * 100 : 0,
    visitorSeries: series(since, days, daily), revenueSeries: series(since, days, revDaily),
    topPages: group(topPages, 'path', '/'), sources: group(sources, 'referrerHost', 'Direct'), countries: group(countries, 'country', 'Unknown'), devices: group(devices, 'device', 'Unknown'),
    funnel: [
      { label: 'Visitors', value: visitors }, { label: 'Opened pricing', value: num(pricing[0]?.n) }, { label: 'Started checkout', value: num(checkout[0]?.n) },
      { label: 'Paid', value: paid }, { label: 'Downloaded the app', value: num(downloads[0]?.n) }, { label: 'Activated on a device', value: activated },
    ],
    recent,
  };
}

export async function analyticsDetail(range: Range) {
  const since = rangeStart(range);
  const where = { createdAt: { gte: since } };
  const [browsers, systems, campaigns, cities, hours, recent, bounce] = await Promise.all([
    db.pageView.groupBy({ by: ['browser'], where, _count: { _all: true }, orderBy: { _count: { browser: 'desc' } }, take: 6 }),
    db.pageView.groupBy({ by: ['os'], where, _count: { _all: true }, orderBy: { _count: { os: 'desc' } }, take: 6 }),
    db.pageView.groupBy({ by: ['utmCampaign'], where: { ...where, utmCampaign: { not: null } }, _count: { _all: true }, orderBy: { _count: { utmCampaign: 'desc' } }, take: 6 }),
    db.pageView.groupBy({ by: ['city', 'country'], where: { ...where, city: { not: null } }, _count: { _all: true }, orderBy: { _count: { city: 'desc' } }, take: 8 }),
    db.$queryRaw<{ h: number; n: bigint }[]>`SELECT extract(hour from "createdAt" AT TIME ZONE 'Africa/Nairobi')::int AS h, count(*) AS n FROM "PageView" WHERE "createdAt" >= ${since} GROUP BY 1 ORDER BY 1`,
    db.pageView.findMany({ orderBy: { createdAt: 'desc' }, take: 60 }),
    db.$queryRaw<{ n: bigint; one: bigint }[]>`SELECT count(*) AS n, count(*) FILTER (WHERE c = 1) AS one FROM (SELECT "sessionId", count(*) AS c FROM "PageView" WHERE "createdAt" >= ${since} GROUP BY 1) t`,
  ]);
  const hourMap = new Map(hours.map((r) => [r.h, num(r.n)]));
  return {
    browsers: group(browsers, 'browser', 'Other'), systems: group(systems, 'os', 'Other'), campaigns: group(campaigns, 'utmCampaign', '—'),
    cities: cities.map((c) => ({ label: `${c.city}${c.country ? `, ${c.country}` : ''}`, value: c._count._all })),
    hours: Array.from({ length: 24 }, (_, h) => ({ label: `${String(h).padStart(2, '0')}h`, value: hourMap.get(h) ?? 0 })),
    recent,
    sessions: num(bounce[0]?.n), bounceRate: num(bounce[0]?.n) ? (num(bounce[0]?.one) / num(bounce[0]?.n)) * 100 : 0,
  };
}

const PAGE_SIZE = 25;

export async function customersList(q: string, page: number) {
  const where = q ? { OR: [{ email: { contains: q, mode: 'insensitive' as const } }, { key: { contains: q.toUpperCase() } }] } : {};
  const [rows, total] = await Promise.all([
    db.license.findMany({ where, orderBy: { createdAt: 'desc' }, take: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE, include: { _count: { select: { activations: true, payments: true } } } }),
    db.license.count({ where }),
  ]);
  return { rows, total, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export const customerDetail = (id: string) =>
  db.license.findUnique({ where: { id }, include: { payments: { orderBy: { paidAt: 'desc' } }, activations: { orderBy: { lastSeenAt: 'desc' } } } });

export async function paymentsList() {
  const since30 = new Date(Date.now() - 30 * 86_400_000);
  const [rows, all, last30] = await Promise.all([
    db.payment.findMany({ orderBy: { paidAt: 'desc' }, take: 150, include: { license: { select: { id: true, email: true, plan: true } } } }),
    db.payment.aggregate({ _sum: { amount: true }, _count: true }),
    db.payment.aggregate({ _sum: { amount: true }, _count: true, where: { paidAt: { gte: since30 } } }),
  ]);
  return { rows, allCents: num(all._sum.amount), allCount: all._count, last30Cents: num(last30._sum.amount), last30Count: last30._count };
}

export const webhookLog = () => db.webhookEvent.findMany({ orderBy: { receivedAt: 'desc' }, take: 150 });
