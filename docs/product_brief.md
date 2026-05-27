# Product Brief: Alchemist

## Background

In the Witch Daddy Labs ecosystem, data lives in many places — local SQLite databases for ideas and experiments, ChromaDB vector stores for MemPalace's semantic memory, and YAML configs for palace structure. When people want to interrogate their own data — "Which app ideas mention local-first workflows?", "Find passages about Paris across all manuscripts", "Show me the structure of my palace wings" — they face a major bottleneck: each data source requires a different tool, a different mental model, and often writing queries by hand. This friction stops many from exploring patterns and opportunities hidden in their own data.

**Alchemist** addresses this problem by offering a privacy-preserving macOS application that lets users open local data sources and ask questions in plain language. It understands SQLite databases, ChromaDB vector stores, and structured config files — and routes each question to the right engine. The entire workflow happens on the user's machine, with no requirement to sign up, send data over a network, or run a separate server. The product is open source and funded through optional donations rather than subscriptions.

## Goals

- Enable indie developers, writers, and creators to extract insights from their local data without writing queries.
- Respect privacy: data never leaves the user's machine and the software runs offline by default.
- Support multiple local data sources: SQLite tables, ChromaDB vector embeddings, and structured config formats like YAML.
- Provide a polished, witchy hacker aesthetic consistent with Witch Daddy Labs: dark backgrounds, neon accents, clean typography.
- Maintain simplicity: read-only everywhere, no accounts, no cloud dependency.
- Build a community-driven open-source tool that people can extend; revenue comes from voluntary donations rather than mandatory fees.

## Target Users

- **Indie builders and coders** who keep notes, prototypes and brainstorms in local databases and want to query them quickly.
- **Writers and world-builders** using MemPalace who want to search their lore, canon, and manuscripts by meaning, not just keywords.
- **Creative designers and product strategists** who organise idea vaults or research in local data stores and need an approachable way to explore patterns.
- **Privacy-conscious users** who refuse to upload their proprietary data to cloud services or third-party APIs.

## Problems and Pain Points

- **SQL intimidation:** Many creative users are not fluent in SQL; writing queries is time-consuming and error-prone.
- **Tool overhead:** General-purpose database GUIs (e.g., DBeaver, DataGrip) are heavy, require manual configuration and feel overkill for personal archives.
- **Privacy concerns:** Cloud-based "chat with your data" services send table schemas and query context to remote servers, which is unacceptable for proprietary or sensitive content.
- **Fragmented tooling:** Different data sources (SQLite, ChromaDB, YAML configs) each need different tools — there's no single UI for all your local data.
- **UX friction:** Existing tools treat chat-based BI like a SaaS dashboard builder; they feel business-oriented rather than personal.

## Solution Overview

Alchemist is a native macOS application that:

1. **Opens local data sources** — SQLite files (`.db`/`.sqlite`), ChromaDB persistence directories (vector stores), and structured config files (YAML).
2. **Introspects the structure** — tables, columns, vector collections, document counts, config hierarchies — all displayed in a side panel.
3. **Provides a chat console** where users ask questions in natural language. The query is routed to the right engine: SQL generation for databases, vector search for embeddings, structured queries for configs.
4. **Generates queries** using a local LLM (via Ollama). For SQLite: generates safe, read-only SQL. For ChromaDB: generates embedding search queries. For YAML: generates structured filters.
5. **Previews the query** before it runs. Users see the generated SQL/search/filter and can edit or decline.
6. **Executes in read-only mode** against the data source; the app rejects any destructive operations.
7. **Displays results** in a table, summary, or relevance-ranked list with optional charts.
8. **Saves query history and reusable prompts** ("spells") so users can repeat or modify previous questions.
9. **Lives fully offline**; nothing is sent to remote services unless the user explicitly opts in to a cloud model.

## Unique Differentiators

- **Multi-source intelligence:** Understands SQLite, ChromaDB, and YAML in one tool — not just one database format.
- **Local-first:** Runs entirely on the user's machine; no network calls are needed.
- **Read-only safety:** Prevents destructive operations and ensures local data remains unchanged.
- **Polished, magical aesthetic:** Inspired by tools like Cursor, Replit and dark hacker themes, but with a neon witchy twist.
- **Open source and donation-funded:** Encourages community contributions without locking core functionality behind subscriptions.
- **Narrow focus on personal data exploration:** Not a BI platform — a thoughtful tool for your own local data.

## High-Level Feature List

- Open/read-only SQLite database files.
- Open/read-only ChromaDB persistence directories.
- Parse and navigate YAML configuration files.
- Schema/collection/struct inspection panels with plain-English hints.
- Natural language chat interface for SQL generation, vector search, and structural queries.
- Local LLM integration (Ollama) for all query types.
- Query preview with edit/cancel options for all data sources.
- Safe query execution layer (SELECT-only, read-only, bounded).
- Results displayed as tables, summaries, relevance-ranked lists, and basic charts.
- Saved "spells" for repeating useful queries.
- Dark/neon UI with customisable themes.
- Optional donation link within the app and GitHub Sponsors integration.

## Constraints and Non-Goals

- **No write operations:** Alchemist does not allow INSERT, UPDATE, DELETE, schema modifications, or any data mutation.
- **No cloud requirement:** MVP runs without an Internet connection. Only future extensions may offer remote LLMs.
- **No multi-user features:** There is no team collaboration; the app is meant for personal use.
- **No enterprise dashboards:** Alchemist is not a BI platform and does not implement complex visualisations beyond simple charts.

## Success Metrics

- **User adoption:** Number of downloads or clones on GitHub; contributions and stars.
- **Query success rate:** Percentage of natural-language questions that produce correct query results.
- **Safety integrity:** Zero incidents of unintended data modifications or data leaks.
- **Donation conversion:** Percentage of users who voluntarily support the project financially.
- **Community engagement:** Number of pull requests/issues and quality of contributions.

## Roadmap (high level)

1. **MVP (v0.1):** macOS app with SQLite support, local model integration, basic charts, saved queries.
2. **v0.2:** ChromaDB vector search + MemPalace integration — query your palace by meaning, browse structure, combined results.
3. **v0.3:** Postgres/Supabase read-only support; plugin architecture for other database types.
4. **v1.0:** Signed builds, auto-update mechanism, cross-platform (Windows/Linux) support, optional remote LLM integration.
