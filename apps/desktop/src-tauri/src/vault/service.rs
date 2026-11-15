// path: apps/desktop/src-tauri/src/vault/service.rs
// purpose: Vault business logic: create, unlock (main or decoy), recovery, re-authentication, decoy management, folders with optional locks, and encrypted file operations with the free-file allowance.
use super::format::*;
use crate::{
    crypto::{aead::{self, random_bytes, random_key}, kdf::{self, KdfParams}, stream},
    dto::*,
    error::{AppError, Result},
    fsutil::unix_now,
    policy,
    state::{AppState, Session},
};
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use std::{collections::{HashMap, HashSet}, fs::{self, File}, io::{BufReader, BufWriter, Write}, path::Path};
use zeroize::Zeroizing;

const ALPHABET: &[u8; 32] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_PREVIEW_BYTES: u64 = 512 * 1024 * 1024;

pub(super) fn new_id() -> String { hex::encode(random_bytes::<16>()) }

/// 20 random characters from a 32-symbol alphabet (100 bits), shown as XXXXX-XXXXX-XXXXX-XXXXX.
fn generate_recovery_key() -> String {
    let chars: Vec<char> = random_bytes::<20>().iter().map(|b| ALPHABET[(b & 31) as usize] as char).collect();
    chars.chunks(5).map(|c| c.iter().collect::<String>()).collect::<Vec<_>>().join("-")
}

fn wrap(secret: &[u8], mk: &[u8; 32], params: &KdfParams, aad: &[u8]) -> Result<(String, String)> {
    let salt = random_bytes::<16>();
    let kek = kdf::derive_key(secret, &salt, params)?;
    Ok((B64.encode(salt), B64.encode(aead::seal(&kek, mk, aad)?)))
}

fn unwrap(secret: &[u8], salt_b64: &str, wrapped_b64: &str, params: &KdfParams, aad: &[u8]) -> Result<Zeroizing<[u8; 32]>> {
    let kek = kdf::derive_key(secret, &B64.decode(salt_b64)?, params)?;
    let plain = aead::open(&kek, &B64.decode(wrapped_b64)?, aad)?;
    to_key(&plain)
}

fn to_key(bytes: &[u8]) -> Result<Zeroizing<[u8; 32]>> {
    if bytes.len() != 32 { return Err(AppError::Crypto("Stored data is corrupted".into())); }
    let mut k = Zeroizing::new([0u8; 32]);
    k.copy_from_slice(bytes);
    Ok(k)
}

fn make_slot(mk: &[u8; 32], secret: &[u8], recovery_secret: &[u8], params: &KdfParams) -> Result<Slot> {
    let (salt, wrapped_mk) = wrap(secret, mk, params, AAD_WRAP_CREDENTIALS)?;
    let (recovery_salt, recovery_wrapped_mk) = wrap(recovery_secret, mk, params, AAD_WRAP_RECOVERY)?;
    Ok(Slot { salt, wrapped_mk, recovery_salt, recovery_wrapped_mk })
}

/// Tries every slot, always, so timing never reveals which vault (main or decoy) matched.
fn find_slot(secret: &[u8], h: &VaultHeader, recovery: bool) -> Option<(usize, Zeroizing<[u8; 32]>)> {
    let mut found = None;
    for (i, s) in h.slots.iter().enumerate() {
        let r = if recovery {
            unwrap(secret, &s.recovery_salt, &s.recovery_wrapped_mk, &h.kdf, AAD_WRAP_RECOVERY)
        } else {
            unwrap(secret, &s.salt, &s.wrapped_mk, &h.kdf, AAD_WRAP_CREDENTIALS)
        };
        if let Ok(mk) = r { if found.is_none() { found = Some((i, mk)); } }
    }
    found
}

/// Secret for a folder lock. Pattern-only and password-only locks are domain-separated; both together use the vault's combined form.
fn folder_secret(passphrase: Option<&str>, pattern: Option<&[u8]>) -> Result<Zeroizing<Vec<u8>>> {
    match (passphrase, pattern) {
        (Some(p), Some(pat)) => Ok(kdf::credential_secret(p, pat)),
        (Some(p), None) => { let mut v = b"W:".to_vec(); v.extend_from_slice(p.as_bytes()); Ok(Zeroizing::new(v)) }
        (None, Some(pat)) => {
            let mut v = b"P:".to_vec();
            for (i, c) in pat.iter().enumerate() { if i > 0 { v.push(b'-'); } v.extend_from_slice(c.to_string().as_bytes()); }
            Ok(Zeroizing::new(v))
        }
        (None, None) => Err(AppError::Invalid("Choose a pattern, a password, or both.".into())),
    }
}

