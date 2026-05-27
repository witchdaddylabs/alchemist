# Alchemist MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working Alchemist desktop app: a local-first macOS Tauri application that opens SQLite databases in read-only mode, generates safe SQL with either a local Ollama model or bring-your-own-key cloud models, previews SQL before execution, and displays results as tables, summaries, charts, and saved spells.

**Architecture:** Use a standard Tauri v2 layout with a React + TypeScript frontend in the repo root and a Rust backend in `src-tauri/`. Keep database access, LLM communication, SQL validation, local persistence, and cloud-provider secrets in focused Rust modules, and keep the frontend split by feature area so the Vault, Workspace, Results, and Spells flows can evolve independently. Build the MVP around the written specs plus the extracted mockups, including the left navigation, right-side inspector, modal SQL preview, chart dashboard, provider selector, and explicit privacy disclosures when a cloud model is selected.

**Tech Stack:** Tauri v2, React, TypeScript, Vite, Tailwind CSS, shadcn/ui (components + chart via Recharts), Zustand, Zod, Lucide React, Rust, `rusqlite`, `sqlparser-rs`, `reqwest`, `serde`, `keyring`, Vitest, React Testing Library, Playwright, GitHub Actions.

---

## Scope Lock

- MVP includes macOS support only.
- MVP supports SQLite files only.
- MVP supports local Ollama at `http://localhost:11434` plus bring-your-own-key cloud providers.
- MVP cloud providers are OpenAI, OpenAI-compatible endpoints, Anthropic, and Google AI Studio.
- MVP disallows write operations completely.
- MVP requires explicit user confirmation before every query execution.
- MVP stores recent vaults, query history, preferences, and saved spells locally on disk.
- MVP stores provider API keys in the macOS Keychain, never in plain JSON settings files.
- MVP sends only the user question plus filtered schema context to cloud providers; data rows and local file paths are never sent.
- MVP requires explicit opt-in and a visible disclosure before the first cloud request for a provider.
- MVP includes table, summary, and chart result views plus CSV and Markdown export.

## Proposed File Structure

```text
docs/
  product_brief.md
  technical_architecture.md
  safety_rules.md
  local_model_contract.md
  ui_screen_spec.md
  design_system.md
  test_plan.md
  superpowers/plans/2026-04-30-alchemist-mvp.md
mockup_screens/
src/
  main.tsx
  App.tsx
  styles/globals.css
  lib/tauri.ts
  lib/types.ts
  lib/format.ts
  lib/charting.ts
  lib/providers.ts
  state/app-store.ts
  features/vault/VaultScreen.tsx
  features/workspace/WorkspaceScreen.tsx
  features/workspace/SchemaSidebar.tsx
  features/workspace/ChatPanel.tsx
  features/workspace/InspectorPanel.tsx
  features/workspace/CloudDisclosureBanner.tsx
  features/sql-preview/SqlPreviewModal.tsx
  features/results/ResultsPanel.tsx
  features/results/ResultsTable.tsx
  features/results/ResultsCharts.tsx
  features/results/ResultsToolbar.tsx
  features/spells/SpellsScreen.tsx
  features/settings/SettingsScreen.tsx
  features/settings/ProviderSettingsCard.tsx
  components/layout/AppShell.tsx
  components/ui/
src-tauri/
  Cargo.toml
  build.rs
  tauri.conf.json
  capabilities/default.json
  src/main.rs
  src/lib.rs
  src/models.rs
  src/errors.rs
  src/state.rs
  src/db.rs
  src/llm.rs
  src/secret_store.rs
  src/providers/mod.rs
  src/providers/ollama.rs
  src/providers/openai.rs
  src/providers/openai_compatible.rs
  src/providers/anthropic.rs
  src/providers/google_ai_studio.rs
  src/validate.rs
  src/storage.rs
  src/export.rs
  src/commands/mod.rs
  src/commands/app.rs
tests/
  fixtures/ideas_small.sqlite
  fixtures/ideas_large.sqlite
  fixtures/readonly_wal.sqlite
  fixtures/mock_ollama_responses.json
  fixtures/mock_openai_responses.json
  fixtures/mock_anthropic_responses.json
  fixtures/mock_google_ai_studio_responses.json
playwright/
  app.e2e.spec.ts
.github/workflows/ci.yml
package.json
vite.config.ts
vitest.config.ts
tsconfig.json
tailwind.config.ts
postcss.config.js
```

