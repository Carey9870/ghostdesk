// path: apps/desktop/src-tauri/src/settings.rs
// purpose: Non-secret user settings (auto-lock inactivity minutes) stored as plain JSON.
use crate::{error::{AppError, Result}, fsutil::atomic_write};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

pub const ALLOWED_MINUTES: [u32; 5] = [1, 2, 5, 15, 30];

#[derive(Serialize, Deserialize)]
struct Stored { auto_lock_minutes: u32 }

pub struct SettingsStore { path: PathBuf }

impl SettingsStore {
    pub fn new(dir: &Path) -> Self { Self { path: dir.join("settings.json") } }
    pub fn auto_lock_minutes(&self) -> u32 {
        std::fs::read(&self.path)
            .ok()
            .and_then(|b| serde_json::from_slice::<Stored>(&b).ok())
            .map(|s| s.auto_lock_minutes)
            .filter(|m| ALLOWED_MINUTES.contains(m))
            .unwrap_or(5)
    }
    pub fn set_auto_lock_minutes(&self, minutes: u32) -> Result<()> {
        if !ALLOWED_MINUTES.contains(&minutes) {
            return Err(AppError::Invalid("Unsupported auto-lock time.".into()));
        }
        atomic_write(&self.path, &serde_json::to_vec(&Stored { auto_lock_minutes: minutes })?)?;
        Ok(())
    }
}
