use std::path::PathBuf;

/// Cross-platform user home directory.
/// Resolves to `%USERPROFILE%` on Windows and `$HOME` elsewhere, falling back to
/// the system temp dir only as a last resort so app data always has a valid home.
pub fn user_home() -> PathBuf {
    dirs::home_dir()
        .or_else(|| std::env::var_os("USERPROFILE").map(PathBuf::from))
        .or_else(|| std::env::var_os("HOME").map(PathBuf::from))
        .unwrap_or_else(std::env::temp_dir)
}
