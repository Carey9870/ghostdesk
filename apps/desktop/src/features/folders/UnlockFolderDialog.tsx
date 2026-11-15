// path: apps/desktop/src/features/folders/UnlockFolderDialog.tsx
// purpose: Opens a locked folder for the rest of the session with its own pattern and/or password.
import { Modal } from '@/components/ui/overlay';
import { api, type Section } from '@/lib/ipc';
import { useVault } from '@/store/vault';
import { CredentialsStep } from './CredentialsStep';

export function UnlockFolderDialog({ section, onOpenChange }: { section: Section | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Modal open={!!section} onOpenChange={onOpenChange} title={`Unlock “${section?.name ?? ''}”`} description="This folder has its own lock.">
      {section?.lock && (
        <CredentialsStep
          key={section.id}
          need={section.lock}
          submitLabel="Unlock folder"
          onSubmit={async (input) => {
            useVault.setState({ data: await api.unlockSection(section.id, input) });
            onOpenChange(false);
          }}
        />
      )}
    </Modal>
  );
}