/// Builds the secret from what the user typed, requiring exactly the factors this lock uses.
fn lock_secret(lock: &SectionLock, passphrase: Option<&str>, pattern: Option<&[u8]>) -> Result<Zeroizing<Vec<u8>>> {
    if (lock.passphrase && passphrase.is_none()) || (lock.pattern && pattern.is_none()) {
        return Err(AppError::Invalid("Enter everything this folder asks for.".into()));
    }
    folder_secret(if lock.passphrase { passphrase } else { None }, if lock.pattern { pattern } else { None })
}

fn build_header(slots: Vec<Slot>, kdf: KdfParams, created_at: u64) -> VaultHeader {
    VaultHeader { version: 2, kdf, slots, created_at }
}

pub(super) fn file_dto(f: &FileEntry) -> FileDto {
    FileDto { id: f.id.clone(), section_id: f.section_id.clone(), name: f.name.clone(), size: f.size, mime: f.mime.clone(), added_at: f.added_at }
}

fn is_locked(s: &Session, section: &Section) -> bool { section.lock.is_some() && !s.folder_keys.contains_key(&section.id) }

/// What the UI may see. Files and counts of locked folders that are still closed are withheld.
fn to_dto(s: &Session) -> VaultDto {
    let m = &s.manifest;
    VaultDto {
        sections: m.sections.iter().map(|sec| {
            let locked = is_locked(s, sec);
            SectionDto {
                id: sec.id.clone(), name: sec.name.clone(),
                file_count: if locked { 0 } else { m.files.iter().filter(|f| f.section_id == sec.id).count() },
                lock: sec.lock.as_ref().map(|l| LockDto { pattern: l.pattern, passphrase: l.passphrase }),
                locked,
            }
        }).collect(),
        files: m.files.iter().filter(|f| m.sections.iter().find(|x| x.id == f.section_id).map_or(false, |sec| !is_locked(s, sec))).map(file_dto).collect(),
        role: if m.role == Role::Decoy { "decoy" } else { "primary" },
        has_decoy: m.has_decoy,
    }
}

/// Plain per-file key (files in unlocked folders).
pub(super) fn file_key(e: &FileEntry) -> Result<Zeroizing<[u8; 32]>> {
    let bytes = Zeroizing::new(B64.decode(&e.key)?);
    to_key(&bytes)
}

impl AppState {
    fn fail(&self, e: AppError) -> AppError {
        match self.lockout.failure() { Some(secs) => AppError::LockedOut(secs), None => e }
    }

    /// Applies `f` to a copy of the manifest, persists it, then swaps it in. A failed write changes nothing.
    pub(super) fn mutate<T>(&self, f: impl FnOnce(&mut Manifest) -> Result<T>) -> Result<T> {
        let mut guard = self.session_guard();
        let s = guard.as_mut().ok_or(AppError::Locked)?;
        let mut next = s.manifest.clone();
        let out = f(&mut next)?;
        self.store.write_manifest(s.slot, &s.mk, &next)?;
        s.manifest = next;
        Ok(out)
    }

    pub(super) fn find_entry(&self, id: &str) -> Result<FileEntry> {
        let guard = self.session_guard();
        let s = guard.as_ref().ok_or(AppError::Locked)?;
        s.manifest.files.iter().find(|f| f.id == id).cloned().ok_or(AppError::NotFound)
    }

    fn session_info(&self) -> Result<(usize, Role, bool)> {
        let guard = self.session_guard();
        let s = guard.as_ref().ok_or(AppError::Locked)?;
        Ok((s.slot, s.manifest.role, s.manifest.has_decoy))
    }

    pub fn snapshot(&self) -> Result<VaultDto> {
        let guard = self.session_guard();
        Ok(to_dto(guard.as_ref().ok_or(AppError::Locked)?))
    }

    /// Fails with `FolderLocked` when the folder has a lock that has not been opened in this session.
    fn ensure_section_open(&self, section_id: &str) -> Result<()> {
        let guard = self.session_guard();
        let s = guard.as_ref().ok_or(AppError::Locked)?;
        let sec = s.manifest.sections.iter().find(|x| x.id == section_id).ok_or(AppError::NotFound)?;
        if is_locked(s, sec) { Err(AppError::FolderLocked) } else { Ok(()) }
    }

