// path: apps/desktop/src/components/ui/overlay.tsx
// purpose: Accessible modal (Radix Dialog) and alert modal (Radix AlertDialog) wrappers styled for GhostDesk.
import * as Alert from '@radix-ui/react-alert-dialog';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

const overlayCls = 'fixed inset-0 z-50 bg-black/70 backdrop-blur-sm';
const panelCls =
  'fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[min(460px,92vw)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-edge bg-panel p-6 shadow-2xl';

interface OverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
}

export function Modal({ open, onOpenChange, title, description, children }: OverlayProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlayCls} />
        <Dialog.Content className={panelCls} aria-describedby={description ? undefined : undefined}>
          <Dialog.Title className="pr-8 text-lg font-semibold">{title}</Dialog.Title>
          {description && <Dialog.Description className="mt-1 text-sm text-mute">{description}</Dialog.Description>}
          <div className="mt-4">{children}</div>
          <Dialog.Close className="absolute right-3 top-3 rounded-md p-1.5 text-mute hover:text-ink" aria-label="Close">
            <X size={18} />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Used when the user must make a choice; clicking outside does not dismiss it. `children` are the action buttons. */
export function AlertModal({ open, onOpenChange, title, description, children }: OverlayProps) {
  return (
    <Alert.Root open={open} onOpenChange={onOpenChange}>
      <Alert.Portal>
        <Alert.Overlay className={overlayCls} />
        <Alert.Content className={panelCls}>
          <Alert.Title className="text-lg font-semibold">{title}</Alert.Title>
          {description && <Alert.Description className="mt-2 text-sm text-mute">{description}</Alert.Description>}
          <div className="mt-6 flex justify-end gap-3">{children}</div>
        </Alert.Content>
      </Alert.Portal>
    </Alert.Root>
  );
}

export const AlertCancel = Alert.Cancel;
export const AlertAction = Alert.Action;
