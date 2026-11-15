// path: apps/desktop/src-tauri/src/commands.rs
// purpose: Tauri command layer. Thin wrappers that run blocking crypto and file work off the UI thread and call the vault service.
use crate::{dto::*, error::{AppError, Result}, state::AppState};
use tauri::{ipc::{Channel, Response}, State};

async fn blocking<T: Send + 'static>(state: &State<'_, AppState>, f: impl FnOnce(&AppState) -> Result<T> + Send + 'static) -> Result<T> {
    let s = state.inner().clone();
    let joined = tauri::async_runtime::spawn_blocking(move || f(&s)).await.map_err(|e| AppError::Crypto(e.to_string()))?;
    joined
}

#[tauri::command]
pub async fn app_status(state: State<'_, AppState>) -> Result<StatusDto> {
    Ok(StatusDto { vault_exists: state.store.exists(), unlocked: state.is_unlocked(), license: state.license.dto() })
}

#[tauri::command]
pub async fn create_vault(state: State<'_, AppState>, passphrase: String, pattern: Vec<u8>) -> Result<String> {
    blocking(&state, move |s| s.create_vault(&passphrase, &pattern)).await
}

#[tauri::command]
pub async fn unlock(state: State<'_, AppState>, passphrase: String, pattern: Vec<u8>) -> Result<()> {
    blocking(&state, move |s| s.unlock(&passphrase, &pattern)).await
}

#[tauri::command]
pub fn lock(state: State<'_, AppState>) { state.lock_session() }

#[tauri::command]
pub async fn check_recovery_key(state: State<'_, AppState>, recovery_key: String) -> Result<()> {
    blocking(&state, move |s| s.check_recovery_key(&recovery_key)).await
}

#[tauri::command]
pub async fn recover(state: State<'_, AppState>, recovery_key: String, passphrase: String, pattern: Vec<u8>) -> Result<String> {
    blocking(&state, move |s| s.recover(&recovery_key, &passphrase, &pattern)).await
}

#[tauri::command]
pub async fn renew_recovery_key(state: State<'_, AppState>, passphrase: String, pattern: Vec<u8>) -> Result<String> {
    blocking(&state, move |s| s.renew_recovery_key(&passphrase, &pattern)).await
}

#[tauri::command]
pub async fn list_vault(state: State<'_, AppState>) -> Result<VaultDto> { state.snapshot() }

#[tauri::command]
pub async fn create_section(state: State<'_, AppState>, name: String) -> Result<VaultDto> {
    blocking(&state, move |s| s.create_section(&name)).await
}

#[tauri::command]
pub async fn rename_section(state: State<'_, AppState>, id: String, name: String) -> Result<VaultDto> {
    blocking(&state, move |s| s.rename_section(&id, &name)).await
}

#[tauri::command]
pub async fn delete_section(state: State<'_, AppState>, id: String) -> Result<VaultDto> {
    blocking(&state, move |s| s.delete_section(&id)).await
}

#[tauri::command]
pub async fn import_files(state: State<'_, AppState>, section_id: String, paths: Vec<String>, on_progress: Channel<ImportProgress>) -> Result<ImportReport> {
    blocking(&state, move |s| s.import_files(&section_id, paths, &mut |p| { let _ = on_progress.send(p); })).await
}

/// Returns the decrypted bytes as a raw binary IPC response (no JSON encoding of large payloads).
#[tauri::command]
pub async fn read_file(state: State<'_, AppState>, file_id: String) -> Result<Response> {
    let bytes = blocking(&state, move |s| s.read_file(&file_id)).await?;
    Ok(Response::new(bytes))
}

#[tauri::command]
pub async fn export_file(state: State<'_, AppState>, file_id: String, dest_path: String) -> Result<()> {
    blocking(&state, move |s| s.export_file(&file_id, &dest_path)).await
}

#[tauri::command]
pub async fn delete_file(state: State<'_, AppState>, file_id: String) -> Result<VaultDto> {
    blocking(&state, move |s| s.delete_file(&file_id)).await
}

#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<SettingsDto> {
    Ok(SettingsDto { auto_lock_minutes: state.settings.auto_lock_minutes() })
}

#[tauri::command]
pub async fn set_auto_lock_minutes(state: State<'_, AppState>, minutes: u32) -> Result<SettingsDto> {
    state.settings.set_auto_lock_minutes(minutes)?;
    Ok(SettingsDto { auto_lock_minutes: minutes })
}

#[tauri::command]
pub async fn activate_license(state: State<'_, AppState>, key: String) -> Result<LicenseDto> { state.license.activate(&key).await }

#[tauri::command]
pub async fn refresh_license(state: State<'_, AppState>) -> Result<LicenseDto> { state.license.refresh().await }

#[tauri::command]
pub async fn manage_subscription_url(state: State<'_, AppState>) -> Result<String> { state.license.manage_url().await }

#[tauri::command]
pub async fn verify_credentials(state: State<'_, AppState>, passphrase: String, pattern: Vec<u8>) -> Result<()> {
    blocking(&state, move |s| s.verify_credentials(&passphrase, &pattern)).await
}

#[tauri::command]
pub async fn create_decoy(state: State<'_, AppState>, passphrase: String, pattern: Vec<u8>, decoy_passphrase: String, decoy_pattern: Vec<u8>) -> Result<VaultDto> {
    blocking(&state, move |s| s.create_decoy(&passphrase, &pattern, &decoy_passphrase, &decoy_pattern)).await
}

#[tauri::command]
pub async fn remove_decoy(state: State<'_, AppState>, passphrase: String, pattern: Vec<u8>) -> Result<VaultDto> {
    blocking(&state, move |s| s.remove_decoy(&passphrase, &pattern)).await
}

#[tauri::command]
pub async fn export_backup(state: State<'_, AppState>, dest_path: String, backup_passphrase: String, on_progress: Channel<ImportProgress>) -> Result<usize> {
    blocking(&state, move |s| s.export_backup(&dest_path, &backup_passphrase, &mut |p| { let _ = on_progress.send(p); })).await
}

#[tauri::command]
pub async fn restore_backup(state: State<'_, AppState>, src_path: String, backup_passphrase: String, on_progress: Channel<ImportProgress>) -> Result<ImportReport> {
    blocking(&state, move |s| s.restore_backup(&src_path, &backup_passphrase, &mut |p| { let _ = on_progress.send(p); })).await
}

#[tauri::command]
pub async fn unlock_section(state: State<'_, AppState>, id: String, passphrase: Option<String>, pattern: Option<Vec<u8>>) -> Result<VaultDto> {
    blocking(&state, move |s| s.unlock_section(&id, passphrase.as_deref(), pattern.as_deref())).await
}

#[tauri::command]
pub async fn relock_section(state: State<'_, AppState>, id: String) -> Result<VaultDto> {
    blocking(&state, move |s| s.relock_section(&id)).await
}

/// `setup` = the new lock (None removes the lock); `current` = the existing lock's credentials when one is set.
#[tauri::command]
pub async fn set_section_lock(state: State<'_, AppState>, id: String, setup: Option<LockInput>, current: Option<LockInput>) -> Result<VaultDto> {
    blocking(&state, move |s| s.set_section_lock(&id, setup, current)).await
}
