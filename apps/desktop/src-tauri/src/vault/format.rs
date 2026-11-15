// path: apps/desktop/src-tauri/src/vault/format.rs
// purpose: On-disk vault formats (v2): a header with two indistinguishable key slots, and the per-slot manifest that is stored encrypted.
use crate::crypto::{aead::random_bytes, kdf::KdfParams};
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use serde::{Deserialize, Serialize};
use zeroize::{Zeroize, ZeroizeOnDrop};

pub const AAD_WRAP_CREDENTIALS: &[u8] = b"ghostdesk/v1/wrap-master-key/credentials";
pub const AAD_WRAP_RECOVERY: &[u8] = b"ghostdesk/v1/wrap-master-key/recovery";
pub const AAD_MANIFEST: &[u8] = b"ghostdesk/v1/manifest";
pub const AAD_FOLDER_KEY: &[u8] = b"ghostdesk/v1/wrap-folder-key";
pub const AAD_FILE_KEY: &[u8] = b"ghostdesk/v1/seal-file-key";

/// One vault's wrapped master key (by credentials and by recovery key).
/// An unused slot is filled with random bytes of the same sizes, so a decoy cannot be detected from the file.
#[derive(Serialize, Deserialize, Clone)]
pub struct Slot {
    pub salt: String,
    pub wrapped_mk: String,
    pub recovery_salt: String,
    pub recovery_wrapped_mk: String,
}

impl Slot {
    /// 16-byte salts and 72-byte wrapped keys (24 nonce + 32 key + 16 tag), exactly like a real slot.
    pub fn random() -> Self {
        Self {
            salt: B64.encode(random_bytes::<16>()),
            wrapped_mk: B64.encode(random_bytes::<72>()),
            recovery_salt: B64.encode(random_bytes::<16>()),
            recovery_wrapped_mk: B64.encode(random_bytes::<72>()),
        }
    }
}

/// vault.json: only salts and wrapped keys. Contains no plaintext secrets and does not reveal how many vaults exist.
#[derive(Serialize, Deserialize)]
pub struct VaultHeader {
    pub version: u32,
    pub kdf: KdfParams,
    pub slots: Vec<Slot>,
    pub created_at: u64,
}

#[derive(Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Debug, Default)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    #[default]
    Primary,
    Decoy,
}

/// A per-folder lock. The folder key is random and wrapped by a key derived from the folder's pattern and/or password.
/// The keys of the files in a locked folder are sealed with the folder key, so they cannot be read without unlocking it.
#[derive(Serialize, Deserialize, Clone)]
pub struct SectionLock {
    pub pattern: bool,
    pub passphrase: bool,
    pub salt: String,
    pub wrapped_fk: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Section {
    pub id: String,
    pub name: String,
    pub created_at: u64,
    #[serde(default)]
    pub lock: Option<SectionLock>,
}

/// One encrypted file. `key` (base64) is the per-file key and is wiped from memory when the session ends.
#[derive(Serialize, Deserialize, Clone, Zeroize, ZeroizeOnDrop)]
pub struct FileEntry {
    #[zeroize(skip)] pub id: String,
    #[zeroize(skip)] pub section_id: String,
    #[zeroize(skip)] pub name: String,
    #[zeroize(skip)] pub size: u64,
    #[zeroize(skip)] pub mime: String,
    #[zeroize(skip)] pub added_at: u64,
    /// Per-file key sealed with the folder key (locked folders only).
    #[zeroize(skip)] #[serde(default)] pub sealed_key: Option<String>,
    /// Plain per-file key (base64); empty when the file lives in a locked folder.
    #[serde(default)]
    pub key: String,
}

/// Stored encrypted. `role` and `has_decoy` are only readable after unlocking.
#[derive(Serialize, Deserialize, Clone, Default)]
pub struct Manifest {
    pub sections: Vec<Section>,
    pub files: Vec<FileEntry>,
    #[serde(default)]
    pub role: Role,
    #[serde(default)]
    pub has_decoy: bool,
}
