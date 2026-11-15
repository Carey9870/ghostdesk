// path: apps/desktop/src-tauri/src/lockout.rs
// purpose: Persistent brute-force throttle for unlock and recovery attempts (30 s after every third failure, doubling, capped at 1 h).
use crate::{error::{AppError, Result}, fsutil::{atomic_write, unix_now}};
use serde::{Deserialize, Serialize};
use std::{path::{Path, PathBuf}, sync::Mutex};

#[derive(Serialize, Deserialize, Default, Clone, Copy)]
struct Record { failures: u32, locked_until: u64 }

pub struct Lockout { path: PathBuf, guard: Mutex<()> }

impl Lockout {
    pub fn new(dir: &Path) -> Self {
        Self { path: dir.join("lockout.json"), guard: Mutex::new(()) }
    }
    fn load(&self) -> Record {
        std::fs::read(&self.path).ok().and_then(|b| serde_json::from_slice(&b).ok()).unwrap_or_default()
    }
    fn save(&self, r: Record) {
        if let Ok(b) = serde_json::to_vec(&r) { let _ = atomic_write(&self.path, &b); }
    }
    /// Fails with `LockedOut` while a throttle window is active.
    pub fn check(&self) -> Result<()> {
        let _g = self.guard.lock().unwrap_or_else(|e| e.into_inner());
        let r = self.load();
        let now = unix_now();
        if r.locked_until > now { Err(AppError::LockedOut(r.locked_until - now)) } else { Ok(()) }
    }
    /// Records a failed attempt and returns the new lock duration, if one started.
    pub fn failure(&self) -> Option<u64> {
        let _g = self.guard.lock().unwrap_or_else(|e| e.into_inner());
        let mut r = self.load();
        r.failures += 1;
        let mut started = None;
        if r.failures % 3 == 0 {
            let secs = (30u64 << (r.failures / 3 - 1).min(7)).min(3600);
            r.locked_until = unix_now() + secs;
            started = Some(secs);
        }
        self.save(r);
        started
    }
    pub fn success(&self) {
        let _g = self.guard.lock().unwrap_or_else(|e| e.into_inner());
        self.save(Record::default());
    }
}
