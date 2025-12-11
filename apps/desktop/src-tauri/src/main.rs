#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_plugin_sql::{Builder as SqlBuilder};

fn main() {
    tauri::Builder::default()
        // SQL plugin — Tauri 2, plugin v2.0 API
        .plugin(SqlBuilder::default().build())
        // Shell plugin — Tauri 2, plugin v2.0 API
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