    /// Key for a file's content: plain, or unsealed with its folder key when the folder is locked.
    pub(super) fn resolve_key(&self, e: &FileEntry) -> Result<Zeroizing<[u8; 32]>> {
        let Some(sealed) = &e.sealed_key else { return file_key(e) };
        let fk = {
            let guard = self.session_guard();
            guard.as_ref().ok_or(AppError::Locked)?.folder_keys.get(&e.section_id).cloned().ok_or(AppError::FolderLocked)?
        };
        let plain = aead::open(&fk, &B64.decode(sealed)?, AAD_FILE_KEY).map_err(|_| AppError::Crypto("Stored data is corrupted".into()))?;
        to_key(&plain)
    }

    /// How many of `wanted` files may be added now: everything with a subscription, the free allowance without one.
    fn free_gate(&self, wanted: usize) -> Result<usize> {
        let l = self.license.dto();
        match l.state {
            "active" => Ok(wanted),
            "none" if l.free_files_left > 0 => Ok(wanted.min(l.free_files_left as usize)),
            _ => Err(AppError::LicenseRequired),
        }
    }

    // ---- credentials ------------------------------------------------------------------------

    pub fn create_vault(&self, passphrase: &str, pattern: &[u8]) -> Result<String> {
        if self.store.exists() { return Err(AppError::VaultExists); }
        policy::validate_passphrase(passphrase)?;
        policy::validate_pattern(pattern)?;
        let params = KdfParams::default();
        let mk = random_key();
        let recovery = generate_recovery_key();
        let now = unix_now();
        let slot = make_slot(&mk, &kdf::credential_secret(passphrase, pattern), &kdf::recovery_secret(&recovery), &params)?;
        let header = build_header(vec![slot, Slot::random()], params, now);
        let manifest = Manifest {
            sections: vec![Section { id: new_id(), name: "Documents".into(), created_at: now, lock: None }],
            files: vec![], role: Role::Primary, has_decoy: false,
        };
        self.store.write_manifest(0, &mk, &manifest)?;
        self.store.write_filler_manifest(1)?;
        self.store.write_header(&header)?; // the header is the commit point
        *self.session_guard() = Some(Session { mk, slot: 0, manifest, folder_keys: HashMap::new() });
        Ok(recovery)
    }

    /// Opens whichever vault (main or decoy) the credentials belong to. The caller cannot tell which one it was.
    pub fn unlock(&self, passphrase: &str, pattern: &[u8]) -> Result<()> {
        self.lockout.check()?;
        let h = self.store.read_header()?;
        let Some((slot, mk)) = find_slot(&kdf::credential_secret(passphrase, pattern), &h, false) else {
            return Err(self.fail(AppError::BadCredentials));
        };
        self.lockout.success();
        let manifest = self.store.read_manifest(slot, &mk)?;
        *self.session_guard() = Some(Session { mk, slot, manifest, folder_keys: HashMap::new() });
        Ok(())
    }

    fn recovery_slot(&self, key: &str, h: &VaultHeader) -> Result<(usize, Zeroizing<[u8; 32]>)> {
        find_slot(&kdf::recovery_secret(key), h, true).ok_or_else(|| self.fail(AppError::BadRecoveryKey))
    }

    pub fn check_recovery_key(&self, key: &str) -> Result<()> {
        self.lockout.check()?;
        self.recovery_slot(key, &self.store.read_header()?).map(|_| ())
    }

    /// Opens the vault the recovery key belongs to, sets new credentials and issues a new recovery key. The old key stops working.
    pub fn recover(&self, key: &str, passphrase: &str, pattern: &[u8]) -> Result<String> {
        policy::validate_passphrase(passphrase)?;
        policy::validate_pattern(pattern)?;
        self.lockout.check()?;
        let mut h = self.store.read_header()?;
        let (idx, mk) = self.recovery_slot(key, &h)?;
        let secret = kdf::credential_secret(passphrase, pattern);
        let clashes = h.slots.iter().enumerate().any(|(i, s)| i != idx && unwrap(&secret, &s.salt, &s.wrapped_mk, &h.kdf, AAD_WRAP_CREDENTIALS).is_ok());
        if clashes { return Err(AppError::Invalid("Choose a different pattern and passphrase.".into())); }
        let new_recovery = generate_recovery_key();
        h.slots[idx] = make_slot(&mk, &secret, &kdf::recovery_secret(&new_recovery), &h.kdf)?;
        self.store.write_header(&h)?;
        self.lockout.success();
        let manifest = self.store.read_manifest(idx, &mk)?;
        *self.session_guard() = Some(Session { mk, slot: idx, manifest, folder_keys: HashMap::new() });
        Ok(new_recovery)
    }

