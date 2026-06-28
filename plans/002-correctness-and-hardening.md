# Plan 002: Source-aware query routing + data/security hardening (MEDIUM risk)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 44b6f29..HEAD -- src-tauri/src/llm.rs src-tauri/src/commands/app.rs src-tauri/src/secret_store.rs src-tauri/src/db.rs src/lib/tauri.ts src/features/workspace/ChatPanel.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none (independent of plan 001; touches different code paths)
- **Category**: bug / security
- **Planned at**: commit `44b6f29`, 2026-06-29

## Why this matters

Three independent medium-severity issues, grouped because each is a contained
fix with a clear test:

1. **Query mode is guessed from keywords, ignoring the open data source.** Asking
   a SQLite database to "**find** all witches" or "show the table **structure**"
   routes to vector/YAML mode instead of SQL — breaking common phrasings of the
   app's core feature.
2. **API keys are written to a plaintext file with no permission hardening** — on
   Unix the file is world-readable (mode 0644).
3. **Imported numeric-looking strings lose data** — `"007"`, leading-zero IDs and
   zip codes in CSV/JSON/YAML are silently coerced to integers on import.

## Current state

### Finding 1 — mode routing

`src-tauri/src/llm.rs:225-247` decides the mode purely from question text:

```rust
pub fn detect_mode(question: &str) -> &'static str {
    let lower = question.to_lowercase();
    if lower.contains("wing") || lower.contains("room") || /* ... */ lower.contains("structure") {
        "yaml_query"
    } else if lower.contains("search") || lower.contains("find") || /* ... */ lower.contains("about ") {
        "vector_search"
    } else {
        "sql"
    }
}
```

`src-tauri/src/commands/app.rs:206-218` calls it without any source-type input:

```rust
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
```

The frontend already knows the source type but doesn't pass it. `src/lib/tauri.ts:97-113`:

```ts
export async function generateQuery(params: {
  question: string;
  schemaJson?: string;
  palaceJson?: string;
  providerType?: string;
  providerUrl?: string;
  providerModel?: string;
}) {
  return invoke<GeneratedQuery>("generate_query", {
    question: params.question,
    schemaJson: params.schemaJson ?? null,
    /* ... */
  });
}
```

`src/features/workspace/ChatPanel.tsx:174-180` builds the call; the active source
type is available as `useAppStore.getState().dataSourceType` (values:
`"sqlite" | "chromadb" | "mempalace" | null`, defined in
`src/state/app-store.ts:3`).

### Finding 2 — key file permissions

`src-tauri/src/secret_store.rs:26-33`:

```rust
fn save_secrets(secrets: &HashMap<String, String>) -> Result<(), String> {
    if let Some(dir) = secrets_path().parent() {
        fs::create_dir_all(dir).map_err(|e| format!("Failed to create data dir: {}", e))?;
    }
    let content = serde_json::to_string_pretty(secrets)
        .map_err(|e| format!("Failed to serialize secrets: {}", e))?;
    fs::write(secrets_path(), content).map_err(|e| format!("Failed to save secrets: {}", e))
}
```

No permission restriction; on Unix the file lands at the umask default (commonly
0644 — readable by other local users). On macOS keys are also mirrored to the
Keychain (`#[cfg(target_os = "macos")]` blocks), so this fallback file is the
sole store on Linux and Windows.

### Finding 3 — import numeric coercion

`src-tauri/src/db.rs:418-428` (value coercion) and `:371-394`
(`infer_value_type`, used by `sqlite_type_for_column`) both treat any string that
`parse::<i64>()`/`parse::<f64>()` succeeds on as numeric:

```rust
        serde_json::Value::String(s) => {
            let trimmed = s.trim();
            if trimmed.is_empty() {
                rusqlite::types::Value::Null
            } else if let Ok(i) = trimmed.parse::<i64>() {
                rusqlite::types::Value::Integer(i)        // "007" -> 7  (data loss)
            } else if let Ok(f) = trimmed.parse::<f64>() {
                rusqlite::types::Value::Real(f)           // "1.50" -> 1.5
            } else {
                rusqlite::types::Value::Text(s.clone())
            }
        }
```

