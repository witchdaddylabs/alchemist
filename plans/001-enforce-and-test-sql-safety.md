# Plan 001: Make the SQL safety layer real, correct, and tested (HIGH risk)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 44b6f29..HEAD -- src-tauri/src/validate.rs src-tauri/src/commands/app.rs src/features/workspace/ChatPanel.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED (touches the security-critical validator — tests must gate it)
- **Depends on**: none
- **Category**: security / tests / bug
- **Planned at**: commit `44b6f29`, 2026-06-29

## Why this matters

Alchemist's headline promise is "read-only, SELECT-only, every query parsed by
`sqlparser-rs`, auto-LIMIT, see the SQL before it runs." Today that promise is
**not kept on the main Run path**: the UI executes generated SQL through the raw
`run_query` command, which skips the validator entirely. Only the read-only
SQLite connection flag actually protects the user. Separately, the validator
itself has a false-positive bug (it blocks legitimate `SELECT`s whose
identifiers contain substrings like "RELEASE" or "ATTACH"), and it has **zero
tests** despite being the safety core. There is also no CI, so any regression
here ships silently.

After this plan: the safety checks run on every query execution, the validator
no longer rejects valid reads, the validator's contract is locked down by unit
tests, and CI runs those tests on every push.

## Current state

Files involved:

- `src-tauri/src/validate.rs` — the SQL safety validator. Contains a substring
  keyword scan that causes false positives.
- `src-tauri/src/commands/app.rs` — Tauri commands. `run_query` (raw, unguarded)
  and `validate_and_run` (the safe path) both exist.
- `src/features/workspace/ChatPanel.tsx` — the chat UI; its Run path calls the
  raw command.
- `src/lib/tauri.ts` — thin invoke wrappers (`runQuery`, `validateAndRun`).
- `.github/workflows/` — only `release.yml` exists; no CI.

The false-positive scan (`src-tauri/src/validate.rs:74-106`):

```rust
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
    // ... pushes a SafetyCheck and early-returns if has_dangerous
```

Because this is a raw substring match on the uppercased SQL, `SELECT * FROM
releases` (contains "RELEASE"), `SELECT attachment FROM docs` (contains
"ATTACH"), and `SELECT * FROM pragma_table_info('t')` (contains "PRAGMA") are all
wrongly blocked. Note: real `PRAGMA`/`ATTACH`/DDL/DML **statements** are already
rejected by Check 3 (`select_only`, `src-tauri/src/validate.rs:51-72`) because
`sqlparser` parses them as non-`Query` statement variants — so Check 4 adds no
safety, only false positives.

Also at `src-tauri/src/validate.rs:33`: `format!("Exactly 1 statement detected.")`
— a `format!` with no arguments (clippy `useless_format`). Fix while here.

The two execution commands (`src-tauri/src/commands/app.rs:60-91`):

```rust
#[tauri::command]
pub fn run_query(path: String, sql: String) -> Result<QueryResult, String> {
    db::run_query(&path, &sql).map_err(|e| e.to_string())   // no validation
}

#[tauri::command]
pub fn validate_and_run(path: String, sql: String) -> Result<QueryResult, String> {
    let validated = validate::validate_sql(&sql).map_err(|e| e.to_string())?;
    let critical_failed: Vec<_> = validated.checks.iter()
        .filter(|c| !c.passed && c.code != "limit").collect();
    if !critical_failed.is_empty() { /* returns Err with reasons */ }
    db::run_query(&path, &validated.final_sql).map_err(|e| e.to_string())
}
```

The UI Run path (`src/features/workspace/ChatPanel.tsx:316-323`):

```tsx
    // SQL mode — run real query
    setIsRunning(true);
    setExecutionError(null);
    setCurrentResults(null);

    try {
      const { runQuery } = await import("@/lib/tauri");
      const results = await runQuery(src.path, sql);
```

The safe wrapper already exists (`src/lib/tauri.ts:25-27`):

```ts
export async function validateAndRun(path: string, sql: string) {
  return invoke<QueryResult>("validate_and_run", { path, sql });
}
```

Repo conventions:

