#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager};
use tauri_plugin_sql::{Builder as SqlBuilder};

fn main() {
    tauri::Builder::default()
        // SQL plugin — Tauri 2, plugin v2.0 API
        .plugin(SqlBuilder::default().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