Repo conventions: Rust tests in `#[cfg(test)] mod tests` at file bottom (see
`src-tauri/src/db.rs:604-680`). Tauri commands return `Result<T, String>`.

## Commands you will need

| Purpose         | Command (run from)                | Expected on success |
|-----------------|-----------------------------------|---------------------|
| Rust tests      | `cargo test` (in `src-tauri/`)    | exit 0, all pass    |
| Rust build      | `cargo build` (in `src-tauri/`)   | exit 0              |
| Typecheck (FE)  | `npx tsc --noEmit` (repo root)    | exit 0              |
| Build (FE)      | `npm run build` (repo root)       | exit 0              |

(`cargo` on PATH: `$env:Path += ";$env:USERPROFILE\.cargo\bin"` on Windows, or
`export PATH="$HOME/.cargo/bin:$PATH"`.)

## Scope

**In scope**:
- `src-tauri/src/llm.rs` (add `mode_for_source` helper + tests)
- `src-tauri/src/commands/app.rs` (add `source_type` param; use the helper)
- `src/lib/tauri.ts` (add `sourceType` to `generateQuery`)
- `src/features/workspace/ChatPanel.tsx` (pass `dataSourceType`)
- `src-tauri/src/secret_store.rs` (file permissions + cfg(unix) test)
- `src-tauri/src/db.rs` (canonical-number coercion + tests)

**Out of scope**:
- Migrating to an OS keyring (`keyring` crate) — deferred (see Maintenance).
- The execution/validation path (plan 001 owns it).
- Changing existing import column-name normalization or the read-only flag.

## Git workflow

- Branch: `advisor/002-correctness-hardening`
- Commit per finding (three logical commits); conventional-commit messages.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Source-aware mode selection (Finding 1)

In `src-tauri/src/llm.rs`, add a helper that prefers the data source over
keywords, falling back to `detect_mode` only when the source is unknown:

```rust
/// Choose query mode from the active data source, falling back to keyword
/// detection when the source type is unknown/absent.
pub fn mode_for_source(source_type: Option<&str>, question: &str) -> &'static str {
    match source_type {
        Some("sqlite") => "sql",
        Some("chromadb") => "vector_search",
        Some("mempalace") => "yaml_query",
        _ => detect_mode(question),
    }
}
```

In `src-tauri/src/commands/app.rs`, add a parameter `source_type: Option<String>`
to `generate_query` (place it after `palace_json`), and change the mode line to:

```rust
    let mode = llm::mode_for_source(source_type.as_deref(), &question);
```

In `src/lib/tauri.ts`, add `sourceType?: string;` to the `generateQuery` params
object and pass `sourceType: params.sourceType ?? null` in the invoke payload
(Tauri maps `sourceType` → `source_type`).

In `src/features/workspace/ChatPanel.tsx` (the `generateQuery({ ... })` call
around line 174), add:
`sourceType: useAppStore.getState().dataSourceType ?? undefined,`.

Add Rust tests for `mode_for_source` in `llm.rs` `mod tests`:
- `mode_for_source(Some("sqlite"), "find all witches") == "sql"`
- `mode_for_source(Some("sqlite"), "show the structure") == "sql"`
- `mode_for_source(Some("chromadb"), "list tables") == "vector_search"`
- `mode_for_source(Some("mempalace"), "anything") == "yaml_query"`
- `mode_for_source(None, "find documents") == "vector_search"` (fallback intact)

**Verify**: `cargo test` → exit 0 incl. new tests; `cargo build` → exit 0;
`npx tsc --noEmit` → exit 0; `npm run build` → exit 0.

### Step 2: Harden the secrets file permissions (Finding 2)

In `src-tauri/src/secret_store.rs`, after writing the file in `save_secrets`,
restrict permissions to owner-only on Unix. Add, gated by `#[cfg(unix)]`:

```rust
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = fs::set_permissions(secrets_path(), fs::Permissions::from_mode(0o600));
    }
    Ok(())
```