- **Rust tests** live in a `#[cfg(test)] mod tests { use super::*; ... }` block at
  the bottom of the same file. See `src-tauri/src/db.rs:604-680` for the exact
  pattern (uses `#[test] fn name() { ... assert_eq!(...) }`).
- Tauri commands return `Result<T, String>`.
- The DB connection is always opened read-only (`src-tauri/src/db.rs:181-186`,
  `OpenFlags::SQLITE_OPEN_READ_ONLY`) — do not change this; it is the backstop.

## Commands you will need

| Purpose         | Command (run from)                          | Expected on success |
|-----------------|---------------------------------------------|---------------------|
| Rust tests      | `cargo test` (in `src-tauri/`)              | exit 0, all pass    |
| Rust build      | `cargo build` (in `src-tauri/`)             | exit 0              |
| Typecheck (FE)  | `npx tsc --noEmit` (in repo root)           | exit 0, no errors   |
| Build (FE)      | `npm run build` (in repo root)              | exit 0              |

If `cargo` is not found, prepend the Rust bin dir to PATH for the session:
on Windows PowerShell `$env:Path += ";$env:USERPROFILE\.cargo\bin"`, on
macOS/Linux `export PATH="$HOME/.cargo/bin:$PATH"`.

## Scope

**In scope** (the only files you should modify/create):
- `src-tauri/src/validate.rs` (fix + add tests)
- `src/features/workspace/ChatPanel.tsx` (switch to `validateAndRun`)
- `.github/workflows/ci.yml` (create)

**Out of scope** (do NOT touch):
- `src-tauri/src/db.rs` — the read-only flag and `run_query` execution stay as-is.
- The `run_query` Tauri command in `commands/app.rs` — leave it for now; plan 003
  removes it once nothing references it. Removing it here is out of scope.
- Any change to `QueryResult`/`ValidatedQuery` shapes (the frontend depends on them).

## Git workflow

- Branch: `advisor/001-enforce-sql-safety`
- Commit per step; message style matches repo (conventional commits, e.g.
  `fix:`, `test:`, `ci:` — see `git log --oneline`).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add a CI workflow

Create `.github/workflows/ci.yml` that runs on `push` and `pull_request`. Two
jobs:

- **frontend** (ubuntu-latest): checkout → setup-node (Node 20) → `npm ci` →
  `npx tsc --noEmit` → `npm run build`.
- **rust** (ubuntu-latest): checkout → `dtolnay/rust-toolchain@stable` →
  working-directory `src-tauri` → `cargo build --verbose` → `cargo test --verbose`.

Match standard GitHub Actions YAML. Keep it minimal; no caching required for a
first pass.

**Verify**: the file is valid YAML — `npx --yes yaml-lint .github/workflows/ci.yml`
returns exit 0 (or visually confirm structure if yaml-lint is unavailable). The
real verification is that the commands it runs already pass locally (Steps 2-4).

### Step 2: Add validator unit tests (capture the contract + the bug)

Append a `#[cfg(test)] mod tests` block to `src-tauri/src/validate.rs`, modeled
on `src-tauri/src/db.rs:604`. Cover:

- **Allowed reads** (must pass all critical checks — `select_only`,
  `single_statement`, and no spurious block):
  - `SELECT * FROM users LIMIT 10`
  - `SELECT * FROM releases` (regression for the "RELEASE" false positive)
  - `SELECT attachment FROM docs LIMIT 5` (regression for "ATTACH")
  - `WITH x AS (SELECT 1) SELECT * FROM x`
- **Blocked writes/DDL** (the `select_only` check must be `passed: false`):
  - `INSERT INTO t VALUES (1)`, `UPDATE t SET a=1`, `DELETE FROM t`,
    `DROP TABLE t`, `CREATE TABLE t (a int)`
- **Blocked multi-statement** (`single_statement` check `passed: false`):
  - `SELECT 1; SELECT 2`
- **Auto-LIMIT**:
  - `SELECT * FROM t` → `final_sql` ends with `LIMIT 1000`, `was_amended == true`
  - `SELECT * FROM t LIMIT 5` → `was_amended == false`, `final_sql` unchanged

Helper to check a named check passed:
`fn check_passed(v: &ValidatedQuery, code: &str) -> bool { v.checks.iter().find(|c| c.code == code).map(|c| c.passed).unwrap_or(false) }`