## Decisions To Lock Before Coding

- Use `src-tauri/` instead of `tauri/` so the app matches standard Tauri tooling.
- Use `Vitest` instead of Jest because the frontend will already be on Vite.
- Use `immutable=1` by default when opening SQLite files, and only allow fallback to non-immutable read-only mode after explicit user confirmation.
- Use `LIMIT 1000` as the default enforced row limit.
- Use `shadcn/ui` for the component library system (button, card, dialog, input, table, tabs, etc.) and `shadcn/chart` (which wraps Recharts under the hood) for result charts.
- Use a single-window application with left-nav screen switching instead of multiple Tauri windows.
- Store cloud API keys in macOS Keychain via a Rust secret-store wrapper, not in app JSON files.
- Treat OpenAI-compatible as a configurable OpenAI-family adapter with user-supplied base URL and model name.
- Keep cloud privacy defaults strict: send question plus filtered schema only, never sample rows or filesystem paths.
- Require a one-time per-provider consent acknowledgement before the first cloud request is sent.

### Task 1: Scaffold the Tauri + React Workspace

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `tsconfig.json`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles/globals.css`
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/build.rs`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/capabilities/default.json`
- Create: `src-tauri/src/main.rs`
- Create: `src-tauri/src/lib.rs`

**Done when:**
- `npm install` completes successfully.
- `cargo check --manifest-path src-tauri/Cargo.toml` succeeds.
- `npm run tauri dev` opens a blank but styled shell window.

- [ ] Initialize the Node workspace at repo root with scripts for `dev`, `build`, `test`, `test:e2e`, `tauri dev`, and `tauri build`.
- [ ] Install frontend runtime dependencies.

```bash
npm install @tauri-apps/api clsx lucide-react zod zustand tailwind-merge class-variance-authority
```

- [ ] Install frontend dev dependencies.

```bash
npm install -D @tauri-apps/cli @testing-library/jest-dom @testing-library/react @testing-library/user-event @vitejs/plugin-react playwright tailwindcss postcss autoprefixer typescript vite vitest jsdom
```

- [ ] Initialize shadcn/ui in the project.

```bash
npx shadcn@latest init
```
Select: `New York` style, `Neutral` base color, `Yes` for CSS variables.

- [ ] Add core shadcn components needed for MVP.

```bash
npx shadcn@latest add button card dialog input table tabs badge select separator tooltip
```

- [ ] Add shadcn chart component (wraps Recharts with shadcn theming).

```bash
npx shadcn@latest add chart
```

- [ ] Add a minimal Tauri Rust manifest with `tauri`, `serde`, and `serde_json`, and verify the crate compiles.
- [ ] Add a minimal React entrypoint that mounts `App` and imports `src/styles/globals.css`.
- [ ] Add base design tokens to `src/styles/globals.css` for the dark neon palette defined in the design system.

### Task 2: Create the Shared Contracts and App State Model

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/tauri.ts`
- Create: `src/lib/providers.ts`
- Create: `src/state/app-store.ts`
- Create: `src-tauri/src/models.rs`
- Create: `src-tauri/src/state.rs`
- Modify: `src-tauri/src/lib.rs`

**Done when:**
- Frontend and backend share a stable contract for schema metadata, generated SQL, query results, safety checks, history items, spells, provider settings, and cloud privacy state.
- The app can store UI state without wiring every component directly to Tauri commands.

- [ ] Define shared TypeScript interfaces for the core entities.

```ts
export interface VaultSummary {
  path: string;
  fileName: string;
  tableCount: number;
  lastOpenedAt: string;
  readOnly: boolean;
}

export interface TableSchema {
  name: string;
  columns: ColumnSchema[];
  rowCountPreview?: number;
}

export interface ColumnSchema {
  name: string;
  declaredType: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  foreignKeyTarget?: string;
}

export interface SafetyCheck {
  code: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface GeneratedQuery {
  question: string;
  sql: string;
  checks: SafetyCheck[];
}

export type ModelProviderKind =
  | "ollama"
  | "openai"
  | "openai-compatible"
  | "anthropic"
  | "google-ai-studio";

export interface ProviderConfigSummary {
  provider: ModelProviderKind;
  model: string;
  baseUrl?: string;
  isCloud: boolean;
  apiKeyConfigured: boolean;
}
```

