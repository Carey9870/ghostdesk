// path: apps/desktop/src-tauri/src/vault/backup.rs
// purpose: Encrypted backup export and restore. A backup holds the vault's already-encrypted files plus a manifest sealed with a backup passphrase (Argon2id), so it works without any server. Folder locks are preserved.
use super::{format::*, service::{file_dto, file_key, new_id}};
use crate::{
    crypto::{aead::{self, random_bytes}, kdf::{self, KdfParams}, stream},
    dto::*,
    error::{AppError, Result},
    fsutil::unix_now,
    policy,
    state::AppState,
};
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, fs::{self, File}, io::{self, BufReader, BufWriter, Read, Write}};
use zeroize::Zeroizing;

/// magic | m_cost u32 | t_cost u32 | p_cost u32 | salt (16) | sealed manifest length u32 | sealed manifest | encrypted files, back to back
const MAGIC: &[u8; 5] = b"GDBK1";
const AAD_BACKUP: &[u8] = b"ghostdesk/v1/backup-manifest";
const MAX_MANIFEST: u32 = 64 * 1024 * 1024;

#[derive(Serialize, Deserialize)]
struct BSection { id: String, name: String, #[serde(default)] lock: Option<SectionLock> }

#[derive(Serialize, Deserialize, Clone)]
struct BFile {
    section_id: String, name: String, size: u64, mime: String, added_at: u64,
    #[serde(default)] key: String,
    #[serde(default)] sealed_key: Option<String>,
    blob_len: u64,
}

#[derive(Serialize, Deserialize)]
struct BManifest { created_at: u64, sections: Vec<BSection>, files: Vec<BFile> }

fn progress_for(name: &str, index: usize, count: usize, done: u64, total: u64) -> ImportProgress {
    ImportProgress { file_name: name.to_string(), index, count, done_bytes: done, total_bytes: total }
}

impl AppState {
    /// Writes an encrypted backup of the vault that is currently unlocked (the decoy session backs up the decoy).
    /// Files in locked folders stay locked inside the backup, protected by the same folder pattern or password.
    pub fn export_backup(&self, dest: &str, passphrase: &str, progress: &mut dyn FnMut(ImportProgress)) -> Result<usize> {
        if dest.trim().is_empty() { return Err(AppError::Invalid("Choose where to save the backup.".into())); }
        policy::validate_passphrase(passphrase)?;
        let manifest = {
            let guard = self.session_guard();
            guard.as_ref().ok_or(AppError::Locked)?.manifest.clone()
        };
        let mut files = Vec::with_capacity(manifest.files.len());
        for f in &manifest.files {
            let len = fs::metadata(self.store.blob_path(&f.id)?)?.len();
            files.push((f.id.clone(), BFile {
                section_id: f.section_id.clone(), name: f.name.clone(), size: f.size, mime: f.mime.clone(), added_at: f.added_at,
                key: f.key.clone(), sealed_key: f.sealed_key.clone(), blob_len: len,
            }));
        }
        let bm = BManifest {
            created_at: unix_now(),
            sections: manifest.sections.iter().map(|s| BSection { id: s.id.clone(), name: s.name.clone(), lock: s.lock.clone() }).collect(),
            files: files.iter().map(|(_, b)| b.clone()).collect(),
        };
        let json = Zeroizing::new(serde_json::to_vec(&bm)?);
        let params = KdfParams::default();
        let salt = random_bytes::<16>();
        let kek = kdf::derive_key(passphrase.as_bytes(), &salt, &params)?;
        let sealed = aead::seal(&kek, &json, AAD_BACKUP)?;

        let tmp = format!("{dest}.part");
        let count = files.len();
        let result = (|| -> Result<()> {
            let mut w = BufWriter::new(File::create(&tmp)?);
            w.write_all(MAGIC)?;
            for v in [params.m_cost, params.t_cost, params.p_cost] { w.write_all(&v.to_le_bytes())?; }
            w.write_all(&salt)?;
            w.write_all(&(sealed.len() as u32).to_le_bytes())?;
            w.write_all(&sealed)?;
            for (i, (id, meta)) in files.iter().enumerate() {
                let copied = io::copy(&mut File::open(self.store.blob_path(id)?)?, &mut w)?;
                if copied != meta.blob_len { return Err(AppError::Invalid("A file changed while the backup was running. Try again.".into())); }
                progress(progress_for(&meta.name, i, count, meta.blob_len, meta.blob_len));
            }
            w.flush()?;
            w.into_inner().map_err(|e| AppError::Io(e.into_error()))?.sync_all()?;
            Ok(())
        })();
        if let Err(e) = result { let _ = fs::remove_file(&tmp); return Err(e); }
        fs::rename(&tmp, dest)?;
        Ok(count)
    }

