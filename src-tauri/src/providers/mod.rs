use crate::models;

/// Supported query modes.
#[derive(Debug, Clone, PartialEq)]
pub enum QueryMode {
    Sql,
    VectorSearch,
    YamlQuery,
}

impl QueryMode {
    pub fn as_str(&self) -> &'static str {
        match self {
            QueryMode::Sql => "SQL",
            QueryMode::VectorSearch => "vector_search",
            QueryMode::YamlQuery => "yaml_query",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "vector_search" | "vector" | "chroma" => QueryMode::VectorSearch,
            "yaml_query" | "yaml" | "palace" => QueryMode::YamlQuery,
            _ => QueryMode::Sql,
        }
    }
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
struct OllamaTagResponse {
    models: Vec<OllamaModelInfo>,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
struct OllamaModelInfo {
    name: String,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
struct OllamaGenerateRequest {
    model: String,
    prompt: String,
    stream: bool,
    options: OllamaOptions,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
struct OllamaOptions {
    temperature: f64,
    num_predict: i64,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
struct OllamaGenerateResponse {
    response: String,
    done: bool,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
struct ChatRequest {
    model: String,
    messages: Vec<ChatMessage>,
    temperature: f64,
    max_tokens: i64,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
struct ChatChoice {
    message: ChatMessage,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
struct ChatResponse {
    choices: Vec<ChatChoice>,
}

/// Client for Ollama API.
pub struct OllamaClient {
    base_url: String,
    model: String,
    client: reqwest::Client,
}

impl OllamaClient {
    pub fn new(base_url: &str, model: &str) -> Self {
        Self {
            base_url: base_url.trim_end_matches('/').to_string(),
            model: model.to_string(),
            client: reqwest::Client::new(),
        }
    }

    pub async fn check_health(&self) -> Result<models::ProviderHealth, String> {
        let url = format!("{}/api/tags", self.base_url);
        match self.client.get(&url).send().await {
            Ok(resp) if resp.status().is_success() => {
                match resp.json::<OllamaTagResponse>().await {
                    Ok(tag_resp) => {
                        let models_list: Vec<String> = tag_resp
                            .models
                            .iter()
                            .map(|m| m.name.clone())
                            .collect();
                        Ok(models::ProviderHealth {
                            provider_type: "ollama".to_string(),
                            reachable: true,
                            model_count: models_list.len(),
                            models: models_list,
                            error: None,
                        })
                    }
                    Err(e) => Ok(models::ProviderHealth {
                        provider_type: "ollama".to_string(),
                        reachable: true,
                        model_count: 0,
                        models: vec![],
                        error: Some(format!("Parse error: {}", e)),
                    }),
                }
            }
            Ok(resp) => Ok(models::ProviderHealth {
                provider_type: "ollama".to_string(),
                reachable: false,
                model_count: 0,
                models: vec![],
                error: Some(format!("HTTP {}", resp.status())),
            }),
            Err(e) => Ok(models::ProviderHealth {
                provider_type: "ollama".to_string(),
                reachable: false,
                model_count: 0,
                models: vec![],
                error: Some(format!("Connection failed: {}", e)),
            }),
        }
    }

    pub async fn generate(&self, prompt: &str) -> Result<String, String> {
        let url = format!("{}/api/generate", self.base_url);
        let body = OllamaGenerateRequest {
            model: self.model.clone(),
            prompt: prompt.to_string(),
            stream: false,
            options: OllamaOptions {
                temperature: 0.1,
                num_predict: 2048,
            },
        };

        let resp = self
            .client
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Ollama request failed: {}", e))?;

        if !resp.status().is_success() {
            return Err(format!("Ollama returned HTTP {}", resp.status()));
        }

        let gen_resp: OllamaGenerateResponse = resp
            .json()
            .await
            .map_err(|e| format!("Ollama parse error: {}", e))?;

        Ok(gen_resp.response)
    }
}

/// Client for OpenAI-compatible APIs.
pub struct OpenAIClient {
    base_url: String,
    model: String,
    api_key: String,
    client: reqwest::Client,
}

impl OpenAIClient {
    pub fn new(base_url: &str, model: &str, api_key: &str) -> Self {
        Self {
            base_url: base_url.trim_end_matches('/').to_string(),
            model: model.to_string(),
            api_key: api_key.to_string(),
            client: reqwest::Client::new(),
        }
    }

    pub async fn check_health(&self) -> Result<models::ProviderHealth, String> {
        let url = format!("{}/models", self.base_url);
        let resp = self
            .client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .send()
            .await;

        match resp {
            Ok(r) if r.status().is_success() => Ok(models::ProviderHealth {
                provider_type: "openai".to_string(),
                reachable: true,
                model_count: 0,
                models: vec![],
                error: None,
            }),
            Ok(r) => Ok(models::ProviderHealth {
                provider_type: "openai".to_string(),
                reachable: false,
                model_count: 0,
                models: vec![],
                error: Some(format!("HTTP {}", r.status())),
            }),
            Err(e) => Ok(models::ProviderHealth {
                provider_type: "openai".to_string(),
                reachable: false,
                model_count: 0,
                models: vec![],
                error: Some(format!("Connection failed: {}", e)),
            }),
        }
    }

    pub async fn generate(&self, prompt: &str) -> Result<String, String> {
        let url = format!("{}/chat/completions", self.base_url);
        let body = ChatRequest {
            model: self.model.clone(),
            messages: vec![
                ChatMessage {
                    role: "system".to_string(),
                    content: "You are a data query expert. Generate only the requested query. Be concise.".to_string(),
                },
                ChatMessage {
                    role: "user".to_string(),
                    content: prompt.to_string(),
                },
            ],
            temperature: 0.1,
            max_tokens: 2048,
        };

        let resp = self
            .client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("OpenAI request failed: {}", e))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(format!("OpenAI returned HTTP {}: {}", status, text));
        }

        let chat_resp: ChatResponse = resp
            .json()
            .await
            .map_err(|e| format!("OpenAI parse error: {}", e))?;

        Ok(chat_resp
            .choices
            .first()
            .map(|c| c.message.content.clone())
            .unwrap_or_default())
    }
}