- [ ] Mirror these contracts in Rust `serde` structs in `src-tauri/src/models.rs`.
- [ ] Create a Zustand store with slices for navigation, active vault, schema, chat history, current SQL preview, query results, inspector status, saved spells, provider settings, and cloud consent state.
- [ ] Create a thin Tauri invocation wrapper in `src/lib/tauri.ts` so UI code calls typed helpers instead of raw `invoke`.
- [ ] Add provider label helpers and provider-form defaults in `src/lib/providers.ts`.
- [ ] Register app state and command module wiring in `src-tauri/src/lib.rs`.

### Task 3: Build Local Storage and Secure Secret Storage

**Files:**
- Create: `src-tauri/src/storage.rs`
- Create: `src-tauri/src/secret_store.rs`
- Modify: `src-tauri/src/errors.rs`
- Modify: `src-tauri/src/models.rs`
- Modify: `src-tauri/src/commands/app.rs`
- Test: `src-tauri/tests/storage_tests.rs`
- Test: `src-tauri/tests/secret_store_tests.rs`

**Done when:**
- The app persists recent vaults, non-secret settings, chat history metadata, and spells to the app data directory.
- Cloud provider API keys are stored and retrieved securely from the macOS Keychain.
- Corrupt JSON fails gracefully with a user-facing recovery path.

- [ ] Define on-disk JSON models for `settings.json`, `recent_vaults.json`, `history.json`, and `spells.json`, making sure provider API keys are excluded.
- [ ] Implement load-or-default helpers so a missing file returns an empty collection instead of an error.
- [ ] Implement atomic save helpers that write to a temp file and then rename to reduce corruption risk.
- [ ] Implement a `SecretStore` wrapper over macOS Keychain operations so tests can substitute an in-memory fake backend.
- [ ] Add Tauri commands for `load_app_state`, `save_spell`, `delete_spell`, `load_spells`, `load_recent_vaults`, `clear_history`, `save_provider_api_key`, `delete_provider_api_key`, and `get_provider_secret_status`.
- [ ] Add tests for first-run empty state, successful save/load, and malformed JSON recovery.
- [ ] Add tests for saving, overwriting, deleting, and status-checking API keys without writing them into the JSON settings fixtures.

### Task 4: Implement Read-Only SQLite Opening and Schema Introspection

**Files:**
- Create: `src-tauri/src/db.rs`
- Modify: `src-tauri/src/models.rs`
- Modify: `src-tauri/src/commands/app.rs`
- Test: `src-tauri/tests/db_open_tests.rs`
- Test: `src-tauri/tests/schema_tests.rs`
- Test: `tests/fixtures/ideas_small.sqlite`
- Test: `tests/fixtures/readonly_wal.sqlite`

**Done when:**
- The user can open `.db`, `.sqlite`, and `.sqlite3` files.
- Databases open with read-only flags.
- The app returns a browsable schema with tables, columns, and foreign keys.

- [ ] Open SQLite using `SQLITE_OPEN_READONLY | SQLITE_OPEN_URI` and construct a URI with `mode=ro&immutable=1`.
- [ ] If immutable mode fails, return a structured warning that the frontend can surface before attempting a fallback open.
- [ ] Query `sqlite_master`, `PRAGMA table_info`, and `PRAGMA foreign_key_list` to build schema models.
- [ ] Include lightweight metadata used by the inspector panel: file name, path, SQLite version, table count, and file size.
- [ ] Add tests for valid open, invalid path, unsupported extension, immutable fallback warning, reserved column names, and composite-key schemas.

### Task 5: Implement Multi-Provider LLM Clients and Prompt Construction

**Files:**
- Create: `src-tauri/src/llm.rs`
- Create: `src-tauri/src/providers/mod.rs`
- Create: `src-tauri/src/providers/ollama.rs`
- Create: `src-tauri/src/providers/openai.rs`
- Create: `src-tauri/src/providers/openai_compatible.rs`
- Create: `src-tauri/src/providers/anthropic.rs`
- Create: `src-tauri/src/providers/google_ai_studio.rs`
- Modify: `src-tauri/src/models.rs`
- Modify: `src-tauri/src/commands/app.rs`
- Test: `src-tauri/tests/llm_tests.rs`
- Test: `tests/fixtures/mock_ollama_responses.json`
- Test: `tests/fixtures/mock_openai_responses.json`
- Test: `tests/fixtures/mock_anthropic_responses.json`
- Test: `tests/fixtures/mock_google_ai_studio_responses.json`

