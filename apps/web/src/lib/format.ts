// path: apps/web/src/lib/format.ts
// purpose: Formatting helpers for the admin dashboard: money, dates in the admin's time zone, durations and numbers.
const zone = () => process.env.ADMIN_TIMEZONE || 'Africa/Nairobi';

export const money = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const num = (n: number | bigint | null | undefined) => Number(n ?? 0);
export const compact = (n: number) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

export function dateTime(d: Date | string): string {
  return new Date(d).toLocaleString('en-GB', { timeZone: zone(), day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}
export function dateOnly(d: Date | string): string {
  return new Date(d).toLocaleDateString('en-GB', { timeZone: zone(), day: '2-digit', month: 'short', year: 'numeric' });
}
export function duration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
}
export const percent = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1)}%` : '0%');