    /// Adds the contents of a backup to the unlocked vault. Open folders with the same name are merged; locked folders come back as new folders that keep their lock.
    /// Files in unlocked folders are verified before they are kept. Restoring adds files, so it needs a subscription.
    pub fn restore_backup(&self, src: &str, passphrase: &str, progress: &mut dyn FnMut(ImportProgress)) -> Result<ImportReport> {
        self.license.require_active()?;
        let existing: Vec<(String, String, bool)> = {
            let guard = self.session_guard();
            guard.as_ref().ok_or(AppError::Locked)?.manifest.sections.iter().map(|s| (s.id.clone(), s.name.clone(), s.lock.is_some())).collect()
        };
        let mut r = BufReader::new(File::open(src)?);
        let mut magic = [0u8; 5];
        r.read_exact(&mut magic)?;
        if &magic != MAGIC { return Err(AppError::Invalid("This isn't a GhostDesk backup file.".into())); }
        let mut word = || -> Result<u32> { let mut b = [0u8; 4]; r.read_exact(&mut b)?; Ok(u32::from_le_bytes(b)) };
        let params = KdfParams { m_cost: word()?, t_cost: word()?, p_cost: word()? };
        if params.m_cost > 1 << 20 || params.t_cost > 10 || params.p_cost > 16 {
            return Err(AppError::Invalid("This backup uses unsupported settings.".into()));
        }
        let mut salt = [0u8; 16];
        r.read_exact(&mut salt)?;
        let mut len_bytes = [0u8; 4];
        r.read_exact(&mut len_bytes)?;
        let sealed_len = u32::from_le_bytes(len_bytes);
        if !(40..=MAX_MANIFEST).contains(&sealed_len) { return Err(AppError::Invalid("The backup file is damaged.".into())); }
        let mut sealed = vec![0u8; sealed_len as usize];
        r.read_exact(&mut sealed)?;

        let kek = kdf::derive_key(passphrase.as_bytes(), &salt, &params)?;
        let json = aead::open(&kek, &sealed, AAD_BACKUP).map_err(|_| AppError::Invalid("Wrong backup passphrase, or the file is damaged.".into()))?;
        let bm: BManifest = serde_json::from_slice(&json)?;

        // Decide where each backup folder goes.
        let mut map: HashMap<String, String> = HashMap::new();
        let mut taken: Vec<String> = existing.iter().map(|(_, n, _)| n.to_lowercase()).collect();
        let mut new_sections: Vec<Section> = Vec::new();
        for s in &bm.sections {
            let base = policy::clean_name(&s.name).unwrap_or_else(|_| "Restored".to_string());
            let merge = if s.lock.is_none() {
                existing.iter().find(|(_, n, locked)| !locked && n.to_lowercase() == base.to_lowercase()).map(|(id, _, _)| id.clone())
                    .or_else(|| new_sections.iter().find(|n| n.lock.is_none() && n.name.to_lowercase() == base.to_lowercase()).map(|n| n.id.clone()))
            } else { None };
            let target = merge.unwrap_or_else(|| {
                let mut name = base.clone();
                if taken.contains(&name.to_lowercase()) { name = format!("{base} (restored)"); }
                taken.push(name.to_lowercase());
                let id = new_id();
                new_sections.push(Section { id: id.clone(), name, created_at: unix_now(), lock: s.lock.clone() });
                id
            });
            map.insert(s.id.clone(), target);
        }

        self.store.ensure_dirs()?;
        let count = bm.files.len();
        let (mut added, mut failed) = (Vec::<FileEntry>::new(), Vec::new());
        let cleanup = |added: &[FileEntry]| { for a in added { self.store.remove_blob(&a.id); } };
        for (i, f) in bm.files.iter().enumerate() {
            let id = new_id();
            let (tmp, dest) = (self.store.blob_tmp_path(&id)?, self.store.blob_path(&id)?);
            let copied = (|| -> Result<u64> {
                let mut w = BufWriter::new(File::create(&tmp)?);
                let n = io::copy(&mut (&mut r).take(f.blob_len), &mut w)?;
                w.flush()?;
                Ok(n)
            })();
            match copied {
                Ok(n) if n == f.blob_len => {}
                other => {
                    let _ = fs::remove_file(&tmp);
                    cleanup(&added);
                    return Err(other.err().unwrap_or_else(|| AppError::Invalid("The backup file is truncated.".into())));
                }
            }
            let mut entry = FileEntry {
                id: id.clone(), section_id: map.get(&f.section_id).cloned().unwrap_or_default(), name: f.name.clone(),
                size: f.size, mime: f.mime.clone(), added_at: f.added_at, sealed_key: f.sealed_key.clone(), key: f.key.clone(),
            };
            // Files in locked folders can't be verified without the folder key; they are authenticated whenever they are opened.
            let verified = if entry.sealed_key.is_some() {
                fs::rename(&tmp, &dest).map(|_| entry.size).map_err(AppError::from)
            } else {
                file_key(&entry)
                    .and_then(|key| stream::decrypt(&key, &mut BufReader::new(File::open(&tmp)?), &mut io::sink()))
                    .and_then(|plain_len| fs::rename(&tmp, &dest).map(|_| plain_len).map_err(AppError::from))
            };
            match verified {
                Ok(plain_len) if !entry.section_id.is_empty() => { entry.size = plain_len; added.push(entry); }
                Ok(_) => { self.store.remove_blob(&id); failed.push(ImportFailure { path: f.name.clone(), error: "Its folder is missing from the backup.".into() }); }
                Err(e) => { let _ = fs::remove_file(&tmp); failed.push(ImportFailure { path: f.name.clone(), error: e.to_string() }); }
            }
            progress(progress_for(&f.name, i, count, f.blob_len, f.blob_len));
        }

        let res = self.mutate(|m| {
            m.sections.extend(new_sections.iter().cloned());
            m.files.extend(added.iter().cloned());
            Ok(())
        });
        if let Err(e) = res { cleanup(&added); return Err(e); }
        Ok(ImportReport { imported: added.iter().map(file_dto).collect(), failed })
    }
}