**Done when:**
- The backend can call local Ollama or a selected cloud provider, send a constrained prompt, and extract SQL from the provider response.
- The frontend can show model availability and provider status in the inspector panel.

- [ ] Create a shared provider configuration model for provider kind, base URL, selected model, timeout, temperature, cloud/privacy flags, and consent state.
- [ ] Implement a prompt builder that includes only relevant tables and columns plus the local model contract instructions, and strips local file paths and row data before any cloud request.
- [ ] Create a provider abstraction in `src-tauri/src/providers/mod.rs` that normalizes SQL generation into one backend interface regardless of provider.
- [ ] Add an Ollama health check command that pings `http://localhost:11434/api/tags` and returns available model names.
- [ ] Implement OpenAI and OpenAI-compatible adapters that accept a user API key, configured model, and optional custom base URL, then normalize the returned SQL text into the shared response shape.
- [ ] Implement Anthropic and Google AI Studio adapters that accept a user API key and configured model, then normalize the returned SQL text into the shared response shape.
- [ ] Add a `generate_sql` command that routes to the selected provider, enforces cloud-consent checks, and extracts SQL from fenced ```sql blocks or plain text responses.
- [ ] Return structured errors for offline Ollama, missing API key, bad base URL, auth failure, rate limit, timeout, invalid JSON, and empty SQL output.
- [ ] Add tests with a mock HTTP server for Ollama health checks, provider-specific request mapping, fenced SQL extraction, plain SQL extraction, consent gating, and cloud auth failure messaging.

### Task 6: Implement SQL Safety Validation

**Files:**
- Create: `src-tauri/src/validate.rs`
- Modify: `src-tauri/src/models.rs`
- Modify: `src-tauri/src/commands/app.rs`
- Test: `src-tauri/tests/validate_tests.rs`

**Done when:**
- Every generated or user-edited query is validated before execution.
- Unsafe queries are blocked with detailed check results for the preview modal.

- [ ] Parse SQL with `sqlparser-rs` and reject multi-statement input, disallowed AST nodes, `PRAGMA`, write operations, and side-effecting constructs.
- [ ] Normalize semicolon handling so the app allows at most one trailing semicolon but never multiple statements.
- [ ] If no `LIMIT` is present and the query is not a pure aggregate, append `LIMIT 1000` and return a note that the query was amended.
- [ ] Return a full list of checks matching the SQL preview mockup.

```ts
[
  { code: "readonly", label: "Read-only connection", passed: true, detail: "Database opened with mode=ro and immutable=1." },
  { code: "single_statement", label: "Single SQL statement", passed: true, detail: "Exactly one statement detected." },
  { code: "select_only", label: "SELECT-only query", passed: true, detail: "No modifying or schema-changing operations found." },
  { code: "dangerous_keywords", label: "No dangerous keywords detected", passed: true, detail: "Blocked keywords not present." },
  { code: "limit", label: "Limit clause detected", passed: true, detail: "LIMIT 1000 applied." }
]
```

- [ ] Add tests for valid SELECT, valid CTE, `DELETE`, `DROP`, `PRAGMA`, multiple semicolons, missing limit, aggregate queries, and user-edited invalid SQL.

### Task 7: Implement Query Execution, Result Serialization, and Export

**Files:**
- Create: `src-tauri/src/export.rs`
- Modify: `src-tauri/src/db.rs`
- Modify: `src-tauri/src/models.rs`
- Modify: `src-tauri/src/commands/app.rs`
- Test: `src-tauri/tests/query_tests.rs`
- Test: `src-tauri/tests/export_tests.rs`

**Done when:**
- Valid SQL can be executed against the active vault.
- Results are returned in a frontend-friendly shape for tables and charts.
- CSV and Markdown export work from the results toolbar.

- [ ] Implement `run_query` to execute validated SQL and serialize rows into `{ columns, rows, rowCount, elapsedMs }`.
- [ ] Add a hard cap for initial rendering at 1000 rows and expose `truncated: true` when more rows exist.
- [ ] Map SQLite values into JSON-safe scalars with predictable date/text handling.
- [ ] Implement `export_results_csv` and `export_results_markdown` using the system save dialog.
- [ ] Add tests for numeric values, nulls, ISO timestamps, large result truncation, and export file contents.

### Task 8: Build the Application Shell and Design System Foundations

**Files:**
- Create: `src/components/layout/AppShell.tsx`
- Create: `src/components/ui/Button.tsx`
- Create: `src/components/ui/Card.tsx`
- Create: `src/components/ui/Input.tsx`
- Create: `src/components/ui/Modal.tsx`
- Create: `src/components/ui/Badge.tsx`
- Create: `src/components/ui/Tabs.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles/globals.css`
- Test: `src/components/ui/__tests__/Button.test.tsx`

**Done when:**
- The application matches the visual direction in the design system and mockups.
- The global shell includes the left navigation with `Vaults`, `Spells`, and `Settings`.

- [ ] Add CSS variables for `bg-base`, `bg-panel`, `bg-hover`, `text-primary`, `text-secondary`, `accent-purple`, `accent-magenta`, `accent-blue`, `accent-green`, and `error-red`.
- [ ] Add typography tokens for headings, body text, and monospaced SQL text.
- [ ] Implement reusable buttons, cards, badges, modal, and tabs with keyboard focus states.
- [ ] Build the left navigation shell matching the mockups, including brand mark, active item styling, and status footer area.
- [ ] Add one smoke test that verifies primary and ghost buttons render with accessible labels.

### Task 9: Build the Vault Screen and Recent Vault Flow

**Files:**
- Create: `src/features/vault/VaultScreen.tsx`
- Modify: `src/state/app-store.ts`
- Modify: `src/lib/tauri.ts`
- Test: `src/features/vault/__tests__/VaultScreen.test.tsx`

**Done when:**
- First launch shows the welcome screen with trust strip.
- Users can open a vault from file picker, drag-and-drop, or recent list.

- [ ] Build the centered welcome layout with app title, tagline, primary open button, drag target, and trust strip badges.
- [ ] Wire the open button to the Tauri file dialog restricted to `.db`, `.sqlite`, and `.sqlite3`.
- [ ] Add drag-and-drop handling for the same file types and reject unsupported files with a clear error.
- [ ] Render recent vault cards with file name, table count, last-opened timestamp, and read-only badge.
- [ ] Add tests for first-run empty state, recent vault rendering, and drag target highlight state.

### Task 10: Build the Main Workspace, Schema Sidebar, Chat Flow, and Inspector

**Files:**
- Create: `src/features/workspace/WorkspaceScreen.tsx`
- Create: `src/features/workspace/SchemaSidebar.tsx`
- Create: `src/features/workspace/ChatPanel.tsx`
- Create: `src/features/workspace/InspectorPanel.tsx`
- Modify: `src/state/app-store.ts`
- Test: `src/features/workspace/__tests__/SchemaSidebar.test.tsx`
- Test: `src/features/workspace/__tests__/ChatPanel.test.tsx`

**Done when:**
- The core three-panel workspace matches the specs and mockups.
- Users can browse schema, ask a question, and see generated SQL before running it.

- [ ] Build the schema sidebar with searchable table tree, column type labels, and click-to-insert table names into the prompt box.
- [ ] Build the chat panel with history entries, loading state, collapsible SQL preview entry, and action buttons for run, edit, discard, and save spell.
- [ ] Build the inspector panel with database metadata, path, SQLite version, table count, selected model, provider status, cloud/local badge, and safety summary.
- [ ] Add a cloud disclosure banner near the prompt entry when a remote provider is active, summarizing exactly what will be sent.
- [ ] Add Enter-to-submit and Shift+Enter-for-newline behavior to the prompt input.
- [ ] Persist chat history metadata after generation and after execution.
- [ ] Add tests for search filtering, click-to-insert table names, loading state, action button rendering, and cloud disclosure visibility.

### Task 11: Build the SQL Preview Modal and Real-Time Validation Flow

**Files:**
- Create: `src/features/sql-preview/SqlPreviewModal.tsx`
- Modify: `src/features/workspace/ChatPanel.tsx`
- Modify: `src/state/app-store.ts`
- Test: `src/features/sql-preview/__tests__/SqlPreviewModal.test.tsx`

**Done when:**
- Generated SQL opens in a modal preview with safety checklist and primary Run button.
- User edits trigger fresh validation before execution.

- [ ] Build the modal layout shown in the mockup: title, close button, scrollable code block, safety checklist, and footer actions.
- [ ] Add an editable SQL textarea using the monospaced token and a row limit control if the query needs adjustment.
- [ ] Re-run validation every time the SQL changes and disable `Run Query` when any critical check fails.
- [ ] Surface validator amendments such as auto-added `LIMIT 1000` so the user knows the final query text.
- [ ] When a cloud provider is active, show the selected provider and a short reminder that the question plus filtered schema were sent using the user-supplied API key.
- [ ] Add tests for passing checks, failing checks, disabled run state, and edit-confirm flow.

### Task 12: Build the Results Table, Summary, Charts, and Export Toolbar (using shadcn/ui)

**Files:**
- Create: `src/features/results/ResultsPanel.tsx`
- Create: `src/features/results/ResultsTable.tsx`
- Create: `src/features/results/ResultsCharts.tsx`
- Create: `src/features/results/ResultsToolbar.tsx`
- Test: `src/features/results/__tests__/ResultsPanel.test.tsx`
- Test: `src/features/results/__tests__/ResultsCharts.test.tsx`

**Done when:**
- Query results render in table, summary, and chart tabs without re-running the query.
- Chart availability follows deterministic rules based on result column types.

- [ ] Build a toolbar using shadcn `Button` components showing row count, elapsed time, active query label, and export buttons.
- [ ] Build a sortable, scrollable table using shadcn `Table` component with sticky headers, right-aligned numeric cells, and full-value tooltip behavior.
- [ ] Add a basic summary view for MVP that reports row count, truncation state, and obvious aggregates when present.
- [ ] Build chart eligibility helpers that determine when shadcn/chart bar, line, and pie variants should be offered.
- [ ] Render charts via shadcn/chart with dark-theme styling matching the Alchemist neon palette and graceful empty messaging when charting is not possible.
- [ ] Add tests for table rendering, truncation banner, chart tab visibility, and export button callbacks.

### Task 13: Build Saved Spells and Settings Screens

**Files:**
- Create: `src/features/spells/SpellsScreen.tsx`
- Create: `src/features/settings/SettingsScreen.tsx`
- Create: `src/features/settings/ProviderSettingsCard.tsx`
- Modify: `src/state/app-store.ts`
- Modify: `src/lib/tauri.ts`
- Test: `src/features/spells/__tests__/SpellsScreen.test.tsx`
- Test: `src/features/settings/__tests__/SettingsScreen.test.tsx`

**Done when:**
- Users can save, search, edit, delete, and run spells.
- Users can inspect and configure local and cloud model connections, provider secrets, privacy defaults, and safety defaults.

- [ ] Build the spells screen as a searchable list of saved prompts with title, description, tags, last-run metadata, usage count, and run/edit actions.
- [ ] Add a save-spell flow from chat history and results screens.
- [ ] Add spell edit and delete dialogs with validation for name and SQL safety.
- [ ] Build provider settings cards for Local Ollama, OpenAI, OpenAI-compatible, Anthropic, and Google AI Studio, including model name, connection status, and API-key presence.
- [ ] For OpenAI-compatible, add fields for custom base URL and model name with validation before save.
- [ ] Add privacy controls for cloud mode that let users choose whether table names, column names, or both are sent, while keeping row data disabled and non-configurable.
- [ ] Add one-time cloud consent UI that clearly states the question and selected schema metadata will be sent to the chosen provider with the user's own key.
- [ ] Build settings for quick-run toggle defaulting to off, export preferences, and provider selection.
- [ ] Add tests for spell search, run action, delete confirmation, provider settings persistence, key-presence indicators, and privacy-control state.

### Task 14: Add Keyboard Shortcuts, Error Handling, and Accessibility Pass

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/features/vault/VaultScreen.tsx`
- Modify: `src/features/workspace/WorkspaceScreen.tsx`
- Modify: `src/features/sql-preview/SqlPreviewModal.tsx`
- Modify: `src/features/results/ResultsPanel.tsx`
- Test: `src/__tests__/accessibility-shortcuts.test.tsx`

