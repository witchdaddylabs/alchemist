# Plan 003: Export escaping fixes + dead-code/default cleanup (LOW risk)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 44b6f29..HEAD -- src/features/workspace/ChatPanel.tsx src-tauri/src/llm.rs src-tauri/src/commands/app.rs src-tauri/src/lib.rs src/lib/tauri.ts src/state/app-store.ts src/components/workspace/ProviderSelector.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plan 001 (Step 3 removes the now-unused `run_query`/`runQuery`,
  which plan 001 stops using). Do Step 1 (exports) and Step 2 (dead code other
  than `run_query`) independently; only Step 3 requires 001.
- **Category**: bug / tech-debt / dx
- **Planned at**: commit `44b6f29`, 2026-06-29

## Why this matters

Low-severity but user-visible polish: result exports produce malformed files for
certain data, and a few small debt items make the codebase harder to reason
about. None of these is risky to fix; together they remove paper cuts.

1. **Export escaping gaps** — CSV header cells aren't quoted; Markdown doesn't
   escape pipes in the header row or newlines in any cell, producing broken
   tables (the latter is already noted in `docs/Alchemist-Get-It-Working-Plan.md`).
2. **Dead/duplicated code** — `parse_filters` is never called; the `"llama3.2"`
   default is hardcoded in 5 places; and after plan 001 the raw `run_query`
   command/`runQuery` wrapper are unused.

## Current state

### Export helpers (`src/features/workspace/ChatPanel.tsx:51-88`)

```tsx
  if (format === "csv") {
    const header = results.columns.join(",");          // header NOT escaped
    const rows = results.rows.map((row) =>
      row.map((v) => {
        const s = String(v ?? "");
        if (s.includes(",") || s.includes('"') || s.includes("\n")) {
          return `"${s.replace(/"/g, '""')}"`;          // data cells: correct
        }
        return s;
      }).join(",")
    );
    const content = [header, ...rows].join("\n");
    /* ... */
  }

  if (format === "markdown") {
    const header = `| ${results.columns.join(" | ")} |`;             // pipes not escaped
    const separator = `| ${results.columns.map(() => "---").join(" | ")} |`;
    const rows = results.rows.map(
      (row) => `| ${row.map((v) => String(v ?? "").replace(/\|/g, "\\|")).join(" | ")} |`  // newlines not handled
    );
    const content = [header, separator, ...rows].join("\n");
    /* ... */
  }
```

### Dead/duplicated code

- `src-tauri/src/llm.rs:202` — `pub fn parse_filters(...)` is defined but never
  called (confirmed: `grep -rn "parse_filters" src-tauri/src` shows only the
  definition).
- `"llama3.2"` literal appears in: `src/state/app-store.ts:170`,
  `src/components/workspace/ProviderSelector.tsx:23`,
  `src-tauri/src/commands/app.rs:143`, `:218`, and `:336` (`"llama3.2:latest"`).
- After plan 001, `src/features/workspace/ChatPanel.tsx` no longer calls
  `runQuery`; the `run_query` Tauri command (`src-tauri/src/commands/app.rs:60-63`),
  its registration in `src-tauri/src/lib.rs:25`, and the `runQuery` wrapper
  (`src/lib/tauri.ts:17-19`) become dead.

Repo conventions: Tauri commands return `Result<T, String>`; commands are
registered in the `tauri::generate_handler![...]` list in
`src-tauri/src/lib.rs:19-45`.

## Commands you will need

| Purpose         | Command (run from)                | Expected on success |
|-----------------|-----------------------------------|---------------------|
| Typecheck (FE)  | `npx tsc --noEmit` (repo root)    | exit 0              |
| Build (FE)      | `npm run build` (repo root)       | exit 0              |
| Rust tests      | `cargo test` (in `src-tauri/`)    | exit 0, all pass    |
| Rust build      | `cargo build` (in `src-tauri/`)   | exit 0              |

## Scope

**In scope**:
- `src/features/workspace/ChatPanel.tsx` (export helpers)
- `src-tauri/src/llm.rs` (remove `parse_filters`)
- `src/state/app-store.ts`, `src/components/workspace/ProviderSelector.tsx`,
  `src-tauri/src/commands/app.rs` (consolidate `"llama3.2"` default)
- `src-tauri/src/lib.rs`, `src/lib/tauri.ts` (remove dead `run_query`/`runQuery`
  — Step 3 only, requires plan 001 merged)

**Out of scope**:
- Auto-model selection logic in Settings (already handled elsewhere).
- Any change to the export *formats* themselves (column order, JSON shape).
- Removing `run_query` if plan 001 is NOT yet merged — verify first.

## Git workflow

- Branch: `advisor/003-export-cleanup`
- Commit per step; conventional-commit messages.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Fix export escaping

In `src/features/workspace/ChatPanel.tsx`:

- **CSV**: apply the same cell-escaping to the header as to data cells. Extract a
  local `csvCell(v: unknown): string` that quotes when the value contains `,`,
  `"`, `\n`, or `\r`, doubling embedded quotes; use it for both
  `results.columns` and each row value.