(Windows: the file is under the user profile, ACL-private by default — no change.)
Do not alter the macOS Keychain blocks.

Add a `#[cfg(all(test, unix))]` test asserting the mode bits are `0o600` after a
`store_key`/`save_secrets` round-trip into a temp `HOME`. If isolating `HOME` in
the test proves impractical, instead STOP and report rather than weakening the
test.

**Verify**: `cargo test` → exit 0; `cargo build` → exit 0.

### Step 3: Preserve non-canonical numeric strings on import (Finding 3)

In `src-tauri/src/db.rs`, add a helper and use it in both `json_value_to_sqlite`
and `infer_value_type` so a string is only treated as a number when no
information is lost (round-trip equality):

```rust
/// True only if `s` is a canonical integer literal (round-trips exactly).
/// Rejects leading zeros ("007"), leading '+', and whitespace-padded forms.
fn canonical_i64(s: &str) -> Option<i64> {
    s.parse::<i64>().ok().filter(|i| i.to_string() == s)
}
```

In `json_value_to_sqlite` (the `serde_json::Value::String(s)` arm), replace the
`trimmed.parse::<i64>()` branch with `canonical_i64(trimmed)`. Leave the
existing empty→Null behavior. For floats, only coerce when canonical:
`s.parse::<f64>().ok().filter(|f| f.to_string() == trimmed)` — otherwise keep the
original string as `Text`. In `infer_value_type`, mirror the same canonical
checks for the `String` arm so column typing agrees with storage.

Add Rust tests in `db.rs` `mod tests` (model after the existing import tests at
`src-tauri/src/db.rs:619`): an imported CSV with a column containing `007`, `42`,
`1.50`, `3.14`, `-5` yields — after `get_schema` + `run_query` — `007` preserved
as text `"007"`, `1.50` preserved as `"1.50"`, while `42`/`-5` are integers and
`3.14` is a real. (Note: a column that mixes `007` with plain ints becomes TEXT;
assert the literal string is retained.)

**Verify**: `cargo test` → exit 0 incl. new tests; `cargo build` → exit 0.

## Test plan

- `llm.rs`: `mode_for_source` mapping + fallback (5 cases above).
- `secret_store.rs`: cfg(unix) permission-bits test.
- `db.rs`: import data-integrity test for leading-zero/non-canonical numerics,
  modeled on `imports_csv_as_queryable_sqlite` (`src-tauri/src/db.rs:619`).
- Verification: `cargo test` all pass; frontend `tsc` + `build` clean.

## Done criteria

ALL must hold:

- [ ] `cargo test` (in `src-tauri/`) exits 0 with new tests for all three findings
- [ ] `cargo build` exits 0
- [ ] `npx tsc --noEmit` and `npm run build` exit 0
- [ ] `grep -n "mode_for_source" src-tauri/src/commands/app.rs` shows it in use
- [ ] `grep -n "canonical_i64" src-tauri/src/db.rs` shows it in use
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back if:

- Adding `source_type` to `generate_query` requires changing the `GeneratedQuery`
  return shape or any other command signature.
- The cfg(unix) permission test cannot isolate `HOME`/`USERPROFILE` without
  affecting the developer's real secrets file (do not run a test that writes to a
  real home dir).
- The canonical-number change breaks an existing import test in unexpected ways
  (re-read the test expectations before adjusting them).
- "Current state" excerpts don't match live code (drift).

## Maintenance notes

- **Follow-up (deferred):** replace the plaintext fallback with the `keyring`
  crate (Windows Credential Manager / libsecret / macOS Keychain) for one secure
  cross-platform path; tracked as a direction item. This plan only hardens the
  existing file.
- The `source_type` is now authoritative for routing; if a new data-source type
  is added, extend both `app-store.ts:3` (`DataSourceType`) and
  `mode_for_source`.
- Reviewer focus: confirm leading-zero strings survive a full
  import→schema→query round-trip, and that `infer_value_type` and
  `json_value_to_sqlite` agree (column type matches stored value type).
