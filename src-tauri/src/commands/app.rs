use crate::chroma;
use crate::db;
use crate::models::{
    CollectionInfo, MemPalaceStructure, PalaceDiscovery, PalaceInfo, QueryResult,
    SearchResult, TableSchema, VaultSummary, ValidatedQuery,
};
use crate::palace;
use crate::validate;

#[tauri::command]
pub fn open_vault(path: String) -> Result<VaultSummary, String> {
    db::open_vault(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_schema(path: String) -> Result<Vec<TableSchema>, String> {
    db::get_schema(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn run_query(path: String, sql: String) -> Result<QueryResult, String> {
    db::run_query(&path, &sql).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn validate_sql(sql: String) -> Result<ValidatedQuery, String> {
    validate::validate_sql(&sql).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn validate_and_run(path: String, sql: String) -> Result<QueryResult, String> {
    let validated = validate::validate_sql(&sql).map_err(|e| e.to_string())?;
    let critical_failed: Vec<_> = validated
        .checks
        .iter()
        .filter(|c| !c.passed && c.code != "limit")
        .collect();

    if !critical_failed.is_empty() {
        let reasons: Vec<String> = critical_failed
            .iter()
            .map(|c| format!("{}: {}", c.label, c.detail))
            .collect();
        return Err(format!(
            "Query blocked by safety checks:\n{}",
            reasons.join("\n")
        ));
    }

    db::run_query(&path, &validated.final_sql).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn app_ping() -> String {
    "Alchemist backend awake".to_string()
}

// ── ChromaDB / Palace commands ──

#[tauri::command]
pub fn discover_palace(path: String) -> Result<PalaceDiscovery, String> {
    chroma::discover_palace(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_collections(palace_path: String) -> Result<Vec<CollectionInfo>, String> {
    chroma::list_collections(&palace_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn search_documents(
    palace_path: String,
    query: String,
    collection_name: Option<String>,
    limit: Option<usize>,
) -> Result<Vec<SearchResult>, String> {
    let max_results = limit.unwrap_or(20);
    chroma::search_documents(
        &palace_path,
        &query,
        collection_name.as_deref(),
        max_results,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_palace_info(palace_path: String) -> Result<PalaceInfo, String> {
    chroma::get_palace_info(&palace_path).map_err(|e| e.to_string())
}

// ── MemPalace commands ──

#[tauri::command]
pub fn parse_mempalace(path: Option<String>) -> Result<MemPalaceStructure, String> {
    palace::discover_and_parse(path.as_deref()).map_err(|e| e.to_string())
}
