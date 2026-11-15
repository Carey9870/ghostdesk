// path: apps/desktop/src-tauri/src/vault/store.rs
// purpose: File-system layout of the vault: header, one encrypted manifest per slot and the shared pool of encrypted blobs, all written atomically.
use super::format::{Manifest, Role, Section, VaultHeader, AAD_MANIFEST};
use crate::{crypto::aead::{self, random_bytes}, error::{AppError, Result}, fsutil::{atomic_write, unix_now}};
use std::{fs, path::PathBuf};

pub struct VaultStore { dir: PathBuf }

impl VaultStore {
    pub fn new(dir: PathBuf) -> Self { Self { dir } }
    fn header_path(&self) -> PathBuf { self.dir.join("vault.json") }
    fn manifest_path(&self, slot: usize) -> PathBuf { self.dir.join(format!("slot{slot}.gdm")) }
    fn blob_dir(&self) -> PathBuf { self.dir.join("blobs") }

    pub fn exists(&self) -> bool { self.header_path().is_file() }
    pub fn ensure_dirs(&self) -> Result<()> { fs::create_dir_all(self.blob_dir())?; Ok(()) }

    pub fn read_header(&self) -> Result<VaultHeader> {
        let bytes = fs::read(self.header_path()).map_err(|_| AppError::NoVault)?;
        let h: VaultHeader = serde_json::from_slice(&bytes)?;
        if h.version != 2 || h.slots.len() != 2 {
            return Err(AppError::Crypto("This vault was created by an incompatible version of GhostDesk.".into()));
        }
        Ok(h)
    }
    pub fn write_header(&self, h: &VaultHeader) -> Result<()> {
        self.ensure_dirs()?;
        atomic_write(&self.header_path(), &serde_json::to_vec_pretty(h)?)?;
        Ok(())
    }

    pub fn read_manifest(&self, slot: usize, mk: &[u8; 32]) -> Result<Manifest> {
        let blob = fs::read(self.manifest_path(slot))?;
        let plain = aead::open(mk, &blob, AAD_MANIFEST).map_err(|_| AppError::Crypto("The vault data is corrupted or was modified.".into()))?;
        Ok(serde_json::from_slice(&plain)?)
    }
    pub fn write_manifest(&self, slot: usize, mk: &[u8; 32], m: &Manifest) -> Result<()> {
        self.ensure_dirs()?;
        let json = zeroize::Zeroizing::new(serde_json::to_vec(m)?);
        atomic_write(&self.manifest_path(slot), &aead::seal(mk, &json, AAD_MANIFEST)?)?;
        Ok(())
    }
    /// Writes a manifest sealed with a key that is immediately discarded: indistinguishable from a real one, readable by nobody.
    pub fn write_filler_manifest(&self, slot: usize) -> Result<()> {
        let filler = Manifest {
            sections: vec![Section { id: hex::encode(random_bytes::<16>()), name: "Documents".into(), created_at: unix_now(), lock: None }],
            files: vec![],
            role: Role::Decoy,
            has_decoy: false,
        };
        self.write_manifest(slot, &aead::random_key(), &filler)
    }

    fn safe_id(id: &str) -> Result<&str> {
        if id.len() == 32 && id.bytes().all(|b| b.is_ascii_hexdigit()) { Ok(id) } else { Err(AppError::NotFound) }
    }
    pub fn blob_path(&self, id: &str) -> Result<PathBuf> { Ok(self.blob_dir().join(format!("{}.gdf", Self::safe_id(id)?))) }
    pub fn blob_tmp_path(&self, id: &str) -> Result<PathBuf> { Ok(self.blob_dir().join(format!("{}.part", Self::safe_id(id)?))) }
    pub fn remove_blob(&self, id: &str) { if let Ok(p) = self.blob_path(id) { let _ = fs::remove_file(p); } }

    pub fn list_blob_ids(&self) -> Vec<String> {
        let mut out = Vec::new();
        if let Ok(rd) = fs::read_dir(self.blob_dir()) {
            for e in rd.flatten() {
                let p = e.path();
                if p.extension().and_then(|x| x.to_str()) == Some("gdf") {
                    if let Some(stem) = p.file_stem().and_then(|x| x.to_str()) { out.push(stem.to_string()); }
                }
            }
        }
        out
    }
}
