use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::process::Command;

/// macOS Keychain integration for API keys with local fallback.
/// Uses the `security` CLI tool (errors ignored to avoid prompts) + ~/.alchemist/secrets.json
/// so keys survive without triggering keychain prompts.

const KEYCHAIN_SERVICE: &str = "alchemist";

fn secrets_path() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
    PathBuf::from(home).join(".alchemist").join("secrets.json")
}

fn load_secrets() -> HashMap<String, String> {
    let path = secrets_path();
    if !path.exists() {
        return HashMap::new();
    }
    let content = fs::read_to_string(&path).unwrap_or_default();
    serde_json::from_str(&content).unwrap_or_default()
}

fn save_secrets(secrets: &HashMap<String, String>) -> Result<(), String> {
    if let Some(dir) = secrets_path().parent() {
        fs::create_dir_all(dir).map_err(|e| format!("Failed to create data dir: {}", e))?;
    }
    let content = serde_json::to_string_pretty(secrets)
        .map_err(|e| format!("Failed to serialize secrets: {}", e))?;
    fs::write(secrets_path(), content).map_err(|e| format!("Failed to save secrets: {}", e))
}

/// Store an API key.
/// Tries keychain (silently ignores errors) and always writes to local ~/.alchemist/secrets.json using account as key.
pub fn store_key(account: &str, password: &str) -> Result<(), String> {
    // Keychain attempt - ignore errors completely to prevent prompts/popups
    let _ = Command::new("security")
        .args([
            "add-generic-password",
            "-s",
            KEYCHAIN_SERVICE,
            "-a",
            account,
            "-w",
            password,
            "-U",
        ])
        .output();

    // Always write to local fallback file
    let mut secrets = load_secrets();
    secrets.insert(account.to_string(), password.to_string());
    save_secrets(&secrets)
}

/// Retrieve an API key.
/// First tries keychain, falls back to local ~/.alchemist/secrets.json
pub fn get_key(account: &str) -> Result<String, String> {
    // Try keychain first (non-panicking)
    if let Ok(output) = Command::new("security")
        .args([
            "find-generic-password",
            "-s",
            KEYCHAIN_SERVICE,
            "-a",
            account,
            "-w",
        ])
        .output()
    {
        if output.status.success() {
            let password = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !password.is_empty() {
                return Ok(password);
            }
        }
    }

    // Fallback to local file
    let secrets = load_secrets();
    if let Some(key) = secrets.get(account) {
        Ok(key.clone())
    } else {
        Err(format!("No key stored for '{}'", account))
    }
}

/// Delete an API key from both keychain (best effort) and local secrets file.
pub fn delete_key(account: &str) -> Result<(), String> {
    // Keychain delete - ignore errors
    let _ = Command::new("security")
        .args([
            "delete-generic-password",
            "-s",
            KEYCHAIN_SERVICE,
            "-a",
            account,
        ])
        .output();

    // Remove from local file
    let mut secrets = load_secrets();
    if secrets.remove(account).is_some() {
        save_secrets(&secrets)?;
    }
    Ok(())
}

/// Check if a key exists (keychain or local fallback).
pub fn has_key(account: &str) -> bool {
    get_key(account).is_ok()
}
