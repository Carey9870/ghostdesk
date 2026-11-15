// path: apps/desktop/src/features/license/PaywallDialog.tsx
// purpose: Shown when someone has used their free file and tries to add another: get a subscription, or enter a license key they already have.
import { openUrl } from '@tauri-apps/plugin-opener';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/overlay';
import { PRICING_URL } from '@/lib/config';
import { useSession } from '@/store/session';
import { LicenseKeyForm } from './LicenseKeyForm';
import { usePaywall } from './paywall';

export function PaywallDialog() {
  const { open, close } = usePaywall();
  const setLicense = useSession((s) => s.setLicense);
  const [enterKey, setEnterKey] = useState(false);
  const onOpenChange = (o: boolean) => { if (!o) { close(); setEnterKey(false); } };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Add more files with GhostDesk"
      description="Your free file is in. A subscription lets you add as many files as you like. Everything stays encrypted on this device.">
      {enterKey ? (
        <LicenseKeyForm onActivated={(l) => { setLicense(l); toast.success('GhostDesk is active'); onOpenChange(false); }} />
      ) : (
        <div className="space-y-3">
          <Button variant="primary" className="w-full" onClick={() => openUrl(PRICING_URL).catch(() => toast.error('Couldn’t open your browser.'))}>Get GhostDesk</Button>
          <Button className="w-full" onClick={() => setEnterKey(true)}>I have a license key</Button>
        </div>
      )}
    </Modal>
  );
}
