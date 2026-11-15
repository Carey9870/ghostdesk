// path: apps/desktop/src/features/license/LicenseKeyDialog.tsx
// purpose: Dialog for entering a new license key from inside the vault (used after a subscription lapsed and was renewed on the website).
import { toast } from 'sonner';
import { Modal } from '@/components/ui/overlay';
import { useSession } from '@/store/session';
import { LicenseKeyForm } from './LicenseKeyForm';

export function LicenseKeyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const setLicense = useSession((s) => s.setLicense);
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Enter a license key" description="Use the key from your latest subscription email.">
      <LicenseKeyForm onActivated={(l) => { setLicense(l); toast.success('GhostDesk is active'); onOpenChange(false); }} />
    </Modal>
  );
}
