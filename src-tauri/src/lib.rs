pub mod errors;
pub mod models;
pub mod db;
pub mod validate;
pub mod chroma;
pub mod palace;
pub mod llm;
pub mod providers;
pub mod secret_store;
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
            app::discover_palace,
            app::list_collections,
            app::search_documents,
            app::get_palace_info,
            app::parse_mempalace,
            app::check_ollama,
            app::generate_query,
            app::get_provider_config,
            app::store_api_key,
            app::check_api_key,
            app::delete_api_key,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
