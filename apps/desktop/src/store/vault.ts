// path: apps/desktop/src/store/vault.ts
// purpose: Zustand store for the unlocked vault: sections, files, the active section, the open viewer and import progress.
import { create } from 'zustand';
import { api, type ImportProgress, type VaultData } from '@/lib/ipc';

const EMPTY: VaultData = { sections: [], files: [], role: 'primary', hasDecoy: false };

interface VaultState {
  data: VaultData;
  activeId: string | null;
  viewingId: string | null;
  progress: ImportProgress | null;
  load: () => Promise<void>;
  select: (id: string) => void;
  view: (id: string | null) => void;
  setProgress: (p: ImportProgress | null) => void;
  createSection: (name: string) => Promise<void>;
  renameSection: (id: string, name: string) => Promise<void>;
  deleteSection: (id: string) => Promise<void>;
  deleteFile: (id: string) => Promise<void>;
  reset: () => void;
}

const keepActive = (data: VaultData, prev: string | null) =>
  data.sections.some((s) => s.id === prev) ? prev : (data.sections[0]?.id ?? null);

export const useVault = create<VaultState>((set, get) => ({
  data: EMPTY,
  activeId: null,
  viewingId: null,
  progress: null,
  load: async () => {
    const data = await api.listVault();
    set({ data, activeId: keepActive(data, get().activeId) });
  },
  select: (id) => set({ activeId: id }),
  view: (id) => set({ viewingId: id }),
  setProgress: (progress) => set({ progress }),
  createSection: async (name) => {
    const data = await api.createSection(name);
    const created = data.sections.find((s) => s.name.toLowerCase() === name.trim().toLowerCase());
    set({ data, activeId: created?.id ?? keepActive(data, get().activeId) });
  },
  renameSection: async (id, name) => set({ data: await api.renameSection(id, name) }),
  deleteSection: async (id) => {
    const data = await api.deleteSection(id);
    set({ data, activeId: keepActive(data, get().activeId === id ? null : get().activeId) });
  },
  deleteFile: async (id) => {
    const data = await api.deleteFile(id);
    set({ data, viewingId: get().viewingId === id ? null : get().viewingId });
  },
  reset: () => set({ data: EMPTY, activeId: null, viewingId: null, progress: null }),
}));
