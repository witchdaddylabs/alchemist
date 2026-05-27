use sqlparser::dialect::GenericDialect;
use sqlparser::parser::Parser;
use sqlparser::ast::Statement;

use crate::errors::AppError;
use crate::models::{SafetyCheck, ValidatedQuery};

const MAX_ROWS: u64 = 1000;

/// Validate a SQL query for safety. Returns a ValidatedQuery with detailed check results.
pub fn validate_sql(sql: &str) -> Result<ValidatedQuery, AppError> {
    let mut checks = Vec::new();
    let mut final_sql = sql.trim().to_string();
    let mut was_amended = false;
    let mut amendment_note: Option<String> = None;

    // Check 1: Not empty
    if sql.trim().is_empty() {
        return Err(AppError::Validation("SQL query is empty".to_string()));
    }

    // Check 2: Single statement
    let dialect = GenericDialect;
    let statements = Parser::parse_sql(&dialect, sql)
        .map_err(|e| AppError::Validation(format!("SQL parse error: {}", e)))?;

    let single_statement = statements.len() == 1;
    checks.push(SafetyCheck {
        code: "single_statement".to_string(),
        label: "Single SQL statement".to_string(),
        passed: single_statement,
        detail: if single_statement {
            format!("Exactly 1 statement detected.")
        } else {
            format!("{} statements detected — only single statements allowed.", statements.len())
        },
    });

    if !single_statement {
        return Ok(ValidatedQuery {
            original_sql: sql.to_string(),
            final_sql,
            checks,
            was_amended: false,
            amendment_note: None,
        });
    }

    let stmt = &statements[0];

    // Check 3: SELECT-only
    let is_select = matches!(stmt, Statement::Query { .. });
    checks.push(SafetyCheck {
        code: "select_only".to_string(),
        label: "SELECT-only query".to_string(),
        passed: is_select,
        detail: if is_select {
            "Query is a SELECT or WITH statement.".to_string()
        } else {
            "Only SELECT and WITH queries are allowed. Write operations are blocked.".to_string()
        },
    });

    if !is_select {
        return Ok(ValidatedQuery {
            original_sql: sql.to_string(),
            final_sql,
            checks,
            was_amended: false,
            amendment_note: None,
        });
    }

    // Check 4: Dangerous keywords
    let upper = sql.to_uppercase();
    let dangerous_keywords = ["PRAGMA", "ATTACH", "DETACH", "REINDEX", "SAVEPOINT", "RELEASE"];
    let mut found_dangerous = Vec::new();

    for kw in &dangerous_keywords {
        // Simple check — not comprehensive, but catches common cases
        if upper.contains(kw) {
            found_dangerous.push(*kw);
        }
    }

    let has_dangerous = !found_dangerous.is_empty();
    checks.push(SafetyCheck {
        code: "dangerous_keywords".to_string(),
        label: "No dangerous keywords detected".to_string(),
        passed: !has_dangerous,
        detail: if has_dangerous {
            format!("Blocked keywords found: {}", found_dangerous.join(", "))
        } else {
            "No blocked keywords present.".to_string()
        },
    });

    if has_dangerous {
        return Ok(ValidatedQuery {
            original_sql: sql.to_string(),
            final_sql,
            checks,
            was_amended: false,
            amendment_note: None,
        });
    }

    // Check 5: LIMIT clause
    let has_limit = upper.contains("LIMIT");
    if !has_limit {
        was_amended = true;
        // Remove trailing semicolons before appending
        while final_sql.ends_with(';') {
            final_sql.pop();
        }
        final_sql.push_str(&format!(" LIMIT {}", MAX_ROWS));
        amendment_note = Some(format!(
            "No LIMIT clause found. Added LIMIT {} automatically.",
            MAX_ROWS
        ));
    }

    checks.push(SafetyCheck {
        code: "limit".to_string(),
        label: "LIMIT clause present".to_string(),
        passed: has_limit || was_amended,
        detail: if has_limit {
            "Query already has a LIMIT clause.".to_string()
        } else {
            format!("LIMIT {} was added automatically.", MAX_ROWS)
        },
    });

    Ok(ValidatedQuery {
        original_sql: sql.to_string(),
        final_sql,
        checks,
        was_amended,
        amendment_note,
    })
}
