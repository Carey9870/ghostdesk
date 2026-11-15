// path: apps/desktop/src/store/session.ts
// purpose: Zustand store for the app phase (license, setup, locked, unlocked) and the license state; owns lock/unlock transitions.
import { create } from 'zustand';
import { activity } from '@/lib/activity';
import { api, type LicenseInfo } from '@/lib/ipc';
import { useAutoLock } from '@/features/autolock/autolock';
import { useVault } from './vault';

export type Phase = 'loading' | 'setup' | 'locked' | 'unlocked';

interface SessionState {
  phase: Phase;
  vaultExists: boolean;
  license: LicenseInfo;
  init: () => Promise<void>;
  setLicense: (license: LicenseInfo) => void;
  vaultCreated: () => Promise<void>;
  unlocked: () => Promise<void>;
  /** `remote` is true when the Rust side already locked (panic shortcut). */
  lock: (remote?: boolean) => Promise<void>;
}

const NO_LICENSE: LicenseInfo = { state: 'none', plan: null, expiresAt: null, freeFilesLeft: 1 };
let refreshTimer: number | undefined;

export const useSession = create<SessionState>((set, get) => ({
  phase: 'loading',
  vaultExists: false,
  license: NO_LICENSE,

  init: async () => {
    const status = await api.status();
    set({ license: status.license, vaultExists: status.vaultExists });
    if (status.unlocked) await get().unlocked();
    else set({ phase: status.vaultExists ? 'locked' : 'setup' });

    const refresh = () => api.refreshLicense().then((l) => get().setLicense(l)).catch(() => undefined);
    void refresh();
    window.clearInterval(refreshTimer);
    refreshTimer = window.setInterval(refresh, 6 * 60 * 60 * 1000);
  },

  setLicense: (license) => set({ license }),

  vaultCreated: async () => { set({ vaultExists: true }); await get().unlocked(); },

  unlocked: async () => {
    await useVault.getState().load();
    activity.touch();
    set({ phase: 'unlocked' });
  },

  lock: async (remote = false) => {
    if (get().phase !== 'unlocked' && !remote) return;
    if (!remote) await api.lock().catch(() => undefined);
    useAutoLock.getState().close();
    useVault.getState().reset();
    set({ phase: 'locked' });
  },
}));