    /// Proves the person at the keyboard knows this vault's pattern and passphrase (used before sensitive changes).
    fn reauth(&self, passphrase: &str, pattern: &[u8]) -> Result<Zeroizing<[u8; 32]>> {
        self.lockout.check()?;
        let h = self.store.read_header()?;
        let (slot, session_mk) = {
            let guard = self.session_guard();
            let s = guard.as_ref().ok_or(AppError::Locked)?;
            (s.slot, s.mk.clone())
        };
        match find_slot(&kdf::credential_secret(passphrase, pattern), &h, false) {
            Some((i, mk)) if i == slot && mk[..] == session_mk[..] => { self.lockout.success(); Ok(mk) }
            _ => Err(self.fail(AppError::BadCredentials)),
        }
    }

    pub fn verify_credentials(&self, passphrase: &str, pattern: &[u8]) -> Result<()> { self.reauth(passphrase, pattern).map(|_| ()) }

    /// Replaces this vault's recovery key. The previous key is gone for good.
    pub fn renew_recovery_key(&self, passphrase: &str, pattern: &[u8]) -> Result<String> {
        let mk = self.reauth(passphrase, pattern)?;
        let (slot, _, _) = self.session_info()?;
        let mut h = self.store.read_header()?;
        let recovery = generate_recovery_key();
        let (rs, rw) = wrap(&kdf::recovery_secret(&recovery), &mk, &h.kdf, AAD_WRAP_RECOVERY)?;
        h.slots[slot].recovery_salt = rs;
        h.slots[slot].recovery_wrapped_mk = rw;
        self.store.write_header(&h)?;
        Ok(recovery)
    }

    // ---- decoy vault ------------------------------------------------------------------------

    /// Creates a second, independent vault that opens with its own pattern and passphrase. Only the main vault can do this.
    pub fn create_decoy(&self, passphrase: &str, pattern: &[u8], decoy_passphrase: &str, decoy_pattern: &[u8]) -> Result<VaultDto> {
        let (slot, role, has_decoy) = self.session_info()?;
        if role != Role::Primary { return Err(AppError::Invalid("Decoy vaults are managed from your main vault.".into())); }
        if has_decoy { return Err(AppError::Invalid("A decoy vault already exists. Remove it first.".into())); }
        policy::validate_passphrase(decoy_passphrase)?;
        policy::validate_pattern(decoy_pattern)?;
        if decoy_passphrase == passphrase || decoy_pattern == pattern {
            return Err(AppError::Invalid("The decoy needs its own pattern and passphrase, different from your main ones.".into()));
        }
        self.reauth(passphrase, pattern)?;

        let mut h = self.store.read_header()?;
        let other = 1 - slot;
        let mk2 = random_key();
        let throwaway = generate_recovery_key(); // nobody ever sees it; the decoy has a renewable recovery key like any vault
        let new_slot = make_slot(&mk2, &kdf::credential_secret(decoy_passphrase, decoy_pattern), &kdf::recovery_secret(&throwaway), &h.kdf)?;
        let manifest = Manifest {
            sections: vec![Section { id: new_id(), name: "Documents".into(), created_at: unix_now(), lock: None }],
            files: vec![], role: Role::Decoy, has_decoy: false,
        };
        self.store.write_manifest(other, &mk2, &manifest)?;
        h.slots[other] = new_slot;
        self.store.write_header(&h)?;
        self.mutate(|m| { m.has_decoy = true; Ok(()) })?;
        self.snapshot()
    }

