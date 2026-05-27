# Technical Architecture

This document describes the major components and interactions within the Alchemist application. It clarifies the technology stack, how data flows through the system, and key design decisions that ensure the product's goals of privacy, safety and simplicity.

## Overview

Alchemist is a native macOS desktop application built using **Tauri v2**. The frontend is a React application compiled to static assets and served through Tauri's webview. The backend runs in Rust and exposes commands that the frontend can call.

Alchemist supports **multiple local data sources** — not just SQLite. It can open SQLite databases in read-only mode, connect to ChromaDB for vector/semantic search, and parse structured config files like YAML. Together this makes it a universal **local data intelligence tool** — ask questions in plain English and get answers from whatever local data you have, whether it's tables, embeddings, or configuration files.

A locally running large language model (LLM) is accessed over HTTP via the Ollama API. The app operates entirely offline by default.

```
┌───────────────┐     ┌─────────────────────────────┐     ┌────────────────────┐
│   React UI    │ ←→ │  Tauri command interface    │ ←→ │  Rust core         │
└───────────────┘     └─────────────────────────────┘     └────────────────────┘
       │                    │                            │          │
       ▼                    ▼                            ▼          ▼
  HTML/CSS/JS        Tauri APIs                   SQLite (RO)    ChromaDB
                                               + Ollama (LLM)   + YAML parser
                                               + Local LLM       + File scanner
```

### Technology stack

- **Tauri v2** — Lightweight framework for building desktop apps using web technologies. It allows us to ship a single binary with a small footprint and integrate Rust code for performance-critical database access and local AI. The `tauri://` protocol is used to call backend commands.

- **React & TypeScript** — The user interface is built with React to manage state and components. TypeScript helps catch type errors during development. The UI uses a custom design system (see the Design System document).

- **Tailwind CSS** — Utility-first CSS library used to implement the dark/neon theme. It provides a consistent spacing scale and responsive design tokens.

- **Rust** — The core logic runs in Rust for safety and performance. Responsibilities include:
  - Opening SQLite files in read-only mode using `rusqlite` with flags `SQLITE_OPEN_READONLY` and `SQLITE_OPEN_URI`.
  - Introspecting database schemas (tables, columns, indexes, foreign keys).
  - Connecting to ChromaDB for vector/semantic search over embedded content.
  - Parsing YAML configuration files (e.g. MemPalace palace structure).
  - Serialising schema information for the LLM prompt.
  - Validating generated SQL to enforce safety rules.
  - Executing queries and streaming results back to the UI.
  - Managing local state (recent databases, saved spells, preferences) via file-based storage (e.g. JSON in the app data directory).

- **Ollama (Local LLM)** — The local model runs as a separate service on the user's machine. The app communicates with the model over HTTP (e.g. `http://localhost:11434/api/generate`). We do not embed the model in the binary, so users can run any supported LLM (Qwen, Codestral, etc.).

