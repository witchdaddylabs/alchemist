use regex::Regex;
use std::collections::HashMap;

use crate::models::{MemPalaceStructure, TableSchema};

/// Build a prompt for LLM query generation based on the data source type.
pub fn build_sql_prompt(
    question: &str,
    schema_context: &[TableSchema],
    max_tables: usize,
) -> String {
    let schema_preview = format_schema_context(schema_context, max_tables);

    format!(
        r#"You are an SQLite expert. Given the following database schema, write a **read-only SELECT query** that answers the user's question.

Rules:
1. RETURN ONLY the SQL query — no explanations, no markdown formatting, no extra text.
2. USE single SELECT statements only (no UNION, no subqueries unless necessary).
3. ALWAYS add LIMIT 100 at the end.
4. NEVER use PRAGMA, ATTACH, DETACH, REINDEX, SAVEPOINT, RELEASE, INSERT, UPDATE, DELETE, DROP, CREATE, ALTER.
5. Use table names exactly as shown (they may be quoted).
6. Use column names exactly as shown.

Schema:
{}

User question: {}
SQL: "#,
        schema_preview, question
    )
}

/// Build a prompt for ChromaDB vector/text search.
pub fn build_vector_search_prompt(
    question: &str,
    collection_context: &str,
    available_keys: &[String],
) -> String {
    let keys_str = if available_keys.is_empty() {
        "wing, room, hall, entities, source_file, added_by".to_string()
    } else {
        available_keys.join(", ")
    };

    format!(
        r#"You are a semantic search expert. Given the user's question, generate search terms and metadata filters to find relevant documents in a ChromaDB vector database.

Available metadata keys: {}
Collection context: {}

Return your response in this format:
SEARCH_TERMS: <comma-separated list of key search terms>
FILTERS: <key=value pairs, one per line, or "none" if no filters apply>

User question: {}
"#,
        keys_str, collection_context, question
    )
}

/// Build a prompt for MemPalace YAML structure queries.
pub fn build_yaml_query_prompt(
    question: &str,
    palace_context: &MemPalaceStructure,
) -> String {
    let wings_preview: Vec<String> = palace_context
        .wings
        .iter()
        .map(|w| {
            let rooms: Vec<String> = w
                .rooms
                .iter()
                .map(|r| {
                    let keywords = r.keywords.join(", ");
                    let entities = r.entities.join(", ");
                    let drawer_count = r.drawer_count.unwrap_or(r.drawers.len());
                    format!(
                        "    - {} (keywords: {}, entities: {}, drawers: {})",
                        r.name, keywords, entities, drawer_count
                    )
                })
                .collect();
            format!(
                "  {} (path: {:?}, rooms: {})",
                w.name,
                w.path,
                rooms.join("\n")
            )
        })
        .collect();

    let palace_str = wings_preview.join("\n");

    format!(
        r#"You are a MemPalace structure expert. Given the palace hierarchy below, answer the user's question about its structure.

Palace structure:
{}

Answer concisely based on the structure above. If the answer requires navigating specific wings/rooms/drawers, list the path.

User question: {}
"#,
        palace_str, question
    )
}

/// Parse SQL from an LLM response — extracts ```sql blocks or plain text.
pub fn parse_sql_from_response(response: &str) -> Option<String> {
    // Try ```sql ... ``` block first
    let sql_block_re = Regex::new(r"(?s)```sql\s*\n?(.*?)```").ok()?;
    if let Some(caps) = sql_block_re.captures(response) {
        let sql = caps.get(1).unwrap().as_str().trim().to_string();
        if !sql.is_empty() {
            return Some(sql);
        }
    }

    // Try any ``` ... ``` block
    let code_block_re = Regex::new(r"(?s)```\s*\n?(.*?)```").ok()?;
    if let Some(caps) = code_block_re.captures(response) {
        let sql = caps.get(1).unwrap().as_str().trim().to_string();
        if !sql.is_empty() {
            return Some(sql);
        }
    }

    // Fallback: return the entire response, trimmed
    let trimmed = response.trim();
    if !trimmed.is_empty() {
        Some(trimmed.to_string())
    } else {
        None
    }
}

/// Parse search terms from a vector search response.
pub fn parse_search_terms(response: &str) -> Vec<String> {
    let terms_re = Regex::new(r"(?i)SEARCH_TERMS:\s*(.+)").ok();
    if let Some(re) = terms_re {
        if let Some(caps) = re.captures(response) {
            let terms_str = caps.get(1).unwrap().as_str();
            return terms_str
                .split(',')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect();
        }
    }

    // Fallback: use whole response as one search term
    vec![response.trim().to_string()]
}

/// Parse metadata filters from a vector search response.
pub fn parse_filters(response: &str) -> HashMap<String, String> {
    let mut filters = HashMap::new();
    let filters_re = Regex::new(r"(?i)FILTERS:\s*(.+?)(?:\nSEARCH_TERMS|\Z)").ok();
    if let Some(re) = &filters_re {
        if let Some(caps) = re.captures(response) {
            let filters_str = caps.get(1).unwrap().as_str();
            for line in filters_str.lines() {
                let line = line.trim();
                if line.eq_ignore_ascii_case("none") || line.is_empty() {
                    continue;
                }
                if let Some(eq_pos) = line.find('=') {
                    let key = line[..eq_pos].trim().to_string();
                    let value = line[eq_pos + 1..].trim().to_string();
                    filters.insert(key, value);
                }
            }
        }
    }
    filters
}

/// Detect the best query mode from a user question.
pub fn detect_mode(question: &str) -> &'static str {
    let lower = question.to_lowercase();
    if lower.contains("wing") || lower.contains("room") || lower.contains("drawer")
        || lower.contains("palace") || lower.contains("structure")
        || lower.contains("hierarchy") || lower.contains("mempalace")
    {
        "yaml_query"
    } else if lower.contains("search") || lower.contains("find") || lower.contains("similar")
        || lower.contains("relevant") || lower.contains("semantic")
        || lower.contains("about ")
    {
        "vector_search"
    } else {
        "sql"
    }
}

// ── Internal helpers ──

fn format_schema_context(tables: &[TableSchema], max: usize) -> String {
    tables
        .iter()
        .take(max)
        .map(|t| {
            let cols_str: String = t
                .columns
                .iter()
                .map(|c| {
                    let pk = if c.is_primary_key { " PK" } else { "" };
                    let fk = c
                        .foreign_key_target
                        .as_ref()
                        .map(|t| format!(" FK→{}", t))
                        .unwrap_or_default();
                    let nullable = if c.nullable { "" } else { " NOT NULL" };
                    format!(
                        "    {c_name}: {c_type}{pk}{fk}{nullable}",
                        c_name = c.name,
                        c_type = c.declared_type
                    )
                })
                .collect::<Vec<_>>()
                .join("\n");

            let row_hint = t
                .row_count
                .map(|c| format!(" ({c} rows)"))
                .unwrap_or_default();
            format!("TABLE {name}{row_hint}:\n{cols_str}", name = t.name)
        })
        .collect::<Vec<_>>()
        .join("\n\n")
}
