// path: apps/desktop/src/features/vault/LapsedBanner.tsx
// purpose: Notice shown only after a subscription has actually lapsed: files stay viewable and exportable, adding is paused.
import { openUrl } from '@tauri-apps/plugin-opener';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PRICING_URL } from '@/lib/config';
import { useSession } from '@/store/session';
import { LicenseKeyDialog } from '../license/LicenseKeyDialog';

export function LapsedBanner() {
  const lapsed = useSession((s) => s.license.state === 'lapsed');
  const [keyOpen, setKeyOpen] = useState(false);
  if (!lapsed) return null;
  return (
    <div role="status" className="flex flex-wrap items-center gap-3 border-b border-[#5a2438] bg-[#2a1520] px-4 py-3 text-[#ffb3c7] sm:px-7">
      <span>Your subscription has ended. You can still open, view and export every file. Renew to add more.</span>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => openUrl(PRICING_URL).catch(() => toast.error('Couldn’t open your browser.'))}>Renew</Button>
        <Button size="sm" variant="ghost" onClick={() => setKeyOpen(true)}>Enter a new key</Button>
      </div>
      <LicenseKeyDialog open={keyOpen} onOpenChange={setKeyOpen} />
    </div>
  );
}
