use crate::models;

/// Client for Google AI Studio (Gemini) API.
pub struct GeminiClient {
    base_url: String,
    model: String,
    api_key: String,
    client: reqwest::Client,
}

#[derive(Debug, serde::Serialize)]
struct GeminiContent {
    contents: Vec<GeminiContentPart>,
    generation_config: GeminiConfig,
}

#[derive(Debug, serde::Serialize)]
struct GeminiContentPart {
    role: String,
    parts: Vec<GeminiTextPart>,
}

#[derive(Debug, serde::Serialize)]
struct GeminiTextPart {
    text: String,
}

#[derive(Debug, serde::Serialize)]
struct GeminiConfig {
    temperature: f64,
    max_output_tokens: i64,
}

#[derive(Debug, serde::Deserialize)]
struct GeminiGenerateResponse {
    candidates: Option<Vec<GeminiCandidate>>,
}

#[derive(Debug, serde::Deserialize)]
struct GeminiCandidate {
    content: Option<GeminiPartContent>,
}

#[derive(Debug, serde::Deserialize)]
struct GeminiPartContent {
    parts: Vec<GeminiTextPartResponse>,
}

#[derive(Debug, serde::Deserialize)]
struct GeminiTextPartResponse {
    text: String,
}

#[derive(Debug, serde::Deserialize)]
struct GeminiModelsResponse {
    models: Vec<GeminiModelEntry>,
}

#[derive(Debug, serde::Deserialize)]
struct GeminiModelEntry {
    name: String,
    #[allow(dead_code)]
    display_name: Option<String>,
    #[allow(dead_code)]
    description: Option<String>,
}

impl GeminiClient {
    pub fn new(base_url: &str, model: &str, api_key: &str) -> Self {
        Self {
            base_url: base_url.trim_end_matches('/').to_string(),
            model: model.to_string(),
            api_key: api_key.to_string(),
            client: reqwest::Client::new(),
        }
    }

    pub async fn check_health(&self) -> Result<models::ProviderHealth, String> {
        let url = format!("{}/models?pageSize=10", self.base_url);
        match self
            .client
            .get(&url)
            .header("x-goog-api-key", &self.api_key)
            .send()
            .await
        {
            Ok(resp) if resp.status().is_success() => {
                let total = match resp.json::<GeminiModelsResponse>().await {
                    Ok(mr) => mr.models.len(),
                    Err(_) => 0,
                };
                Ok(models::ProviderHealth {
                    provider_type: "google-ai".to_string(),
                    reachable: true,
                    model_count: total,
                    models: vec![],
                    error: None,
                })
            }
            Ok(resp) => Ok(models::ProviderHealth {
                provider_type: "google-ai".to_string(),
                reachable: false,
                model_count: 0,
                models: vec![],
                error: Some(format!("HTTP {}", resp.status())),
            }),
            Err(e) => Ok(models::ProviderHealth {
                provider_type: "google-ai".to_string(),
                reachable: false,
                model_count: 0,
                models: vec![],
                error: Some(format!("Connection failed: {}", e)),
            }),
        }
    }

    pub async fn generate(&self, prompt: &str) -> Result<String, String> {
        let model_name = if self.model.starts_with("models/") {
            self.model.clone()
        } else {
            format!("models/{}", self.model)
        };
        let url = format!("{}/{}:generateContent", self.base_url, model_name);
        let body = GeminiContent {
            contents: vec![GeminiContentPart {
                role: "user".to_string(),
                parts: vec![GeminiTextPart {
                    text: prompt.to_string(),
                }],
            }],
            generation_config: GeminiConfig {
                temperature: 0.1,
                max_output_tokens: 2048,
            },
        };

        let resp = self
            .client
            .post(&url)
            .header("x-goog-api-key", &self.api_key)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Gemini request failed: {}", e))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(format!("Gemini returned HTTP {}: {}", status, text));
        }

        let gen_resp: GeminiGenerateResponse = resp
            .json()
            .await
            .map_err(|e| format!("Gemini parse error: {}", e))?;

        let text = gen_resp
            .candidates
            .and_then(|c| c.into_iter().next())
            .and_then(|c| c.content)
            .and_then(|c| c.parts.into_iter().next())
            .map(|p| p.text)
            .unwrap_or_default();

        if text.is_empty() {
            return Err("Gemini returned empty response".to_string());
        }

        Ok(text)
    }

    pub async fn list_models(&self) -> Result<Vec<String>, String> {
        let url = format!("{}/models?pageSize=50", self.base_url);
        let resp = self
            .client
            .get(&url)
            .header("x-goog-api-key", &self.api_key)
            .send()
            .await
            .map_err(|e| format!("Gemini list models failed: {}", e))?;

        if !resp.status().is_success() {
            return Err(format!("Gemini returned HTTP {}", resp.status()));
        }

        let models_resp: GeminiModelsResponse = resp
            .json()
            .await
            .map_err(|e| format!("Gemini parse error: {}", e))?;

        let names: Vec<String> = models_resp
            .models
            .iter()
            .filter_map(|m| {
                let trimmed = m.name.strip_prefix("models/").unwrap_or(&m.name);
                // Only include models that support generateContent (not "models/embedding-*")
                if !trimmed.starts_with("embedding") && !trimmed.starts_with("text-embedding") {
                    Some(trimmed.to_string())
                } else {
                    None
                }
            })
            .collect();

        Ok(names)
    }
}
