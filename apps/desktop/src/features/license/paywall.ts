// path: apps/desktop/src/features/license/paywall.ts
// purpose: Tiny store that opens the "get GhostDesk" dialog from anywhere (for example when the free file allowance is used up).
import { create } from 'zustand';

export const usePaywall = create<{ open: boolean; show: () => void; close: () => void }>((set) => ({
  open: false,
  show: () => set({ open: true }),
  close: () => set({ open: false }),
}));