    /// Destroys the decoy vault and its files. Anything not referenced by the main vault belonged to the decoy.
    pub fn remove_decoy(&self, passphrase: &str, pattern: &[u8]) -> Result<VaultDto> {
        let (slot, role, has_decoy) = self.session_info()?;
        if role != Role::Primary || !has_decoy { return Err(AppError::Invalid("There is no decoy vault to remove.".into())); }
        self.reauth(passphrase, pattern)?;
        let other = 1 - slot;
        let mut h = self.store.read_header()?;
        h.slots[other] = Slot::random();
        self.store.write_header(&h)?;
        self.store.write_filler_manifest(other)?;
        let keep: HashSet<String> = {
            let guard = self.session_guard();
            guard.as_ref().ok_or(AppError::Locked)?.manifest.files.iter().map(|f| f.id.clone()).collect()
        };
        for id in self.store.list_blob_ids() { if !keep.contains(&id) { self.store.remove_blob(&id); } }
        self.mutate(|m| { m.has_decoy = false; Ok(()) })?;
        self.snapshot()
    }

    // ---- folders ----------------------------------------------------------------------------

    /// Folders are always free and unlimited.
    pub fn create_section(&self, name: &str) -> Result<VaultDto> {
        let name = policy::clean_name(name)?;
        self.mutate(|m| {
            if m.sections.iter().any(|s| s.name.to_lowercase() == name.to_lowercase()) {
                return Err(AppError::Invalid("A folder with that name already exists.".into()));
            }
            m.sections.push(Section { id: new_id(), name: name.clone(), created_at: unix_now(), lock: None });
            Ok(())
        })?;
        self.snapshot()
    }

    pub fn rename_section(&self, id: &str, name: &str) -> Result<VaultDto> {
        let name = policy::clean_name(name)?;
        self.ensure_section_open(id)?;
        self.mutate(|m| {
            if m.sections.iter().any(|s| s.id != id && s.name.to_lowercase() == name.to_lowercase()) {
                return Err(AppError::Invalid("A folder with that name already exists.".into()));
            }
            m.sections.iter_mut().find(|s| s.id == id).ok_or(AppError::NotFound)?.name = name.clone();
            Ok(())
        })?;
        self.snapshot()
    }

    pub fn delete_section(&self, id: &str) -> Result<VaultDto> {
        self.ensure_section_open(id)?;
        let removed = self.mutate(|m| {
            if m.sections.len() <= 1 { return Err(AppError::Invalid("Keep at least one folder.".into())); }
            let pos = m.sections.iter().position(|s| s.id == id).ok_or(AppError::NotFound)?;
            m.sections.remove(pos);
            let ids: Vec<String> = m.files.iter().filter(|f| f.section_id == id).map(|f| f.id.clone()).collect();
            m.files.retain(|f| f.section_id != id);
            Ok(ids)
        })?;
        for fid in removed { self.store.remove_blob(&fid); }
        if let Some(s) = self.session_guard().as_mut() { s.folder_keys.remove(id); }
        self.snapshot()
    }

    // ---- folder locks -----------------------------------------------------------------------

    /// Opens a locked folder for the rest of this session with its pattern and/or password.
    pub fn unlock_section(&self, id: &str, passphrase: Option<&str>, pattern: Option<&[u8]>) -> Result<VaultDto> {
        self.lockout.check()?;
        let lock = {
            let guard = self.session_guard();
            let s = guard.as_ref().ok_or(AppError::Locked)?;
            s.manifest.sections.iter().find(|x| x.id == id).ok_or(AppError::NotFound)?.lock.clone()
        };
        let Some(lock) = lock else { return self.snapshot() };
        let secret = lock_secret(&lock, passphrase, pattern)?;
        let params = self.store.read_header()?.kdf;
        let fk = match unwrap(&secret, &lock.salt, &lock.wrapped_fk, &params, AAD_FOLDER_KEY) {
            Ok(k) => k,
            Err(AppError::BadCredentials) => return Err(self.fail(AppError::BadCredentials)),
            Err(e) => return Err(e),
        };
        self.lockout.success();
        self.session_guard().as_mut().ok_or(AppError::Locked)?.folder_keys.insert(id.to_string(), fk);
        self.snapshot()
    }

    /// Closes an open locked folder again without locking the whole vault.
    pub fn relock_section(&self, id: &str) -> Result<VaultDto> {
        if let Some(s) = self.session_guard().as_mut() { s.folder_keys.remove(id); }
        self.snapshot()
    }

