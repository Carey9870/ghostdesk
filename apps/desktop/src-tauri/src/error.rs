// path: apps/desktop/src-tauri/src/error.rs
// purpose: The single application error type, serialised to the UI as { code, message, retryAfter }.
use serde::{ser::SerializeStruct, Serialize, Serializer};

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("{0}")]
    Invalid(String),
    #[error("The vault is locked")]
    Locked,
    #[error("No vault exists yet")]
    NoVault,
    #[error("A vault already exists on this device")]
    VaultExists,
    #[error("Pattern or passphrase is wrong")]
    BadCredentials,
    #[error("That recovery key isn't right")]
    BadRecoveryKey,
    #[error("Too many attempts. Try again in {0} seconds")]
    LockedOut(u64),
    #[error("An active subscription is required for this action")]
    LicenseRequired,
    #[error("Not found")]
    NotFound,
    #[error("This folder is locked")]
    FolderLocked,
    #[error("File error: {0}")]
    Io(#[from] std::io::Error),
    #[error("{0}")]
    Crypto(String),
    #[error("{0}")]
    Network(String),
}

pub type Result<T> = std::result::Result<T, AppError>;

impl AppError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::Invalid(_) => "invalid",
            Self::Locked => "locked",
            Self::NoVault => "no_vault",
            Self::VaultExists => "vault_exists",
            Self::BadCredentials => "bad_credentials",
            Self::BadRecoveryKey => "bad_recovery_key",
            Self::LockedOut(_) => "locked_out",
            Self::LicenseRequired => "license_required",
            Self::NotFound => "not_found",
            Self::FolderLocked => "folder_locked",
            Self::Io(_) => "io",
            Self::Crypto(_) => "crypto",
            Self::Network(_) => "network",
        }
    }
    fn retry_after(&self) -> Option<u64> {
        if let Self::LockedOut(s) = self { Some(*s) } else { None }
    }
}

impl Serialize for AppError {
    fn serialize<S: Serializer>(&self, s: S) -> std::result::Result<S::Ok, S::Error> {
        let mut st = s.serialize_struct("AppError", 3)?;
        st.serialize_field("code", self.code())?;
        st.serialize_field("message", &self.to_string())?;
        st.serialize_field("retryAfter", &self.retry_after())?;
        st.end()
    }
}

impl From<serde_json::Error> for AppError {
    fn from(e: serde_json::Error) -> Self {
        Self::Crypto(format!("Stored data is corrupted: {e}"))
    }
}

impl From<base64::DecodeError> for AppError {
    fn from(e: base64::DecodeError) -> Self {
        Self::Crypto(format!("Stored data is corrupted: {e}"))
    }
}
