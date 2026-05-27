pub mod errors;
pub mod models;
pub mod db;
pub mod validate;
pub mod commands;

use commands::app;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            app::app_ping,
            app::open_vault,
            app::get_schema,
            app::run_query,
            app::validate_sql,
            app::validate_and_run,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
