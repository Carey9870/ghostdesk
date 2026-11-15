// path: apps/desktop/src-tauri/src/dto.rs
// purpose: Serializable data-transfer objects returned to the UI. None of them ever contain key material.
use serde::{Deserialize, Serialize};

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SectionDto { pub id: String, pub name: String, pub file_count: usize, pub lock: Option<LockDto>, pub locked: bool }

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LockDto { pub pattern: bool, pub passphrase: bool }

/// Credentials or a new lock sent from the UI: either factor may be absent.
#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct LockInput { pub pattern: Option<Vec<u8>>, pub passphrase: Option<String> }

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FileDto { pub id: String, pub section_id: String, pub name: String, pub size: u64, pub mime: String, pub added_at: u64 }

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultDto { pub sections: Vec<SectionDto>, pub files: Vec<FileDto>, pub role: &'static str, pub has_decoy: bool }

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LicenseDto { pub state: &'static str, pub plan: Option<String>, pub expires_at: Option<u64>, pub free_files_left: u32 }

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StatusDto { pub vault_exists: bool, pub unlocked: bool, pub license: LicenseDto }

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportFailure { pub path: String, pub error: String }

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportReport { pub imported: Vec<FileDto>, pub failed: Vec<ImportFailure> }

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ImportProgress { pub file_name: String, pub index: usize, pub count: usize, pub done_bytes: u64, pub total_bytes: u64 }

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsDto { pub auto_lock_minutes: u32 }
