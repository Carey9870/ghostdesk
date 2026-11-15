// path: apps/web/src/app/download/[os]/route.ts
// purpose: GET /download/windows|macos|linux. Serves an installer from apps/web/public/downloads if present (local testing), otherwise redirects to the newest public GitHub release.
import { readdir } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';

/** Preferred installer file types per system, in order. */
const PATTERNS: Record<string, RegExp[]> = {
  windows: [/-setup\.exe$/i, /\.msi$/i],
  macos: [/\.dmg$/i],
  linux: [/\.AppImage$/, /\.deb$/, /\.rpm$/],
};

const text = (message: string, status: number) => new Response(message, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

/** An installer you copied into apps/web/public/downloads (see `pnpm installers:local`). */
async function localInstaller(patterns: RegExp[]): Promise<string | null> {
  try {
    const names = await readdir(path.join(process.cwd(), 'public', 'downloads'));
    for (const pattern of patterns) {
      const name = names.find((n) => pattern.test(n));
      if (name) return name;
    }
  } catch { /* folder missing or not readable: fall through to GitHub */ }
  return null;
}

export async function GET(req: Request, { params }: { params: Promise<{ os: string }> }) {
  const { os } = await params;
  const patterns = PATTERNS[os];
  if (!patterns) return text('Not found', 404);

  const local = await localInstaller(patterns);
  if (local) return Response.redirect(new URL(`/downloads/${encodeURIComponent(local)}`, req.url), 302);

  const repo = process.env.GITHUB_REPO;
  if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) return text('Downloads aren’t set up yet.', 503);

  let release: { assets?: { name: string; browser_download_url: string }[] } | null = null;
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'ghostdesk-site' },
      next: { revalidate: 300 },
    });
    release = res.ok ? await res.json() : null;
  } catch {
    return text('We couldn’t reach the download server. Please try again in a moment.', 502);
  }
  for (const pattern of patterns) {
    const asset = release?.assets?.find((a) => pattern.test(a.name));
    if (asset) return Response.redirect(asset.browser_download_url, 302);
  }
  return text('The installer for this system isn’t published yet. Please check back soon.', 404);
}
