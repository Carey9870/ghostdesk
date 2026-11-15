// path: apps/desktop/src-tauri/src/policy.rs
// purpose: Server-side validation of passphrases, patterns and names. Mirrors packages/shared/src/passphrase.ts.
use crate::error::{AppError, Result};

pub const PASSPHRASE_MIN: usize = 14;
pub const PASSPHRASE_MAX: usize = 17;
pub const PATTERN_MIN: usize = 6;
pub const PATTERN_CELLS: u8 = 25;
pub const NAME_MAX: usize = 28;

pub fn validate_passphrase(p: &str) -> Result<()> {
    let n = p.chars().count();
    let ok = (PASSPHRASE_MIN..=PASSPHRASE_MAX).contains(&n)
        && p.chars().any(|c| c.is_ascii_lowercase())
        && p.chars().filter(|c| c.is_ascii_uppercase()).count() >= 2
        && p.chars().any(|c| c.is_ascii_digit())
        && p.chars().any(|c| !c.is_ascii_alphanumeric() && c != ' ')
        && p.contains(' ');
    if ok { Ok(()) } else { Err(AppError::Invalid("The passphrase doesn't meet the rules.".into())) }
}

pub fn validate_pattern(p: &[u8]) -> Result<()> {
    let mut seen = [false; PATTERN_CELLS as usize];
    for &c in p {
        if c >= PATTERN_CELLS || seen[c as usize] {
            return Err(AppError::Invalid("The pattern is invalid.".into()));
        }
        seen[c as usize] = true;
    }
    if p.len() < PATTERN_MIN {
        return Err(AppError::Invalid(format!("Connect at least {PATTERN_MIN} dots.")));
    }
    Ok(())
}

pub fn clean_name(name: &str) -> Result<String> {
    let n = name.trim();
    let len = n.chars().count();
    if len == 0 || len > NAME_MAX || n.chars().any(|c| c.is_control()) {
        return Err(AppError::Invalid(format!("Use 1 to {NAME_MAX} characters for the name.")));
    }
    Ok(n.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn passphrase_rules() {
        assert!(validate_passphrase("Blue Moon#2 Rise").is_ok());
        assert!(validate_passphrase("blue moon#2 rise").is_err()); // no capitals
        assert!(validate_passphrase("Blue Moon#2 Rise Over").is_err()); // too long
        assert!(validate_passphrase("BlueMoon#2Rise!!").is_err()); // no space
    }
    #[test]
    fn pattern_rules() {
        assert!(validate_pattern(&[0, 1, 2, 7, 12, 17]).is_ok());
        assert!(validate_pattern(&[0, 1, 2]).is_err());
        assert!(validate_pattern(&[0, 0, 1, 2, 3, 4]).is_err());
        assert!(validate_pattern(&[0, 1, 2, 3, 4, 30]).is_err());
    }
}