**Done when:**
- The app supports the shortcuts defined in the screen spec.
- Core flows are keyboard navigable with visible focus states.
- Errors are user-friendly and actionable.

- [ ] Add shortcuts for `CmdOrCtrl+O`, `CmdOrCtrl+Enter`, `CmdOrCtrl+S`, and `CmdOrCtrl+L`.
- [ ] Add focus management for modal open and close, sidebar navigation, and results tabs.
- [ ] Add clear UI messaging for failed DB open, unsafe SQL, offline Ollama, missing API key, auth failure, rate limit, timeout, and export failures.
- [ ] Add ARIA labels to custom controls such as chart tabs, side navigation, and icon-only actions.
- [ ] Add tests for keyboard navigation and shortcut dispatch.

### Task 15: Build Automated Test Fixtures and Coverage Gates

**Files:**
- Create: `src-tauri/tests/db_open_tests.rs`
- Create: `src-tauri/tests/schema_tests.rs`
- Create: `src-tauri/tests/llm_tests.rs`
- Create: `src-tauri/tests/validate_tests.rs`
- Create: `src-tauri/tests/query_tests.rs`
- Create: `src-tauri/tests/export_tests.rs`
- Create: `src-tauri/tests/secret_store_tests.rs`
- Create: `src/features/vault/__tests__/VaultScreen.test.tsx`
- Create: `src/features/workspace/__tests__/ChatPanel.test.tsx`
- Create: `src/features/results/__tests__/ResultsPanel.test.tsx`
- Create: `playwright/app.e2e.spec.ts`
- Create: `tests/fixtures/ideas_large.sqlite`

