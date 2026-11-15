// path: apps/desktop/src/lib/ipc.ts
// purpose: Typed wrappers around the Tauri commands exposed by the Rust core, with normalised errors.
import { Channel, invoke } from '@tauri-apps/api/core';

export type LicenseState = 'none' | 'active' | 'lapsed';
export interface LicenseInfo { state: LicenseState; plan: string | null; expiresAt: number | null; freeFilesLeft: number }
export interface FolderLock { pattern: boolean; passphrase: boolean }
export interface Section { id: string; name: string; fileCount: number; locked: boolean; lock: FolderLock | null }
/** Either factor may be absent: a folder lock can use a pattern, a password, or both. */
export interface LockInput { pattern?: number[]; passphrase?: string }
export interface VaultFile { id: string; sectionId: string; name: string; size: number; mime: string; addedAt: number }
export interface VaultData { sections: Section[]; files: VaultFile[]; role: 'primary' | 'decoy'; hasDecoy: boolean }
export interface AppStatus { vaultExists: boolean; unlocked: boolean; license: LicenseInfo }
export interface ImportProgress { fileName: string; index: number; count: number; doneBytes: number; totalBytes: number }
export interface ImportReport { imported: VaultFile[]; failed: { path: string; error: string }[] }

export class IpcError extends Error {
  constructor(public code: string, message: string, public retryAfter?: number) {
    super(message);
    this.name = 'IpcError';
  }
}

function toError(e: unknown): IpcError {
  if (e && typeof e === 'object' && 'code' in e && 'message' in e) {
    const o = e as { code: string; message: string; retryAfter?: number | null };
    return new IpcError(o.code, o.message, o.retryAfter ?? undefined);
  }
  return new IpcError('unknown', typeof e === 'string' ? e : 'Something went wrong. Try again.');
}

async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  try { return await invoke<T>(cmd, args); } catch (e) { throw toError(e); }
}

export const api = {
  status: () => call<AppStatus>('app_status'),
  createVault: (passphrase: string, pattern: number[]) => call<string>('create_vault', { passphrase, pattern }),
  unlock: (passphrase: string, pattern: number[]) => call<void>('unlock', { passphrase, pattern }),
  lock: () => call<void>('lock'),
  checkRecoveryKey: (recoveryKey: string) => call<void>('check_recovery_key', { recoveryKey }),
  recover: (recoveryKey: string, passphrase: string, pattern: number[]) => call<string>('recover', { recoveryKey, passphrase, pattern }),
  renewRecoveryKey: (passphrase: string, pattern: number[]) => call<string>('renew_recovery_key', { passphrase, pattern }),
  verifyCredentials: (passphrase: string, pattern: number[]) => call<void>('verify_credentials', { passphrase, pattern }),
  createDecoy: (passphrase: string, pattern: number[], decoyPassphrase: string, decoyPattern: number[]) =>
    call<VaultData>('create_decoy', { passphrase, pattern, decoyPassphrase, decoyPattern }),
  removeDecoy: (passphrase: string, pattern: number[]) => call<VaultData>('remove_decoy', { passphrase, pattern }),
  exportBackup: (destPath: string, backupPassphrase: string, onProgress: (p: ImportProgress) => void) => {
    const channel = new Channel<ImportProgress>();
    channel.onmessage = onProgress;
    return call<number>('export_backup', { destPath, backupPassphrase, onProgress: channel });
  },
  restoreBackup: (srcPath: string, backupPassphrase: string, onProgress: (p: ImportProgress) => void) => {
    const channel = new Channel<ImportProgress>();
    channel.onmessage = onProgress;
    return call<ImportReport>('restore_backup', { srcPath, backupPassphrase, onProgress: channel });
  },
  unlockSection: (id: string, input: LockInput) => call<VaultData>('unlock_section', { id, passphrase: input.passphrase, pattern: input.pattern }),
  relockSection: (id: string) => call<VaultData>('relock_section', { id }),
  setSectionLock: (id: string, setup: LockInput | null, current: LockInput | null) => call<VaultData>('set_section_lock', { id, setup, current }),
  listVault: () => call<VaultData>('list_vault'),
  createSection: (name: string) => call<VaultData>('create_section', { name }),
  renameSection: (id: string, name: string) => call<VaultData>('rename_section', { id, name }),
  deleteSection: (id: string) => call<VaultData>('delete_section', { id }),
  importFiles: (sectionId: string, paths: string[], onProgress: (p: ImportProgress) => void) => {
    const channel = new Channel<ImportProgress>();
    channel.onmessage = onProgress;
    return call<ImportReport>('import_files', { sectionId, paths, onProgress: channel });
  },
  readFile: (fileId: string) => call<ArrayBuffer>('read_file', { fileId }),
  exportFile: (fileId: string, destPath: string) => call<void>('export_file', { fileId, destPath }),
  deleteFile: (fileId: string) => call<VaultData>('delete_file', { fileId }),
  getSettings: () => call<{ autoLockMinutes: number }>('get_settings'),
  setAutoLockMinutes: (minutes: number) => call<{ autoLockMinutes: number }>('set_auto_lock_minutes', { minutes }),
  activateLicense: (key: string) => call<LicenseInfo>('activate_license', { key }),
  refreshLicense: () => call<LicenseInfo>('refresh_license'),
  manageSubscriptionUrl: () => call<string>('manage_subscription_url'),
};
