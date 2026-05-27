use rusqlite::{Connection, OpenFlags};
use std::path::Path;

use crate::errors::AppError;
use crate::models::{ColumnSchema, QueryResult, TableSchema, VaultSummary};

/// Open a SQLite file in read-only mode and return its summary.
pub fn open_vault(path: &str) -> Result<VaultSummary, AppError> {
    let db_path = Path::new(path);
    if !db_path.exists() {
        return Err(AppError::NotFound(format!("File not found: {}", path)));
    }

    let conn = Connection::open_with_flags(
        path,
        OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_URI,
    )?;

    let file_name = db_path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "unknown".to_string());

    let size_bytes = std::fs::metadata(db_path)?.len();
    let table_count = count_tables(&conn)?;
    let opened_at = chrono::Utc::now().to_rfc3339();

    Ok(VaultSummary {
        path: path.to_string(),
        file_name,
        table_count,
        size_bytes,
        opened_at,
    })
}

/// Get the schema for all tables in the database.
pub fn get_schema(path: &str) -> Result<Vec<TableSchema>, AppError> {
    let conn = open_connection(path)?;
    let mut schemas = Vec::new();

    let mut stmt = conn.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )?;
    let table_names: Vec<String> = stmt
        .query_map([], |row| row.get(0))?
        .filter_map(|r| r.ok())
        .collect();

    for name in &table_names {
        let columns = get_columns_for_table(&conn, name)?;
        let row_count: i64 = conn
            .query_row(&format!("SELECT COUNT(*) FROM \"{}\"", name), [], |row| {
                row.get(0)
            })
            .unwrap_or(0);

        schemas.push(TableSchema {
            name: name.clone(),
            columns,
            row_count: Some(row_count),
        });
    }

    Ok(schemas)
}

/// Execute a SELECT query and return the results.
pub fn run_query(path: &str, sql: &str) -> Result<QueryResult, AppError> {
    let conn = open_connection(path)?;
    let start = std::time::Instant::now();

    let mut stmt = conn.prepare(sql)?;
    let col_count = stmt.column_count();
    let columns: Vec<String> = (0..col_count)
        .map(|i| stmt.column_name(i).unwrap_or("?").to_string())
        .collect();

    let mut rows = Vec::new();
    let max_rows = 1000;
    let mut truncated = false;

    let row_iter = stmt.query_map([], |row| {
        let mut values = Vec::new();
        for i in 0..col_count {
            let val: rusqlite::types::Value = row.get_unwrap(i);
            values.push(match val {
                rusqlite::types::Value::Null => serde_json::Value::Null,
                rusqlite::types::Value::Integer(i) => serde_json::Value::Number(i.into()),
                rusqlite::types::Value::Real(f) => {
                    serde_json::Number::from_f64(f)
                        .map(serde_json::Value::Number)
                        .unwrap_or(serde_json::Value::Null)
                }
                rusqlite::types::Value::Text(t) => serde_json::Value::String(t),
                rusqlite::types::Value::Blob(_) => serde_json::Value::String("[BLOB]".to_string()),
            });
        }
        Ok(values)
    })?;

    for row in row_iter {
        if rows.len() >= max_rows {
            truncated = true;
            break;
        }
        rows.push(row?);
    }

    let elapsed_ms = start.elapsed().as_millis() as u64;
    let row_count = rows.len();

    Ok(QueryResult {
        columns,
        rows,
        row_count,
        truncated,
        elapsed_ms,
    })
}

// ---- Internal helpers ----

fn open_connection(path: &str) -> Result<Connection, AppError> {
    Ok(Connection::open_with_flags(
        path,
        OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_URI,
    )?)
}

fn count_tables(conn: &Connection) -> Result<usize, AppError> {
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
        [],
        |row| row.get(0),
    )?;
    Ok(count as usize)
}

fn get_columns_for_table(conn: &Connection, table: &str) -> Result<Vec<ColumnSchema>, AppError> {
    let sql = format!("PRAGMA table_info(\"{}\")", table);
    let mut stmt = conn.prepare(&sql)?;

    let mut columns = Vec::new();
    let rows = stmt.query_map([], |row| {
        Ok(ColumnSchema {
            name: row.get(1)?,
            declared_type: row.get::<_, String>(2).unwrap_or_default(),
            nullable: row.get::<_, bool>(3)?,
            is_primary_key: row.get::<_, bool>(5)?,
            default_value: row.get(4).ok(),
            foreign_key_target: None,
        })
    })?;

    for row in rows {
        columns.push(row?);
    }

    // Get foreign keys
    let fk_sql = format!("PRAGMA foreign_key_list(\"{}\")", table);
    if let Ok(mut fk_stmt) = conn.prepare(&fk_sql) {
        if let Ok(fk_rows) = fk_stmt.query_map([], |row| {
            Ok((
                row.get::<_, String>(3).unwrap_or_default(),    // from column
                format!(
                    "{}.{}",
                    row.get::<_, String>(2).unwrap_or_default(), // table
                    row.get::<_, String>(4).unwrap_or_default()  // to column
                ),
            ))
        }) {
            for fk in fk_rows.flatten() {
                if let Some(col) = columns.iter_mut().find(|c| c.name == fk.0) {
                    col.foreign_key_target = Some(fk.1.clone());
                }
            }
        }
    }

    Ok(columns)
}
