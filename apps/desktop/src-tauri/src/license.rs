// path: apps/desktop/src-tauri/src/license.rs
// purpose: Subscription licensing. Verifies Ed25519-signed tokens offline and talks to the license server only for activation and refresh.
use crate::{dto::LicenseDto, error::{AppError, Result}, fsutil::{atomic_write, unix_now}};
use base64::{engine::general_purpose::{STANDARD as B64, URL_SAFE_NO_PAD as B64URL}, Engine};
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use serde::{Deserialize, Serialize};
use std::{path::{Path, PathBuf}, sync::Mutex, time::Duration};

/// Both values are baked in at build time: see README.md.
const PUBLIC_KEY_B64: Option<&str> = option_env!("GHOSTDESK_LICENSE_PUBLIC_KEY");
const API_BASE: Option<&str> = option_env!("GHOSTDESK_API_BASE");

/// Files a person may add before a subscription is needed.
pub const FREE_FILES: u32 = 1;

#[derive(Serialize, Deserialize, Default, Clone)]
struct LicenseFile { device_id: String, key: Option<String>, token: Option<String>, #[serde(default)] free_files_used: u32 }

#[derive(Deserialize)]
struct Claims { plan: String, exp: u64 }

enum Outcome { Active(String), Inactive }

pub struct LicenseStore { path: PathBuf, file: Mutex<LicenseFile> }

fn verify_token(token: &str) -> Result<Claims> {
    let bad = || AppError::Invalid("The license token is invalid.".into());
    let pk_b64 = PUBLIC_KEY_B64.ok_or_else(|| AppError::Invalid("This build has no license public key configured.".into()))?;
    let pk: [u8; 32] = B64.decode(pk_b64)?.try_into().map_err(|_| bad())?;
    let vk = VerifyingKey::from_bytes(&pk).map_err(|_| bad())?;
    let mut parts = token.split('.');
    let (Some("GD1"), Some(payload), Some(sig), None) = (parts.next(), parts.next(), parts.next(), parts.next()) else { return Err(bad()) };
    let sig = Signature::from_slice(&B64URL.decode(sig).map_err(|_| bad())?).map_err(|_| bad())?;
    vk.verify(format!("GD1.{payload}").as_bytes(), &sig).map_err(|_| bad())?;
    Ok(serde_json::from_slice(&B64URL.decode(payload).map_err(|_| bad())?)?)
}

fn valid_key_format(k: &str) -> bool {
    let parts: Vec<&str> = k.split('-').collect();
    parts.len() == 5 && parts[0] == "GD" && parts[1..].iter().all(|p| p.len() == 4 && p.bytes().all(|b| b.is_ascii_uppercase() || b.is_ascii_digit()))
}

impl LicenseStore {
    pub fn new(dir: &Path) -> Self {
        let path = dir.join("license.json");
        let mut f: LicenseFile = std::fs::read(&path).ok().and_then(|b| serde_json::from_slice(&b).ok()).unwrap_or_default();
        if f.device_id.is_empty() {
            f.device_id = uuid::Uuid::new_v4().to_string();
            let _ = atomic_write(&path, &serde_json::to_vec(&f).unwrap_or_default());
        }
        Self { path, file: Mutex::new(f) }
    }

    fn snapshot(&self) -> LicenseFile { self.file.lock().unwrap_or_else(|e| e.into_inner()).clone() }

    fn update(&self, f: impl FnOnce(&mut LicenseFile)) {
        let mut g = self.file.lock().unwrap_or_else(|e| e.into_inner());
        f(&mut g);
        let _ = atomic_write(&self.path, &serde_json::to_vec(&*g).unwrap_or_default());
    }

    pub fn dto(&self) -> LicenseDto {
        let f = self.snapshot();
        match f.token.as_deref().map(verify_token) {
            Some(Ok(c)) => LicenseDto { state: if c.exp > unix_now() { "active" } else { "lapsed" }, plan: Some(c.plan), expires_at: Some(c.exp), free_files_left: 0 },
            _ if f.key.is_some() => LicenseDto { state: "lapsed", plan: None, expires_at: None, free_files_left: 0 },
            _ => LicenseDto { state: "none", plan: None, expires_at: None, free_files_left: FREE_FILES.saturating_sub(f.free_files_used) },
        }
    }

    /// Counts files added during the free allowance. It never goes down, so deleting a file does not give the allowance back.
    pub fn consume_free(&self, n: u32) { self.update(|f| f.free_files_used = f.free_files_used.saturating_add(n)); }

    pub fn require_active(&self) -> Result<()> {
        if self.dto().state == "active" { Ok(()) } else { Err(AppError::LicenseRequired) }
    }

    async fn post(&self, path: &str, key: &str) -> Result<(u16, serde_json::Value)> {
        let base = API_BASE.ok_or_else(|| AppError::Network("This build has no license server configured.".into()))?;
        let client = reqwest::Client::builder().timeout(Duration::from_secs(15)).user_agent("GhostDesk").build().map_err(|e| AppError::Network(e.to_string()))?;
        let resp = client
            .post(format!("{}{}", base.trim_end_matches('/'), path))
            .json(&serde_json::json!({ "key": key, "deviceId": self.snapshot().device_id }))
            .send().await
            .map_err(|_| AppError::Network("Couldn't reach the license server. Check your internet connection.".into()))?;
        let status = resp.status().as_u16();
        Ok((status, resp.json().await.unwrap_or(serde_json::Value::Null)))
    }

    async fn check(&self, key: &str) -> Result<Outcome> {
        let (status, body) = self.post("/api/license/check", key).await?;
        if status != 200 {
            return Err(AppError::Invalid(body["error"].as_str().unwrap_or("The license check failed.").to_string()));
        }
        match body["status"].as_str() {
            Some("active") => {
                let token = body["token"].as_str().ok_or_else(|| AppError::Network("Unexpected server response.".into()))?.to_string();
                verify_token(&token)?;
                Ok(Outcome::Active(token))
            }
            Some("inactive") => Ok(Outcome::Inactive),
            _ => Err(AppError::Network("Unexpected server response.".into())),
        }
    }

    pub async fn activate(&self, key: &str) -> Result<LicenseDto> {
        let key = key.trim().to_uppercase();
        if !valid_key_format(&key) { return Err(AppError::Invalid("That doesn't look like a license key. It starts with GD- and has four groups of four characters.".into())); }
        match self.check(&key).await? {
            Outcome::Active(token) => { self.update(|f| { f.key = Some(key); f.token = Some(token); }); Ok(self.dto()) }
            Outcome::Inactive => Err(AppError::Invalid("This license has expired. Renew your subscription on the GhostDesk website.".into())),
        }
    }

    /// Renews the signed token while online. Offline failures leave the current token untouched.
    pub async fn refresh(&self) -> Result<LicenseDto> {
        let Some(key) = self.snapshot().key else { return Ok(self.dto()) };
        match self.check(&key).await? {
            Outcome::Active(token) => self.update(|f| f.token = Some(token)),
            Outcome::Inactive => self.update(|f| f.token = None),
        }
        Ok(self.dto())
    }

    pub async fn manage_url(&self) -> Result<String> {
        let key = self.snapshot().key.ok_or_else(|| AppError::Invalid("No license is active on this device.".into()))?;
        let (status, body) = self.post("/api/license/manage", &key).await?;
        match (status, body["url"].as_str()) {
            (200, Some(url)) => Ok(url.to_string()),
            _ => Err(AppError::Invalid(body["error"].as_str().unwrap_or("Couldn't open subscription management.").to_string())),
        }
    }
}
