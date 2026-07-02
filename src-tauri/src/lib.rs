#[cfg(target_os = "macos")]
use window_vibrancy::{apply_vibrancy, clear_vibrancy, NSVisualEffectMaterial};

use tauri::{Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent};

const MAIN_LABEL: &str = "main";
const QUICK_NOTE_LABEL: &str = "quick-note";

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

/// Show the quick-note popup, focusing an existing instance instead of
/// spawning a duplicate. This is invoked from the global shortcut and from
/// the tray menu, so it works even while the main window is hidden.
fn show_quick_note_window(app: &tauri::AppHandle) {
    if let Some(win) = app.get_webview_window(QUICK_NOTE_LABEL) {
        let _ = win.center();
        let _ = win.show();
        let _ = win.set_focus();
        return;
    }

    let builder = WebviewWindowBuilder::new(
        app,
        QUICK_NOTE_LABEL,
        WebviewUrl::App("index.html?quicknote=1".into()),
    )
    .title("Quick Note")
    .inner_size(420.0, 320.0)
    .min_inner_size(300.0, 220.0)
    .resizable(true)
    .always_on_top(true)
    .center()
    .visible(true);

    #[cfg(target_os = "macos")]
    let builder = builder
        .title_bar_style(tauri::TitleBarStyle::Overlay)
        .hidden_title(true);

    match builder.build() {
        Ok(win) => {
            let _ = win.set_focus();
        }
        Err(e) => eprintln!("[inkwell] failed to create quick-note window: {e}"),
    }
}

/// Show and focus the main window (used by the tray "Open inkwell" item).
fn show_main_window(app: &tauri::AppHandle) {
    if let Some(win) = app.get_webview_window(MAIN_LABEL) {
        let _ = win.show();
        let _ = win.unminimize();
        let _ = win.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init());

    #[cfg(desktop)]
    {
        builder = builder.plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutState};

                    if event.state() != ShortcutState::Pressed {
                        return;
                    }

                    #[cfg(target_os = "macos")]
                    let modifier = Modifiers::SUPER;
                    #[cfg(not(target_os = "macos"))]
                    let modifier = Modifiers::CONTROL;

                    if shortcut == &Shortcut::new(Some(modifier), Code::KeyN) {
                        show_quick_note_window(app);
                    }
                })
                .build(),
        );
    }

    builder
        .invoke_handler(tauri::generate_handler![set_vibrancy])
        .setup(|app| {
            #[cfg(desktop)]
            {
                use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem};
                use tauri::tray::TrayIconBuilder;
                use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

                // Register Cmd+N (macOS) / Ctrl+N (Windows/Linux) globally so
                // quick-note capture works even while inkwell is hidden.
                #[cfg(target_os = "macos")]
                let modifier = Modifiers::SUPER;
                #[cfg(not(target_os = "macos"))]
                let modifier = Modifiers::CONTROL;
                if let Err(e) = app
                    .global_shortcut()
                    .register(Shortcut::new(Some(modifier), Code::KeyN))
                {
                    eprintln!("[inkwell] failed to register global shortcut: {e}");
                }

                // Menu bar tray icon — keeps inkwell reachable (and the
                // shortcut alive) once the main window has been hidden.
                let open_item = MenuItemBuilder::with_id("open", "Open inkwell").build(app)?;
                let new_note_item = MenuItemBuilder::with_id("new-note", "New Quick Note")
                    .accelerator("CmdOrCtrl+N")
                    .build(app)?;
                let separator = PredefinedMenuItem::separator(app)?;
                let quit_item = MenuItemBuilder::with_id("quit", "Quit inkwell").build(app)?;

                let tray_menu = MenuBuilder::new(app)
                    .items(&[&open_item, &new_note_item, &separator, &quit_item])
                    .build()?;

                TrayIconBuilder::new()
                    .icon(app.default_window_icon().unwrap().clone())
                    .menu(&tray_menu)
                    .tooltip("inkwell")
                    .on_menu_event(move |app, event| match event.id.as_ref() {
                        "open" => show_main_window(app),
                        "new-note" => show_quick_note_window(app),
                        "quit" => app.exit(0),
                        _ => {}
                    })
                    .build(app)?;
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            // Closing the main window hides it instead of quitting the app,
            // so the tray icon and global shortcut keep working. Cmd+Q / the
            // tray "Quit" item still fully exit via app.exit().
            if window.label() == MAIN_LABEL {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    let _ = window.hide();
                    api.prevent_close();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
