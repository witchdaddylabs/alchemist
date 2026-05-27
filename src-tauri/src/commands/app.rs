use crate::db;
use crate::models::{QueryResult, TableSchema, VaultSummary, ValidatedQuery};
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
    // Validate first
    let validated = validate::validate_sql(&sql).map_err(|e| e.to_string())?;

    // Check all critical checks passed
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

    // Run the validated (and possibly amended) SQL
    db::run_query(&path, &validated.final_sql).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn app_ping() -> String {
    "Alchemist backend awake".to_string()
}
