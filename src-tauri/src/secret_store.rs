use std::process::Command;

/// macOS Keychain integration for API keys.
/// Uses the `security` CLI tool to store/retrieve API keys in the system keychain.

const KEYCHAIN_SERVICE: &str = "alchemist";

/// Store an API key in the macOS Keychain.
/// Uses the generic-password type with the service name "alchemist" and
/// an account name matching the provider key.
pub fn store_key(account: &str, password: &str) -> Result<(), String> {
    let output = Command::new("security")
        .args([
            "add-generic-password",
            "-s",
            KEYCHAIN_SERVICE,
            "-a",
            account,
            "-w",
            password,
            "-U", // Update existing if present
        ])
        .output()
        .map_err(|e| format!("Failed to run security CLI: {}", e))?;

    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Keychain error: {}", stderr.trim()))
    }
}

/// Retrieve an API key from the macOS Keychain.
pub fn get_key(account: &str) -> Result<String, String> {
    let output = Command::new("security")
        .args([
            "find-generic-password",
            "-s",
            KEYCHAIN_SERVICE,
            "-a",
            account,
            "-w", // Output only the password
        ])
        .output()
        .map_err(|e| format!("Failed to run security CLI: {}", e))?;

    if output.status.success() {
        let password = String::from_utf8_lossy(&output.stdout)
            .trim()
            .to_string();
        if password.is_empty() {
            Err(format!("No key found for '{}'", account))
        } else {
            Ok(password)
        }
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        if stderr.contains("could not be found") || stderr.contains("not found") {
            Err(format!("No key stored for '{}'", account))
        } else {
            Err(format!("Keychain error: {}", stderr.trim()))
        }
    }
}

/// Delete an API key from the macOS Keychain.
pub fn delete_key(account: &str) -> Result<(), String> {
    let output = Command::new("security")
        .args([
            "delete-generic-password",
            "-s",
            KEYCHAIN_SERVICE,
            "-a",
            account,
        ])
        .output()
        .map_err(|e| format!("Failed to run security CLI: {}", e))?;

    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Keychain delete error: {}", stderr.trim()))
    }
}

/// Check if a key exists in the keychain.
pub fn has_key(account: &str) -> bool {
    get_key(account).is_ok()
}
