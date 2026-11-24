'use client';
// path: apps/web/src/components/Analytics.tsx
// purpose: Cookieless page-view tracker and track() helper. Respects Do Not Track, skips /admin, and reports time spent when a page is left.
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

function sessionId(): string {
  try {
    let id = sessionStorage.getItem('gd_sid');
    if (!id) { id = crypto.randomUUID(); sessionStorage.setItem('gd_sid', id); }
    return id;
  } catch { return 'no-storage-session'; }
}

const optedOut = () => navigator.doNotTrack === '1';

/** Funnel event from the browser. */
export function track(name: 'pricing_opened' | 'checkout_started' | 'download_clicked', extra: { plan?: 'weekly' | 'yearly'; os?: 'windows' | 'macos' | 'linux' } = {}): void {
  if (optedOut()) return;
  const body = JSON.stringify({ name, sid: sessionId(), path: location.pathname, ...extra });
  try { navigator.sendBeacon('/api/analytics/event', new Blob([body], { type: 'application/json' })); } catch { /* ignore */ }
}

export function Analytics() {
  const pathname = usePathname();
  const viewId = useRef<string | null>(null);

  useEffect(() => {
    if (pathname.startsWith('/admin') || optedOut()) return;
    const started = Date.now();
    viewId.current = null;
    const q = new URLSearchParams(location.search);
    fetch('/api/analytics/collect', {
      method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: pathname, referrer: document.referrer || undefined, sid: sessionId(),
        utmSource: q.get('utm_source') ?? undefined, utmMedium: q.get('utm_medium') ?? undefined, utmCampaign: q.get('utm_campaign') ?? undefined,
      }),
    }).then((r) => (r.ok && r.status !== 204 ? r.json() : null)).then((d) => { viewId.current = d?.id ?? null; }).catch(() => undefined);

    const leave = () => {
      if (!viewId.current) return;
      const body = JSON.stringify({ id: viewId.current, ms: Date.now() - started });
      try { navigator.sendBeacon('/api/analytics/leave', new Blob([body], { type: 'application/json' })); } catch { /* ignore */ }
    };
    const onHide = () => { if (document.visibilityState === 'hidden') leave(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', leave);
    return () => { leave(); document.removeEventListener('visibilitychange', onHide); window.removeEventListener('pagehide', leave); };
  }, [pathname]);

  return null;
}