**Done when:**
- Unit, integration, and E2E tests cover the critical MVP safety and UX flows.
- Coverage tooling is wired into CI.

- [ ] Add Rust tests for schema parsing, read-only open behavior, prompt generation, secret storage, provider routing, validation, query execution, and export formatting.
- [ ] Add frontend tests for Vault, Workspace, SQL preview, Results, Spells, and Settings screens.
- [ ] Add Playwright coverage for first launch, open database, ask question, safety rejection, edit SQL, save spell, large result truncation, chart rendering, Ollama offline, cloud provider setup, cloud consent, cloud auth failure, and keyboard accessibility.
- [ ] Add mock provider server utilities for Ollama, OpenAI-family, Anthropic, and Google AI Studio deterministic E2E runs.
- [ ] Set coverage thresholds at 80 percent for Rust core modules and frontend feature modules.

### Task 16: Wire CI, Packaging, and Release Readiness

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `README.md`
- Create: `docs/release-checklist.md`
- Modify: `package.json`
- Modify: `src-tauri/tauri.conf.json`

**Done when:**
- Every pull request runs lint, unit, integration, and E2E checks.
- macOS builds can be produced repeatably for internal testing.

- [ ] Add CI jobs for frontend unit tests, Rust tests, and Playwright E2E on macOS.
- [ ] Cache Node and Cargo dependencies in GitHub Actions.
- [ ] Add a `README.md` with local setup for Node, Rust, Tauri prerequisites, Ollama, and bring-your-own-key cloud providers.
- [ ] Add a release checklist covering app signing, smoke testing, fixture verification, and rollback steps.
- [ ] Produce one internal macOS build and verify the packaged app can open fixtures, talk to local Ollama, and complete a cloud request flow with a user-supplied key in a test environment.

