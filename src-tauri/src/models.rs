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

// ── ChromaDB / Palace types ──

/// Result of discovering a ChromaDB persistence directory.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PalaceDiscovery {
    pub path: String,
    pub file_name: String,
    pub parent_directory: String,
    pub size_bytes: u64,
    pub collection_count: usize,
    pub total_documents: usize,
    pub segment_count: usize,
}

/// Detailed info about a ChromaDB collection.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollectionInfo {
    pub id: String,
    pub name: String,
    pub dimension: Option<usize>,
    pub document_count: usize,
    pub config_json: String,
}

/// A single document hit from a search.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub embedding_id: usize,
    pub segment_id: String,
    pub document_text: String,
    pub metadata: std::collections::HashMap<String, String>,
    pub relevance_hint: String,
    pub score: Option<f64>,
    pub created_at: String,
}

/// Combined palace info (discovery + collections).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PalaceInfo {
    pub discovery: PalaceDiscovery,
    pub collections: Vec<CollectionInfo>,
}

// ── MemPalace YAML types ──

/// Full parsed MemPalace structure.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemPalaceStructure {
    pub wings: Vec<WingStructure>,
    pub total_wings: usize,
    pub total_rooms: usize,
    pub total_drawers: usize,
    pub source_file: String,
}

/// A single wing in the palace.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WingStructure {
    pub name: String,
    pub path: Option<String>,
    pub rooms: Vec<RoomStructure>,
    pub room_count: Option<usize>,
}

/// A single room within a wing.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RoomStructure {
    pub name: String,
    pub keywords: Vec<String>,
    pub entities: Vec<String>,
    pub drawers: Vec<DrawerStructure>,
    pub drawer_count: Option<usize>,
}

/// A single drawer within a room.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DrawerStructure {
    pub name: String,
    pub keywords: Vec<String>,
    pub descriptions: Vec<String>,
    pub entities: Vec<String>,
    pub drawer_count: Option<usize>,
}