**Verify**: `cargo test` (in `src-tauri/`). EXPECTED at this step: the
`releases` / `attachment` "allowed reads" assertions **FAIL** (this documents the
bug). All write/multi-statement/limit tests should already PASS. If a write or
multi-statement test fails (i.e., a write is *not* blocked), that is a STOP
condition.

### Step 3: Remove the false-positive keyword scan

In `src-tauri/src/validate.rs`, delete "Check 4: Dangerous keywords"
(lines ~74-106): the keyword array, the loop, the `SafetyCheck` push for
`dangerous_keywords`, and its early-return block. The AST `select_only` check
(Check 3) already guarantees the statement is a `Query`, so `PRAGMA`, `ATTACH`,
DDL and DML are already rejected. Do not add a replacement substring scan.

Also fix `src-tauri/src/validate.rs:33`: change
`format!("Exactly 1 statement detected.")` to
`"Exactly 1 statement detected.".to_string()`.

Leave Checks 1, 2, 3, 5 (empty, single-statement, select-only, limit) exactly as
they are.

**Verify**: `cargo test` (in `src-tauri/`) → exit 0, ALL tests from Step 2 now
pass (the `releases`/`attachment` reads are allowed; writes/multi-statement still
blocked). Then `cargo build` → exit 0.

### Step 4: Route the UI Run path through validation

In `src/features/workspace/ChatPanel.tsx` (the SQL-mode execution block around
line 316-323), change the dynamic import and call from `runQuery` to
`validateAndRun`:

```tsx
      const { validateAndRun } = await import("@/lib/tauri");
      const results = await validateAndRun(src.path, sql);
```

Do not change anything else in that block (the `QueryResultData` mapping stays).
Leave the vector-search path (which uses `searchDocuments`) untouched.

**Verify**: `npx tsc --noEmit` → exit 0; `npm run build` → exit 0. Then
`grep -n "runQuery" src/features/workspace/ChatPanel.tsx` → no matches.

## Test plan

- New Rust tests in `src-tauri/src/validate.rs` `mod tests`, listed in Step 2,
  modeled structurally on `src-tauri/src/db.rs:604-680`.
- Coverage: allowed SELECT/WITH (incl. the two false-positive regressions),
  blocked DML/DDL, blocked multi-statement, auto-LIMIT add/no-add.
- Verification: `cargo test` → all pass, including the new tests.
- Frontend change has no unit test (no FE test runner yet — added in plan 002's
  DX scope if pursued); verified via typecheck + build + the grep gate above.

## Done criteria

ALL must hold:

- [ ] `cargo test` (in `src-tauri/`) exits 0; new `validate.rs` tests exist and pass
- [ ] `cargo build` (in `src-tauri/`) exits 0
- [ ] `npx tsc --noEmit` exits 0 and `npm run build` exits 0
- [ ] `grep -n "runQuery" src/features/workspace/ChatPanel.tsx` returns no matches
- [ ] `grep -n "dangerous_keywords" src-tauri/src/validate.rs` returns no matches
- [ ] `.github/workflows/ci.yml` exists and is valid YAML
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- A write (`INSERT`/`UPDATE`/`DELETE`/`DROP`/`CREATE`) or a multi-statement query
  is NOT blocked by `validate_sql` after Step 3 — that means `select_only` is not
  the sufficient backstop this plan assumes.
- `sqlparser` fails to parse any of the valid SELECT test strings (parse error on
  legitimate SQLite syntax) — the dialect handling may need revisiting.
- The "Current state" excerpts don't match the live code (drift).
- `npm run build` or `cargo test` fails twice after a reasonable fix attempt.

## Maintenance notes

- After this plan, `pragma_table_info('t')` and similar read-only table-valued
  functions are permitted — this is intentional (read-only introspection).
- The raw `run_query` Tauri command is now unused by the UI; plan 003 removes it
  and its `runQuery` wrapper. A reviewer should confirm no other caller appears.
- If a future change adds genuinely dangerous read-time constructs, enforce them
  via the parsed AST (walk `sqlparser` nodes), never a substring scan.
- Reviewer focus: confirm the `select_only` AST check is the sole gate for
  statement-type safety and that the new tests assert both directions (allow and
  block).
