// path: apps/desktop/src-tauri/src/crypto/kdf.rs
// purpose: Argon2id key derivation from the pattern + passphrase (or from the recovery key).
use crate::error::{AppError, Result};
use argon2::{Algorithm, Argon2, Params, Version};
use serde::{Deserialize, Serialize};
use zeroize::Zeroizing;

#[derive(Serialize, Deserialize, Clone, Copy, PartialEq, Debug)]
pub struct KdfParams { pub m_cost: u32, pub t_cost: u32, pub p_cost: u32 }

impl Default for KdfParams {
    /// 128 MiB, 3 passes, 4 lanes. Stored in the vault header so it can be raised later.
    fn default() -> Self { Self { m_cost: 131_072, t_cost: 3, p_cost: 4 } }
}

pub fn derive_key(secret: &[u8], salt: &[u8], p: &KdfParams) -> Result<Zeroizing<[u8; 32]>> {
    let params = Params::new(p.m_cost, p.t_cost, p.p_cost, Some(32)).map_err(|e| AppError::Crypto(e.to_string()))?;
    let mut out = Zeroizing::new([0u8; 32]);
    Argon2::new(Algorithm::Argon2id, Version::V0x13, params)
        .hash_password_into(secret, salt, &mut *out)
        .map_err(|e| AppError::Crypto(e.to_string()))?;
    Ok(out)
}

/// Both factors feed one derivation: passphrase, a separator byte, then the pattern as "0-1-2…".
pub fn credential_secret(passphrase: &str, pattern: &[u8]) -> Zeroizing<Vec<u8>> {
    let mut v = Vec::with_capacity(passphrase.len() + 1 + pattern.len() * 3);
    v.extend_from_slice(passphrase.as_bytes());
    v.push(0x1f);
    for (i, c) in pattern.iter().enumerate() {
        if i > 0 { v.push(b'-'); }
        v.extend_from_slice(c.to_string().as_bytes());
    }
    Zeroizing::new(v)
}

/// Recovery keys are compared case-insensitively and without separators.
pub fn recovery_secret(key: &str) -> Zeroizing<Vec<u8>> {
    Zeroizing::new(key.chars().filter(|c| c.is_ascii_alphanumeric()).map(|c| c.to_ascii_uppercase() as u8).collect())
}
