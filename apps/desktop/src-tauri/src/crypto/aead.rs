// path: apps/desktop/src-tauri/src/crypto/aead.rs
// purpose: XChaCha20-Poly1305 sealing and opening of small blobs (wrapped keys, the manifest) plus secure random helpers.
use crate::error::{AppError, Result};
use chacha20poly1305::{aead::{Aead, KeyInit, Payload}, Key, XChaCha20Poly1305, XNonce};
use rand::{rngs::OsRng, RngCore};
use zeroize::Zeroizing;

const NONCE_LEN: usize = 24;
const TAG_LEN: usize = 16;

pub fn random_bytes<const N: usize>() -> [u8; N] {
    let mut b = [0u8; N];
    OsRng.fill_bytes(&mut b);
    b
}

pub fn random_key() -> Zeroizing<[u8; 32]> { Zeroizing::new(random_bytes::<32>()) }

/// Output layout: 24-byte random nonce followed by ciphertext and tag. `aad` binds the blob to its purpose.
pub fn seal(key: &[u8; 32], plaintext: &[u8], aad: &[u8]) -> Result<Vec<u8>> {
    let cipher = XChaCha20Poly1305::new(Key::from_slice(key));
    let nonce = random_bytes::<NONCE_LEN>();
    let ct = cipher
        .encrypt(XNonce::from_slice(&nonce), Payload { msg: plaintext, aad })
        .map_err(|_| AppError::Crypto("Encryption failed".into()))?;
    let mut out = Vec::with_capacity(NONCE_LEN + ct.len());
    out.extend_from_slice(&nonce);
    out.extend_from_slice(&ct);
    Ok(out)
}

/// Authentication failure (wrong key or tampering) maps to `BadCredentials`; callers re-map as needed.
pub fn open(key: &[u8; 32], blob: &[u8], aad: &[u8]) -> Result<Zeroizing<Vec<u8>>> {
    if blob.len() < NONCE_LEN + TAG_LEN {
        return Err(AppError::Crypto("Stored data is corrupted".into()));
    }
    let (nonce, ct) = blob.split_at(NONCE_LEN);
    XChaCha20Poly1305::new(Key::from_slice(key))
        .decrypt(XNonce::from_slice(nonce), Payload { msg: ct, aad })
        .map(Zeroizing::new)
        .map_err(|_| AppError::BadCredentials)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn seal_open_roundtrip_and_tamper() {
        let k = random_key();
        let blob = seal(&k, b"hello", b"ctx").unwrap();
        assert_eq!(&**open(&k, &blob, b"ctx").unwrap(), b"hello");
        assert!(open(&k, &blob, b"other").is_err());
        let mut bad = blob.clone();
        *bad.last_mut().unwrap() ^= 1;
        assert!(open(&k, &bad, b"ctx").is_err());
    }
}
