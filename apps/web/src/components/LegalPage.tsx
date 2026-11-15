// path: apps/web/src/components/LegalPage.tsx
// purpose: Shared layout for the Privacy Policy and Terms of Service pages.
import type { ReactNode } from 'react';
import { EFFECTIVE_DATE } from '@/lib/legal';

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <a href="/" className="text-sm text-mute hover:text-ink">GhostDesk</a>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-mute">Effective {EFFECTIVE_DATE}</p>
      <article className="legal mt-6">{children}</article>
    </main>
  );
}