    /// Adds, changes or removes a folder's lock. Changing or removing an existing lock requires its current credentials.
    pub fn set_section_lock(&self, id: &str, setup: Option<LockInput>, current: Option<LockInput>) -> Result<VaultDto> {
        let existing = {
            let guard = self.session_guard();
            let s = guard.as_ref().ok_or(AppError::Locked)?;
            s.manifest.sections.iter().find(|x| x.id == id).ok_or(AppError::NotFound)?.lock.clone()
        };
        let params = self.store.read_header()?.kdf;

        let fk: Zeroizing<[u8; 32]> = match &existing {
            Some(l) => {
                let c = current.ok_or_else(|| AppError::Invalid("Enter the folder's current lock first.".into()))?;
                self.lockout.check()?;
                let secret = lock_secret(l, c.passphrase.as_deref(), c.pattern.as_deref())?;
                match unwrap(&secret, &l.salt, &l.wrapped_fk, &params, AAD_FOLDER_KEY) {
                    Ok(k) => { self.lockout.success(); k }
                    Err(AppError::BadCredentials) => return Err(self.fail(AppError::BadCredentials)),
                    Err(e) => return Err(e),
                }
            }
            None => random_key(),
        };

        match setup {
            None => {
                if existing.is_none() { return Err(AppError::Invalid("This folder has no lock.".into())); }
                self.mutate(|m| {
                    for f in m.files.iter_mut().filter(|f| f.section_id == id) {
                        if let Some(sealed) = f.sealed_key.take() {
                            let plain = aead::open(&fk, &B64.decode(&sealed)?, AAD_FILE_KEY).map_err(|_| AppError::Crypto("Stored data is corrupted".into()))?;
                            f.key = B64.encode(&*plain);
                        }
                    }
                    m.sections.iter_mut().find(|s| s.id == id).ok_or(AppError::NotFound)?.lock = None;
                    Ok(())
                })?;
                if let Some(s) = self.session_guard().as_mut() { s.folder_keys.remove(id); }
            }
            Some(s) => {
                if let Some(p) = &s.passphrase { policy::validate_passphrase(p)?; }
                if let Some(p) = &s.pattern { policy::validate_pattern(p)?; }
                let secret = folder_secret(s.passphrase.as_deref(), s.pattern.as_deref())?;
                let (salt, wrapped_fk) = wrap(&secret, &fk, &params, AAD_FOLDER_KEY)?;
                let lock = SectionLock { pattern: s.pattern.is_some(), passphrase: s.passphrase.is_some(), salt, wrapped_fk };
                let first_time = existing.is_none();
                self.mutate(|m| {
                    if first_time {
                        for f in m.files.iter_mut().filter(|f| f.section_id == id) {
                            let sealed = aead::seal(&fk, &*file_key(f)?, AAD_FILE_KEY)?;
                            f.sealed_key = Some(B64.encode(sealed));
                            f.key = String::new();
                        }
                    }
                    m.sections.iter_mut().find(|x| x.id == id).ok_or(AppError::NotFound)?.lock = Some(lock.clone());
                    Ok(())
                })?;
                self.session_guard().as_mut().ok_or(AppError::Locked)?.folder_keys.insert(id.to_string(), fk);
            }
        }
        self.snapshot()
    }

    // ---- files ------------------------------------------------------------------------------

    fn encrypt_to(&self, src: &Path, tmp: &Path, key: &[u8; 32], len: u64, on: &mut dyn FnMut(u64)) -> Result<()> {
        let mut reader = BufReader::new(File::open(src)?);
        let mut writer = BufWriter::new(File::create(tmp)?);
        stream::encrypt(key, &mut reader, &mut writer, len, on)?;
        writer.into_inner().map_err(|e| AppError::Io(e.into_error()))?.sync_all()?;
        Ok(())
    }

    fn import_one(&self, section_id: &str, path: &str, index: usize, count: usize, seal_with: Option<&[u8; 32]>, progress: &mut dyn FnMut(ImportProgress)) -> Result<FileEntry> {
        let src = Path::new(path);
        let meta = fs::metadata(src)?;
        if !meta.is_file() { return Err(AppError::Invalid("Folders can't be imported. Add the files inside instead.".into())); }
        let name = src.file_name().and_then(|n| n.to_str()).ok_or_else(|| AppError::Invalid("Unsupported file name.".into()))?.to_string();
        let id = new_id();
        let key = random_key();
        let (tmp, dest) = (self.store.blob_tmp_path(&id)?, self.store.blob_path(&id)?);
        let total = meta.len();
        let file_name = name.clone();
        let res = self.encrypt_to(src, &tmp, &key, total, &mut |done| {
            progress(ImportProgress { file_name: file_name.clone(), index, count, done_bytes: done, total_bytes: total })
        });
        if let Err(e) = res { let _ = fs::remove_file(&tmp); return Err(e); }
        fs::rename(&tmp, &dest)?;
        let (plain_key, sealed_key) = match seal_with {
            Some(fk) => (String::new(), Some(B64.encode(aead::seal(fk, &*key, AAD_FILE_KEY)?))),
            None => (B64.encode(&*key), None),
        };
        Ok(FileEntry {
            id, section_id: section_id.to_string(), name, size: total,
            mime: mime_guess::from_path(src).first_or_octet_stream().to_string(),
            added_at: unix_now(), sealed_key, key: plain_key,
        })
    }