- **Component library** — We use [shadcn/ui](https://ui.shadcn.com) for all UI components (buttons, cards, dialogs, inputs, tables, tabs, etc.), including charts via `shadcn/chart` which wraps Recharts with the Alchemist neon palette. Charts run in the frontend; data is passed as JSON from the Rust core.

### Data flow — SQLite query path

1. **Open Database** — The user selects or drags a SQLite file. The frontend calls a Tauri command (e.g. `open_db(file_path)`), which opens the database in read-only mode. The Rust core reads the schema and returns it to the frontend.
2. **Display Schema** — The frontend shows a hierarchical view of tables and columns. A metadata layer attempts to infer column types and provide hints (e.g. by analysing sample values).
3. **Ask Question** — The user enters a natural-language prompt. The frontend collects context (question and relevant parts of the schema) and sends it to the backend command `generate_sql(question, schema)`.
4. **Generate SQL via LLM** — The Rust core constructs a prompt for the local LLM (described in the Local Model Contract document), sends it over HTTP to the LLM, and receives the generated SQL.
5. **Validate SQL** — The Rust core uses a SQL parser (e.g. `sqlparser-rs`) to ensure the query contains a single SELECT/CTE statement, no semicolons, no PRAGMAs and a row limit. If invalid, an error is returned.
6. **Preview SQL** — The validated SQL is sent to the frontend. The user can edit or cancel. If they approve, the frontend calls `run_query(sql)`.
7. **Execute Query** — The Rust core executes the query against the opened database using `rusqlite` in read-only mode, streams the results, and returns them to the frontend as JSON.
8. **Display Results** — The frontend displays the results in a table, along with optional summary and charts. The query and its result metadata are stored in the query history.
9. **Save Spells** — Users can save successful prompts and associated SQL under custom names. These are stored in a JSON file in the app data directory.

### Data flow — ChromaDB / vector search path

1. **Open Palace** — The user points Alchemist at a ChromaDB persistence directory (e.g. `~/.mempalace/palace/`). The Rust core opens a read-only ChromaDB client.
2. **Display Collections** — The frontend shows available vector collections (e.g. "hermes", "writing_projects") and their document counts.
3. **Ask Question** — The user asks a natural-language question. The prompt is sent to the local LLM, which converts it into an embedding search query string.
4. **Vector Search** — The ChromaDB client performs a similarity search against the selected collection, returning the top-N matching documents with scores.
5. **Display Results** — Results are shown with similarity confidence, source paths, and excerpt snippets — same results UI as SQL queries but optimised for semantic relevance.

### Data flow — YAML / config inspection path

1. **Open Config** — The user opens a `.yaml` file (e.g. `mempalace.yaml`). The Rust core parses the YAML into a structured tree.
2. **Display Structure** — The frontend renders the parsed hierarchy: wings, rooms, keywords, metadata.
3. **Ask Question** — The user asks structural questions like "Which wing has the most rooms?" or "Show me everything tagged with 'writing'."
4. **Query** — The LLM generates a filter/query against the in-memory YAML tree (no SQL needed), and the Rust core returns the matched structure.
5. **Display Results** — Results show the matched config nodes with context.

### Module breakdown

- **frontend/** — React components, pages, state management and Tailwind classes. It includes a schema browser, chat console, SQL editor, results viewer, chart components, spell manager, settings pages, and a palace/vector-search viewer.
- **tauri/src/** — Rust sources for Tauri commands. Key modules:
  - `db.rs` — Opening SQLite databases, schema introspection, query execution.
  - `chroma.rs` — Read-only ChromaDB client for vector/semantic search.
  - `palace.rs` — MemPalace-specific helpers: YAML config parsing, palace structure navigation, combined SQL + vector queries.
  - `llm.rs` — Communicating with the local LLM service, constructing prompts, receiving SQL.
  - `validate.rs` — SQL safety validation functions.
  - `storage.rs` — Reading/writing configuration, recent files, saved spells.
  - `errors.rs` — Unified error handling.

### Security and Privacy

- **Read-only everywhere** — SQLite connections use `SQLITE_OPEN_READONLY`. ChromaDB connections are read-only. YAML parsing never writes.
- **SQL validation** — Before execution, the generated SQL is parsed and must meet the safety rules defined in the Safety Rules document.
- **Local LLM only** — The app is compiled without any network access by default. The only HTTP calls are to the local host. Optional remote LLM support will require explicit opt-in and a separate module.
- **No telemetry** — Alchemist does not send usage analytics. If donation tracking is implemented, it will be opt-in.
- **Sandboxing** — The Rust core runs within the Tauri sandbox; file system access is limited to user-selected files and the app data directory.

### Future extensions

- **Database connectors** — Additional commands can be added to support Postgres, MySQL or CSV/Parquet. Each connector must implement the same read-only contract.
- **Plugin system** — A plugin architecture may allow the community to extend the app with custom visualisations, data transformations or export formats.
- **Remote LLM** — A pluggable LLM client could allow connecting to remote models (e.g. OpenAI, Azure) with strict privacy boundaries and explicit consent.
- **Cross-palace search** — Combining vector search across multiple MemPalace wings simultaneously with SQL-level metadata filtering.