- **Markdown**: add a local `mdCell(v: unknown): string` that escapes pipes
  (`\|`) AND replaces any `\r\n`/`\n`/`\r` with `<br>` (so a cell never breaks the
  row). Apply it to BOTH the header cells (`results.columns`) and every row value.

**Verify**: `npx tsc --noEmit` → exit 0; `npm run build` → exit 0. Manual check:
exporting a result whose cell contains a newline and a `|` produces a Markdown
table that still renders as one row per record (no mid-row line breaks), and a
CSV whose header contains a comma is wrapped in quotes.

### Step 2: Remove dead code and consolidate the default model

- Delete the unused `parse_filters` function (`src-tauri/src/llm.rs:202-222`).
  Confirm no caller exists first (`grep -rn "parse_filters" src-tauri/src` →
  only the definition).
- Consolidate the `"llama3.2"` default:
  - Frontend: add `export const DEFAULT_OLLAMA_MODEL = "llama3.2";` to a small
    shared module (e.g. `src/lib/constants.ts`, create it) and import it in
    `src/state/app-store.ts:170` and
    `src/components/workspace/ProviderSelector.tsx:23`.
  - Backend: add `const DEFAULT_OLLAMA_MODEL: &str = "llama3.2";` near the top of
    `src-tauri/src/commands/app.rs` and use it at lines 143, 218, and 336 (note
    line 336 is `"llama3.2:latest"` — keep the `:latest` suffix by formatting
    `format!("{}:latest", DEFAULT_OLLAMA_MODEL)` or leave that one literal if it
    reads cleaner; do not change its value).

**Verify**: `cargo test` → exit 0; `cargo build` → exit 0; `npx tsc --noEmit`
→ exit 0; `npm run build` → exit 0. `grep -rn "parse_filters" src-tauri/src` →
no matches.

### Step 3: Remove the now-unused raw query command (requires plan 001)

First confirm plan 001 has landed and nothing uses the raw path:
`grep -rn "runQuery\b" src` → no matches, and
`grep -rn "run_query" src-tauri/src` → only the definition + registration.
If `runQuery` still has callers, **STOP** — plan 001 is not merged; skip this step
and note it.

Then remove:
- `runQuery` wrapper in `src/lib/tauri.ts:17-19`.
- The `run_query` command in `src-tauri/src/commands/app.rs:60-63`.
- Its line in the handler list `src-tauri/src/lib.rs:25` (`app::run_query,`).

Keep `validate_and_run` and `db::run_query` (the internal function) — only the
public command and its JS wrapper go.

**Verify**: `cargo build` → exit 0; `cargo test` → exit 0; `npx tsc --noEmit`
→ exit 0; `npm run build` → exit 0.

## Test plan

- No new automated tests required for Step 1 (no FE test runner). If `vitest` has
  since been added, write a unit test for `csvCell`/`mdCell` covering: value with
  comma, value with embedded quote, value with newline, value with `|`.
- Steps 2-3 are verified by the existing `cargo test` suite plus the build/grep
  gates (removals must not break compilation).

## Done criteria

ALL must hold:

- [ ] `npx tsc --noEmit` and `npm run build` exit 0
- [ ] `cargo test` and `cargo build` (in `src-tauri/`) exit 0
- [ ] `grep -rn "parse_filters" src-tauri/src` returns no matches
- [ ] Markdown export escapes pipes in headers and replaces newlines in cells;
      CSV header cells are quoted when needed (confirmed by reading the helpers)
- [ ] If Step 3 ran: `grep -rn "runQuery" src` and the `run_query` command/handler
      line return no matches
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back if:

- Step 3's pre-check shows `runQuery` still has callers (plan 001 not merged) —
  do Steps 1-2 only and report.
- Removing `parse_filters` causes a compile error (it has a hidden caller the
  grep missed) — investigate before deleting.
- "Current state" excerpts don't match live code (drift).

## Maintenance notes

- If export gains more formats (e.g. XLSX), centralize cell-escaping helpers so
  each format escapes consistently.
- The consolidated `DEFAULT_OLLAMA_MODEL` is a *fallback* only; runtime model
  selection comes from detected/installed models. Don't wire business logic to
  the constant beyond defaults.
- Reviewer focus: confirm Step 3 only removed the public `run_query` command and
  JS wrapper, not the internal `db::run_query` used by `validate_and_run`.
