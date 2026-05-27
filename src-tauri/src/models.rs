use serde::{Deserialize, Serialize};

/// Summary of a SQLite vault the user has opened.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultSummary {
    pub path: String,
    pub file_name: String,
    pub table_count: usize,
    pub size_bytes: u64,
    pub opened_at: String,
}

/// Schema of a single table.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TableSchema {
    pub name: String,
    pub columns: Vec<ColumnSchema>,
    pub row_count: Option<i64>,
}

/// Schema of a single column.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ColumnSchema {
    pub name: String,
    pub declared_type: String,
    pub nullable: bool,
    pub is_primary_key: bool,
    pub default_value: Option<String>,
    pub foreign_key_target: Option<String>,
}

/// A SQL safety check result.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SafetyCheck {
    pub code: String,
    pub label: String,
    pub passed: bool,
    pub detail: String,
}

/// A validated query ready for execution.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidatedQuery {
    pub original_sql: String,
    pub final_sql: String,
    pub checks: Vec<SafetyCheck>,
    pub was_amended: bool,
    pub amendment_note: Option<String>,
}

/// Query execution results.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<serde_json::Value>>,
    pub row_count: usize,
    pub truncated: bool,
    pub elapsed_ms: u64,
}

/// A saved spell (reusable query).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Spell {
    pub id: String,
    pub name: String,
    pub question: String,
    pub sql: String,
    pub description: Option<String>,
    pub tags: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
    pub run_count: u64,
}
