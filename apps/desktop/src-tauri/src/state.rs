// path: apps/desktop/src-tauri/src/state.rs
// purpose: Shared application state: the unlocked session (master key + manifest), throttle, settings and license store.
use crate::{lockout::Lockout, license::LicenseStore, settings::SettingsStore, vault::{format::Manifest, store::VaultStore}};
use std::{collections::HashMap, ops::Deref, path::PathBuf, sync::{Arc, Mutex, MutexGuard}};
use zeroize::Zeroizing;

pub struct Session {
    pub mk: Zeroizing<[u8; 32]>,
    /// Which of the two header slots this session unlocked.
    pub slot: usize,
    pub manifest: Manifest,
    /// Keys of locked folders that have been opened in this session. Cleared when the vault locks.
    pub folder_keys: HashMap<String, Zeroizing<[u8; 32]>>,
}

pub struct Inner {
    pub store: VaultStore,
    pub session: Mutex<Option<Session>>,
    pub lockout: Lockout,
    pub settings: SettingsStore,
    pub license: LicenseStore,
}

#[derive(Clone)]
pub struct AppState(Arc<Inner>);

impl Deref for AppState {
    type Target = Inner;
    fn deref(&self) -> &Inner { &self.0 }
}

impl AppState {
    pub fn new(dir: PathBuf) -> Self {
        Self(Arc::new(Inner {
            store: VaultStore::new(dir.join("vault")),
            session: Mutex::new(None),
            lockout: Lockout::new(&dir),
            settings: SettingsStore::new(&dir),
            license: LicenseStore::new(&dir),
        }))
    }
    pub fn session_guard(&self) -> MutexGuard<'_, Option<Session>> {
        self.session.lock().unwrap_or_else(|e| e.into_inner())
    }
    /// Drops the session; the master key and every file key are zeroised on drop.
    pub fn lock_session(&self) { *self.session_guard() = None; }
    pub fn is_unlocked(&self) -> bool { self.session_guard().is_some() }
}
