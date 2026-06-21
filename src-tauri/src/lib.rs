#[cfg(target_os = "macos")]
use window_vibrancy::{apply_vibrancy, clear_vibrancy, NSVisualEffectMaterial};

/// Toggle macOS NSVisualEffectView (native sidebar glass) on the main window.
/// No-op on non-macOS platforms.
#[tauri::command]
fn set_vibrancy(window: tauri::WebviewWindow, enabled: bool) {
    #[cfg(target_os = "macos")]
    {
        if enabled {
            if let Err(e) = apply_vibrancy(&window, NSVisualEffectMaterial::Sidebar, None, None) {
                eprintln!("[inkwell] apply_vibrancy failed: {e}");
            } else {
                eprintln!("[inkwell] apply_vibrancy OK");
            }
        } else {
            match clear_vibrancy(&window) {
                Ok(cleared) => eprintln!("[inkwell] clear_vibrancy OK (cleared={cleared})"),
                Err(e) => eprintln!("[inkwell] clear_vibrancy failed: {e}"),
            }
        }
    }
    // Suppress unused variable warning on non-macOS
    #[cfg(not(target_os = "macos"))]
    let _ = (window, enabled);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![set_vibrancy])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
