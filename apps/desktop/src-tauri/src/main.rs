// path: apps/desktop/src-tauri/src/main.rs
// purpose: Binary entry point; hides the console window on Windows release builds and starts the app.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    ghostdesk_lib::run()
}
