# Alchemist — Get It Working Plan

> **Goal:** Get Alchemist to a fully working local state. Billy re-tests at the end.
> **Approach:** Codex delegation. Each task is self-contained with clear files to modify.
> **Codebase:** `/Users/habibi/hermes/apps-codebases/alchemist/`
> **Stack:** Tauri v2 · React 19 · TypeScript · Vite · shadcn/ui · Tailwind · Zustand · Rust · rusqlite

---

## Current State (verified 2026-06-19)

### ✅ Already Working (tested by Billy)
- Natural language → SQL generation (Ollama + OpenAI + DeepSeek + Google AI)
- Provider switching from workspace toolbar
- Consecutive queries (no stale state)
- Spell save/load/dedup
- OpenAI API queries (GPT-4.1, GPT-5.5)
- Ollama auto-detects installed models
- YAML MemPalace file loading (both mapping + list format)
- Chart rendering (max 3, 320px, proper spacing)
- Safety preview modal + read-only enforcement
- Inspector panel (real provider/model display)
- App launch via `npm run tauri dev` verified by Billy
- Stored OpenAI key persists in app storage
- Local Ollama model loads when the Ollama desktop app is running
- MemPalace queries tested with both OpenAI and local Ollama
- Medium and Hard demo databases tested with relevant natural-language queries
- Saved spells persist and re-run in the app
- CSV export and JSON export produced valid files; simple tabular MD export produced a valid file

### 🟡 Implemented But Needs Re-Test
- Easy demo database still needs a quick pass if the full 3-demo checklist is required
- CSV/JSON/YAML generic file import still needs manual verification
- Export cancel flow still needs manual verification
- Chart rendering still needs explicit confirmation from a numeric-result query
- Drag-and-drop `.db` loading still needs manual verification
- MemPalace/rich-text Markdown export needs a bugfix: markdown pipes/newlines inside result cells are not escaped, producing a malformed table

### ❌ Not Done
- First-class MemPalace result UI/search is still Sprint 15 scope; current MemPalace support is usable but exposes raw ChromaDB-style results
- Mobile-friendly results table scrolling
- Sprint 15: MemPalace as first-class data source

---

## Test Data Already Available

All in `test-data/`:

| Database | Tables | Rows | Theme |
|----------|--------|------|-------|
| `alchemist_easy_coven.db` | witches, potions, customers, transactions | 3-5 each | Basic coven operations |
| `alchemist_medium_shadow.db` | people, covens, contracts, ingredients, transactions | 2-5 each | Shadow network contracts |
| `alchemist_hard_eternal.db` | entities, pacts, ledgers, artifacts, transfers | 4-6 each | Eternal Flame Syndicate |

Plus:
- `test_mempalace_structure.yaml` — list-format YAML palace structure
- `test_fixtures/mempalace.yaml` — mapping-format YAML palace structure
- `test_chromadb_persistence/chroma.sqlite3` — real ChromaDB vault

---

## Task List (Codex-Ready)

### Task 1: Wire Up Test Database Loading

**Goal:** Add a "Load Demo Database" button to the welcome screen that opens one of the 3 test databases.

**Files to modify:**
- `src/features/vault/VaultScreen.tsx` — add demo database cards/buttons
- `src/lib/tauri.ts` — add `loadDemoDatabase(dbName)` invoke wrapper
- `src-tauri/src/commands/app.rs` — add `load_demo_database` command that resolves path relative to project root

**Acceptance criteria:**
- [x] Welcome screen shows "Demo Databases" section with 3 cards (Easy Coven, Medium Shadow, Hard Eternal)
- [x] Clicking a demo card opens the database and shows schema in the workspace
- [x] Each card shows table count + row count + difficulty label

---

### Task 2: Re-Test + Fix Export (CSV/MD/JSON)

**Goal:** Verify the `spawn_blocking` crash fix works. Fix any remaining issues.

**Files to check:**
- `src-tauri/src/commands/app.rs` — `save_file_dialog` command
- `src/features/workspace/ChatPanel.tsx` — `exportResults` function
- `src/lib/tauri.ts` — `saveFile()` wrapper

**Test procedure:**
1. Open any test database
2. Run a natural language query (e.g. "show me all witches")
3. Click CSV export → verify macOS save dialog appears
4. Click MD export → verify file saves with correct formatting
5. Click JSON export → verify valid JSON output
6. Cancel dialog → verify no crash

**Acceptance criteria:**
- [ ] All 3 export formats work without crash *(CSV + JSON valid; simple MD valid; MemPalace/rich-text MD malformed)*
- [ ] Cancel dialog is handled gracefully *(not confirmed yet)*
- [x] Filenames include timestamps

---

### Task 3: Generic Data File Import (CSV/JSON/YAML → SQLite)

