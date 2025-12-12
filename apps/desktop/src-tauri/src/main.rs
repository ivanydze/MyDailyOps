#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use tauri_plugin_sql::{Builder as SqlBuilder};
use commands::{check_for_updates, install_update, get_app_version};

fn main() {
    tauri::Builder::default()
        // SQL plugin — Tauri 2, plugin v2.0 API
        .plugin(SqlBuilder::default().build())
        // Shell plugin — Tauri 2, plugin v2.0 API
        .plugin(tauri_plugin_shell::init())
        // Updater plugin — Tauri 2, plugin v2.0 API
        .plugin(tauri_plugin_updater::Builder::new().build())
        // Custom commands for updates
        .invoke_handler(tauri::generate_handler![
            check_for_updates,
            install_update,
            get_app_version
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