## Cross-Check Against Specs and Mockups

- The Vault screen is covered by Tasks 8 and 9.
- The three-panel Workspace screen is covered by Tasks 10 and 11.
- The SQL Preview modal and safety checklist are covered by Task 11.
- The chart dashboard and export toolbar are covered by Task 12.
- Saved Spells are covered by Task 13.
- Read-only DB access, local and cloud model usage, secure BYOK storage, and SQL validation are covered by Tasks 3, 4, 5, and 6.
- Test plan requirements are covered by Tasks 15 and 16.

## Open Questions To Resolve During Task 1

- Choose the default Ollama model name to show on first launch.
- Choose the default model names to prefill for OpenAI, Anthropic, and Google AI Studio.
- Decide whether the chat history should store only SQL metadata or also cached result previews.
- Decide whether non-immutable read-only fallback is allowed for MVP or deferred until v0.2.
- Decide whether the summary tab stays rule-based in MVP or includes any model-generated narrative.
- Decide whether cloud-consent acknowledgement is one-time per provider or re-confirmed after each provider-settings change.

## Suggested Execution Order

- Complete Tasks 1 through 3 before any UI work.
- Complete Tasks 4 through 7 before wiring the full chat-to-results flow.
- Complete Tasks 8 through 13 to build the product surface area in the same order users experience it.
- Complete Tasks 14 through 16 before calling the MVP ready for external testing.
