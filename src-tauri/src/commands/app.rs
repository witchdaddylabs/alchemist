use crate::chroma;
use crate::db;
use crate::llm;
use crate::models::{
    CollectionInfo, GeneratedQuery, MemPalaceStructure, PalaceDiscovery, PalaceInfo,
    ProviderConfig, ProviderHealth, QueryResult, SearchResult, TableSchema, VaultSummary,
    ValidatedQuery,
};
use crate::palace;
use crate::providers::{OllamaClient, OpenAIClient};
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

// ── LLM / Provider commands ──

#[tauri::command]
pub async fn check_ollama() -> Result<ProviderHealth, String> {
    let client = OllamaClient::new("http://localhost:11434", "llama3.2");
    client.check_health().await
}

#[tauri::command]
pub async fn generate_query(
    question: String,
    schema_json: Option<String>,
    palace_json: Option<String>,
    provider_type: Option<String>,
    provider_url: Option<String>,
    provider_model: Option<String>,
) -> Result<GeneratedQuery, String> {
    let start = std::time::Instant::now();
    let mode = llm::detect_mode(&question);
    let provider = provider_type.clone().unwrap_or_else(|| "ollama".to_string());
    let url = provider_url.unwrap_or_else(|| "http://localhost:11434".to_string());
    let model = provider_model.unwrap_or_else(|| "llama3.2".to_string());

    let prompt = match mode {
        "yaml_query" => {
            // Parse palace context from JSON
            if let Some(json) = palace_json {
                if let Ok(palace) = serde_json::from_str::<MemPalaceStructure>(&json) {
                    llm::build_yaml_query_prompt(&question, &palace)
                } else {
                    format!("Describe the structure of this MemPalace: {}", question)
                }
            } else {
                format!("Describe the structure of this MemPalace: {}", question)
            }
        }
        "vector_search" => {
            let mut available_keys = vec![
                "wing".to_string(),
                "room".to_string(),
                "hall".to_string(),
                "entities".to_string(),
                "source_file".to_string(),
                "added_by".to_string(),
            ];
            // Extract available metadata from palace context if provided
            if let Some(json) = &palace_json {
                if let Ok(palace) = serde_json::from_str::<MemPalaceStructure>(json) {
                    let mut extra_keys: Vec<String> = palace
                        .wings
                        .iter()
                        .flat_map(|w| w.rooms.iter())
                        .flat_map(|r| r.keywords.clone())
                        .collect();
                    extra_keys.sort();
                    extra_keys.dedup();
                    available_keys.extend(extra_keys);
                }
            }
            llm::build_vector_search_prompt(&question, "", &available_keys)
        }
        _ => {
            // SQL mode
            if let Some(json) = schema_json {
                if let Ok(tables) = serde_json::from_str::<Vec<TableSchema>>(&json) {
                    llm::build_sql_prompt(&question, &tables, 20)
                } else {
                    format!(
                        "Write a read-only SQLite SELECT query for: {}",
                        question
                    )
                }
            } else {
                format!("Write a read-only SQLite SELECT query for: {}", question)
            }
        }
    };

    let raw_response = match provider.as_str() {
        "openai" => {
            // Check if we have a stored key
            let api_key = crate::secret_store::get_key("openai_api_key")
                .map_err(|_| "OpenAI API key not found. Please add one in Settings.".to_string())?;
            let client = OpenAIClient::new(&url, &model, &api_key);
            client.generate(&prompt).await?
        }
        _ => {
            let client = OllamaClient::new(&url, &model);
            client.generate(&prompt).await?
        }
    };

    let elapsed_ms = start.elapsed().as_millis() as u64;

    // Parse response based on mode
    let (sql, search_terms) = match mode {
        "yaml_query" => {
            // YAML mode returns the raw description
            (Some(raw_response.clone()), None)
        }
        "vector_search" => {
            let terms = llm::parse_search_terms(&raw_response);
            (None, Some(terms))
        }
        _ => {
            let parsed = llm::parse_sql_from_response(&raw_response);
            (parsed, None)
        }
    };

    Ok(GeneratedQuery {
        question,
        sql,
        search_terms,
        mode: mode.to_string(),
        raw_response,
        provider: provider_type.unwrap_or_else(|| "ollama".to_string()),
        model,
        elapsed_ms,
    })
}

#[tauri::command]
pub fn get_provider_config() -> ProviderConfig {
    let has_key = crate::secret_store::has_key("openai_api_key");
    ProviderConfig {
        provider_type: "ollama".to_string(),
        ollama_url: "http://localhost:11434".to_string(),
        ollama_model: "llama3.2:latest".to_string(),
        openai_url: "https://api.openai.com/v1".to_string(),
        openai_model: "gpt-4o-mini".to_string(),
        has_openai_key: has_key,
    }
}

#[tauri::command]
pub fn store_api_key(account: String, key: String) -> Result<(), String> {
    crate::secret_store::store_key(&account, &key)
}

#[tauri::command]
pub fn check_api_key(account: String) -> Result<bool, String> {
    Ok(crate::secret_store::has_key(&account))
}

#[tauri::command]
pub fn delete_api_key(account: String) -> Result<(), String> {
    crate::secret_store::delete_key(&account)
}
