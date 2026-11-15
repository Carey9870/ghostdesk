// path: apps/desktop/src-tauri/build.rs
// purpose: Tauri build script; re-runs when the compile-time license settings change.
fn main() {
    println!("cargo:rerun-if-env-changed=GHOSTDESK_LICENSE_PUBLIC_KEY");
    println!("cargo:rerun-if-env-changed=GHOSTDESK_API_BASE");
    tauri_build::build()
}
