// path: apps/desktop/src/lib/config.ts
// purpose: Build-time configuration for links that open in the user's browser.
export const WEB_URL = (import.meta.env.VITE_WEB_URL ?? '').replace(/\/$/, '');
export const PRICING_URL = `${WEB_URL}/#pricing`;
