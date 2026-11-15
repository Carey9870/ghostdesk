// path: apps/desktop/src-tauri/src/lib.rs
// purpose: Application bootstrap: plugins, shared state, the global panic-lock shortcut and the command registry.
mod commands;
mod crypto;
mod dto;
mod error;
mod fsutil;
mod license;
mod lockout;
mod policy;
mod settings;
mod state;
mod vault;

use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

fn panic_shortcut() -> Shortcut {
    Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyL)
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if *shortcut == panic_shortcut() && event.state() == ShortcutState::Pressed {
                        if let Some(state) = app.try_state::<state::AppState>() {
                            state.lock_session();
                        }
                        let _ = app.emit("vault://locked", "panic");
                    }
                })
                .build(),
        )
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&dir)?;
            app.manage(state::AppState::new(dir));
            if let Err(e) = app.global_shortcut().register(panic_shortcut()) {
                // Another program owns the shortcut; the in-app shortcut and button still work.
                eprintln!("panic shortcut unavailable: {e}");
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::app_status,
            commands::create_vault,
            commands::unlock,
            commands::lock,
            commands::check_recovery_key,
            commands::recover,
            commands::renew_recovery_key,
            commands::verify_credentials,
            commands::create_decoy,
            commands::remove_decoy,
            commands::export_backup,
            commands::restore_backup,
            commands::unlock_section,
            commands::relock_section,
            commands::set_section_lock,
            commands::list_vault,
            commands::create_section,
            commands::rename_section,
            commands::delete_section,
            commands::import_files,
            commands::read_file,
            commands::export_file,
            commands::delete_file,
            commands::get_settings,
            commands::set_auto_lock_minutes,
            commands::activate_license,
            commands::refresh_license,
            commands::manage_subscription_url,
        ])
        .run(tauri::generate_context!())
        .expect("error while running GhostDesk");
}