    /// Without a subscription only the free allowance can be added; the rest are reported as needing a subscription.
    pub fn import_files(&self, section_id: &str, paths: Vec<String>, progress: &mut dyn FnMut(ImportProgress)) -> Result<ImportReport> {
        let allowed = self.free_gate(paths.len())?;
        let seal_key: Option<Zeroizing<[u8; 32]>> = {
            let guard = self.session_guard();
            let s = guard.as_ref().ok_or(AppError::Locked)?;
            let sec = s.manifest.sections.iter().find(|x| x.id == section_id).ok_or(AppError::NotFound)?;
            if sec.lock.is_some() { Some(s.folder_keys.get(section_id).cloned().ok_or(AppError::FolderLocked)?) } else { None }
        };
        self.store.ensure_dirs()?;
        let count = paths.len().min(allowed);
        let (mut added, mut failed) = (Vec::<FileEntry>::new(), Vec::new());
        for (i, p) in paths.iter().enumerate() {
            if i >= allowed {
                failed.push(ImportFailure { path: p.clone(), error: "Subscribe to add more files.".into() });
                continue;
            }
            match self.import_one(section_id, p, i, count, seal_key.as_deref(), progress) {
                Ok(e) => added.push(e),
                Err(e) => failed.push(ImportFailure { path: p.clone(), error: e.to_string() }),
            }
        }
        if !added.is_empty() {
            let res = self.mutate(|m| {
                if !m.sections.iter().any(|x| x.id == section_id) { return Err(AppError::NotFound); }
                m.files.extend(added.iter().cloned());
                Ok(())
            });
            if let Err(e) = res {
                for f in &added { self.store.remove_blob(&f.id); }
                return Err(e);
            }
            if self.license.dto().state == "none" { self.license.consume_free(added.len() as u32); }
        }
        Ok(ImportReport { imported: added.iter().map(file_dto).collect(), failed })
    }

    /// Decrypts a file into memory for the viewer. Nothing is written to disk.
    pub fn read_file(&self, id: &str) -> Result<Vec<u8>> {
        let entry = self.find_entry(id)?;
        if entry.size > MAX_PREVIEW_BYTES {
            return Err(AppError::Invalid("This file is too large to preview. Export it instead.".into()));
        }
        let key = self.resolve_key(&entry)?;
        let mut reader = BufReader::new(File::open(self.store.blob_path(&entry.id)?)?);
        let mut out = Vec::with_capacity(entry.size as usize);
        stream::decrypt(&key, &mut reader, &mut out)?;
        Ok(out)
    }

    /// Writes a decrypted copy to a location the user chose.
    pub fn export_file(&self, id: &str, dest: &str) -> Result<()> {
        if dest.trim().is_empty() { return Err(AppError::Invalid("Choose where to save the file.".into())); }
        let entry = self.find_entry(id)?;
        let key = self.resolve_key(&entry)?;
        let mut reader = BufReader::new(File::open(self.store.blob_path(&entry.id)?)?);
        let mut writer = BufWriter::new(File::create(dest)?);
        let res = stream::decrypt(&key, &mut reader, &mut writer).and_then(|_| writer.flush().map_err(AppError::from));
        if let Err(e) = res { drop(writer); let _ = fs::remove_file(dest); return Err(e); }
        Ok(())
    }

    pub fn delete_file(&self, id: &str) -> Result<VaultDto> {
        let entry = self.find_entry(id)?;
        self.ensure_section_open(&entry.section_id)?;
        self.mutate(|m| {
            let pos = m.files.iter().position(|f| f.id == id).ok_or(AppError::NotFound)?;
            m.files.remove(pos);
            Ok(())
        })?;
        self.store.remove_blob(id);
        self.snapshot()
    }
}
