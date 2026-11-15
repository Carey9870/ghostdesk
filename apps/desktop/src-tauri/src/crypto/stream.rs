// path: apps/desktop/src-tauri/src/crypto/stream.rs
// purpose: Chunked streaming file encryption (XChaCha20-Poly1305 STREAM, 1 MiB chunks) so large files never sit fully in memory when imported or exported.
use super::aead::random_bytes;
use crate::error::{AppError, Result};
use chacha20poly1305::{
    aead::{generic_array::GenericArray, stream::{DecryptorBE32, EncryptorBE32}, KeyInit, Payload},
    Key, XChaCha20Poly1305,
};
use std::io::{Read, Write};
use zeroize::Zeroize;

pub const CHUNK: usize = 1 << 20;
const TAG: usize = 16;
const MAGIC: &[u8; 4] = b"GDF1";
/// magic(4) | chunk size u32 LE (4) | plaintext length u64 LE (8) | stream nonce (19)
pub const HEADER_LEN: usize = 35;

fn chunk_count(len: u64) -> u64 { if len == 0 { 1 } else { (len + CHUNK as u64 - 1) / CHUNK as u64 } }

/// Encrypts exactly `plain_len` bytes from `reader`. The header is authenticated as AAD on every chunk.
pub fn encrypt<R: Read, W: Write>(key: &[u8; 32], reader: &mut R, writer: &mut W, plain_len: u64, progress: &mut dyn FnMut(u64)) -> Result<()> {
    let nonce = random_bytes::<19>();
    let mut hdr = [0u8; HEADER_LEN];
    hdr[..4].copy_from_slice(MAGIC);
    hdr[4..8].copy_from_slice(&(CHUNK as u32).to_le_bytes());
    hdr[8..16].copy_from_slice(&plain_len.to_le_bytes());
    hdr[16..].copy_from_slice(&nonce);
    writer.write_all(&hdr)?;

    let cipher = XChaCha20Poly1305::new(Key::from_slice(key));
    let mut enc = Some(EncryptorBE32::from_aead(cipher, GenericArray::from_slice(&nonce)));
    let total = chunk_count(plain_len);
    let mut buf = vec![0u8; CHUNK];
    let (mut remaining, mut done) = (plain_len, 0u64);
    for i in 0..total {
        let take = remaining.min(CHUNK as u64) as usize;
        reader.read_exact(&mut buf[..take])?;
        remaining -= take as u64;
        let payload = Payload { msg: &buf[..take], aad: &hdr };
        let ct = if i + 1 == total {
            enc.take().expect("stream state").encrypt_last(payload)
        } else {
            enc.as_mut().expect("stream state").encrypt_next(payload)
        }
        .map_err(|_| AppError::Crypto("Encryption failed".into()))?;
        writer.write_all(&ct)?;
        done += take as u64;
        progress(done);
    }
    buf.zeroize();
    writer.flush()?;
    Ok(())
}

/// Decrypts a file produced by `encrypt`, returning the plaintext length. Any tampering fails the call.
pub fn decrypt<R: Read, W: Write>(key: &[u8; 32], reader: &mut R, writer: &mut W) -> Result<u64> {
    let mut hdr = [0u8; HEADER_LEN];
    reader.read_exact(&mut hdr)?;
    let chunk = u32::from_le_bytes(hdr[4..8].try_into().unwrap()) as usize;
    if &hdr[..4] != MAGIC || chunk != CHUNK {
        return Err(AppError::Crypto("Unsupported or corrupted file".into()));
    }
    let plain_len = u64::from_le_bytes(hdr[8..16].try_into().unwrap());
    let cipher = XChaCha20Poly1305::new(Key::from_slice(key));
    let mut dec = Some(DecryptorBE32::from_aead(cipher, GenericArray::from_slice(&hdr[16..])));
    let total = chunk_count(plain_len);
    let mut buf = vec![0u8; CHUNK + TAG];
    let mut remaining = plain_len;
    let bad = |_| AppError::Crypto("The file is corrupted or was tampered with".into());
    for i in 0..total {
        let take = remaining.min(CHUNK as u64) as usize;
        reader.read_exact(&mut buf[..take + TAG])?;
        let payload = Payload { msg: &buf[..take + TAG], aad: &hdr };
        let mut pt = if i + 1 == total {
            dec.take().expect("stream state").decrypt_last(payload).map_err(bad)?
        } else {
            dec.as_mut().expect("stream state").decrypt_next(payload).map_err(bad)?
        };
        writer.write_all(&pt)?;
        pt.zeroize();
        remaining -= take as u64;
    }
    buf.zeroize();
    Ok(plain_len)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Cursor;

    fn roundtrip(len: usize) {
        let key = [7u8; 32];
        let data: Vec<u8> = (0..len).map(|i| (i % 251) as u8).collect();
        let mut enc = Vec::new();
        encrypt(&key, &mut Cursor::new(&data), &mut enc, len as u64, &mut |_| {}).unwrap();
        let mut out = Vec::new();
        decrypt(&key, &mut Cursor::new(&enc), &mut out).unwrap();
        assert_eq!(out, data);
        if len > 0 {
            let mut bad = enc.clone();
            let i = bad.len() / 2;
            bad[i] ^= 1;
            assert!(decrypt(&key, &mut Cursor::new(&bad), &mut Vec::new()).is_err());
        }
    }

    #[test]
    fn sizes_around_chunk_boundaries() {
        for len in [0, 1, 1000, CHUNK - 1, CHUNK, CHUNK + 1, 2 * CHUNK, 2 * CHUNK + 17] { roundtrip(len); }
    }
}