**Goal:** Allow users to load CSV, JSON, and YAML tabular data files. Route them through an in-memory SQLite import so the existing query pipeline works unchanged.

**Files to modify:**
- `src-tauri/src/db.rs` — add `import_csv_to_sqlite()`, `import_json_to_sqlite()`, `import_yaml_to_sqlite()` functions
- `src-tauri/src/commands/app.rs` — modify `open_vault` to detect file type by extension and route to import functions
- `src-tauri/src/models.rs` — add `DataSourceType::ImportedFile` variant if needed
- `src/features/vault/VaultScreen.tsx` — update file picker to accept `.csv`, `.json`, `.yaml` extensions

**Implementation approach:**
- CSV: Parse with `csv` crate, create table with inferred column types, insert rows
- JSON: Parse array of objects, create table from keys, insert rows
- YAML: Parse list of mappings, same as JSON
- All imported into a temporary in-memory SQLite DB (or temp file)
- Table name = filename without extension

**Acceptance criteria:**
- [x] Dropping a `.csv` file creates a queryable SQLite table
- [x] Dropping a `.json` file (array of objects) creates a queryable table
- [x] Dropping a `.yaml` file (list of mappings) creates a queryable table
- [x] Schema panel shows imported columns with correct types
- [x] Natural language queries work against imported data

---

### Task 4: Build Verification + Clean Compile

**Goal:** Ensure the project builds cleanly on macOS. Fix any warnings or errors.

**Commands:**
```bash
cd ~/hermes/apps-codebases/alchemist
npm install
npm run build          # Frontend (tsc + vite build)
cd src-tauri && cargo build  # Rust backend
npm run tauri dev      # Full app launch
```

**Acceptance criteria:**
- [x] `npm run build` exits 0 with no TypeScript errors
- [x] `cargo build` exits 0 with no Rust compilation errors
- [x] `npm run tauri dev` launches the app window
- [x] No console errors on startup

---

### Task 5: Improve NL→SQL Prompt for Better Results

**Goal:** The NL→SQL prompt sometimes generates placeholder columns or hallucinated table names. Tighten the prompt with actual schema context.

**Files to modify:**
- `src-tauri/src/llm.rs` — `build_sql_prompt` function

**Improvements:**
- Always include actual table names and column names in the prompt
- Add explicit "ONLY use tables and columns that exist in the schema" rule
- Add "DO NOT invent column names" rule
- Include sample row data (first 2 rows) for context on data format
- For COUNT/SUM queries, verify the column exists before generating

**Acceptance criteria:**
- [x] "How many witches are there?" → generates `SELECT COUNT(*) FROM witches`
- [x] "Show me all potions over 50 gold" → generates correct WHERE clause with actual column name
- [x] No hallucinated table or column names in generated SQL
- [x] Graceful error when question can't be answered by available schema

---

### Task 6: Welcome Screen Polish

**Goal:** Make the welcome screen useful — show recent databases, demo options, and clear onboarding.

**Files to modify:**
- `src/features/vault/VaultScreen.tsx` — redesign welcome screen
- `src/state/app-store.ts` — add `recentDatabases` state (persist to localStorage)

**Features:**
- Recent databases list (last 5 opened, stored in localStorage)
- Demo databases section (from Task 1)
- "Load MemPalace" button (existing — keep it)
- Quick-start instructions for new users
- Drag-and-drop zone for database files

**Acceptance criteria:**
- [x] Recently opened databases appear on welcome screen
- [x] Demo databases are clearly labeled with difficulty
- [x] Drag-and-drop works for .db, .sqlite, .sqlite3 files
- [x] Welcome screen is clean and not cluttered

---

## Execution Order

1. **Task 4** — Build verification first (make sure it compiles)
2. **Task 1** — Wire up test databases (enables all other testing)
3. **Task 2** — Re-test export (quick win, already implemented)
4. **Task 5** — NL→SQL prompt improvement (test with demo databases)
5. **Task 3** — Generic file import (new feature, most complex)
6. **Task 6** — Welcome screen polish (final touch)

## After Codex: Billy's Re-Test Checklist

- [x] Launch `npm run tauri dev` — no errors
- [ ] Load each demo database — schema shows correctly *(Medium + Hard tested; Easy not explicitly confirmed)*
- [ ] Run 3+ natural language queries per database *(Medium + Hard tested; Easy not explicitly confirmed)*
- [ ] Test CSV/MD/JSON export on real query results *(CSV + JSON valid; simple MD valid; MemPalace/rich-text MD malformed)*
- [ ] Load a CSV file — verify it becomes queryable
- [ ] Load a JSON file — verify it becomes queryable
- [x] Switch providers (Ollama ↔ OpenAI) — queries still work
- [x] Save and re-run a spell
- [ ] Check charts render on query results with numeric data
