# Safety Rules

Alchemist’s foremost promise is that it will never modify the user’s data or leak it to external services. This document describes the rules and mechanisms that enforce this promise. All developers and contributors must adhere to these rules when adding or modifying functionality.

## Database Access

1. **Read‑Only Connections**
   - SQLite files must be opened using `SQLITE_OPEN_READONLY` and the optional URI parameter `mode=ro` or `immutable=1` if supported. This prevents any accidental writes even when WAL mode is enabled.
   - When using Postgres or other databases in future versions, create a dedicated read‑only role and restrict privileges to `SELECT`.
   - Never open a database for read/write access from within the application.

2. **Immutable Files**
   - SQLite Write‑Ahead Log (WAL) mode can cause writes to `*-wal` and `*-shm` sidecar files even when the primary database is opened read‑only. To avoid this, either open the database with the `immutable=1` URI parameter or ensure the `-wal` and `-shm` files are accessible and that the file system is set to read‑only.
   - If the user’s environment does not permit an immutable open, display a clear message and ask for explicit confirmation before proceeding. Explain that reading the database will not change table data but may update the WAL checkpoint.

## SQL Generation and Validation

Alchemist uses a local LLM to generate SQL. The output must be validated before execution.

1. **Single Statement**
   - The generated SQL must contain only one logical statement. No semicolons (`;`) are allowed except within string literals.
   - Multiple statements separated by semicolons are rejected outright.

2. **SELECT‑only**
   - Only `SELECT` queries are permitted. Common Table Expressions (`WITH` clauses) are allowed if they culminate in a single `SELECT` statement.
   - Prohibit any `INSERT`, `UPDATE`, `DELETE`, `CREATE`, `DROP`, `ALTER`, `TRUNCATE`, `REPLACE`, `PRAGMA`, `VACUUM`, `ANALYZE`, `ATTACH`, `DETACH` or other write or schema‑altering commands.
   - Disallow function calls that may have side effects or run user‑defined functions.

3. **LIMIT clause**
   - All queries must include a `LIMIT` clause to restrict the number of returned rows. If the LLM output does not contain a limit, the validator should automatically append `LIMIT 1000` (or a configurable default) to the query and inform the user.
   - For exploratory queries (e.g. count aggregates), the row limit may not apply. Use judgement and confirm with the user if needed.

4. **Parameterized Inputs**
   - Do not directly interpolate user input into SQL. Although the LLM generates the query, any variables or dynamic values should be bound as parameters when executed via `rusqlite` to avoid SQL injection risks.

5. **SQL Parser**
   - Use a robust SQL parser (e.g. [sqlparser-rs](https://github.com/sqlparser-rs/sqlparser-rs/?utm_source=chatgpt.com)) to inspect the AST of the generated query. This parser should identify disallowed operations and ensure the query is syntactically valid.
   - If parsing fails or disallowed constructs are found, reject the query and inform the user with a clear error message.

6. **User Confirmation**
   - Always display the generated SQL to the user before execution. Require explicit confirmation via a “Run query” button.
   - Do not auto‑execute queries, even if they meet safety rules, unless the user has opted in to a quick‑run mode.

## Local Model Usage

1. **Local Only**
   - The LLM must run locally (e.g. via Ollama) by default. The app may not send schema information, prompts or data to remote APIs without explicit opt‑in.
   - If remote LLM functionality is added, clearly inform the user which data will be sent and obtain consent.

2. **Prompt Construction**
   - Include only the necessary parts of the schema and the user’s question in the prompt. Do not include actual data values.
   - Do not include any user secrets (file paths, personal data) in the prompt.

3. **Model Safety**
   - The model must be instructed via system prompt to generate only safe SQL (SELECT‑only, single statement, with limit). The Local Model Contract document defines the expected response format.
   - The model response must be parsed for code fences or extraneous text. Only the SQL string should be extracted.

## Error Handling and Messaging

1. **Clear Messages**
   - When rejecting a query, provide a concise explanation (e.g. “Your query contains a `DROP` statement, which is not allowed. Please modify it to use only `SELECT` statements.”).
   - Do not display stack traces or internal error objects to the user. Log technical details to a local file for debugging but surface user‑friendly messages.

2. **Graceful Failures**
   - If the database cannot be opened (e.g. due to insufficient permissions), display an error and allow the user to choose another file.
   - If the LLM fails (e.g. not running), prompt the user to start it or choose another model.

3. **Audit Trail**
   - Record the generated queries and whether they were run or discarded. These logs remain on the user’s machine and can help in debugging or restoring sessions.

## Privacy and Telemetry

1. **No Data Exfiltration**
   - Do not send database contents, schema or prompts to any external service without explicit user consent.
   - If integrating optional analytics (e.g. error reporting), anonymise data and make it opt‑in.

2. **Donation Handling**
   - If the application includes donation or sponsor links, open them in the user’s default browser. Do not embed external trackers in the app itself.

## Future Considerations

1. **Extended Databases**
   - When adding support for Postgres, MySQL or other databases, implement analogous read‑only roles and schema restrictions.
   - Provide migration documentation for users who want to replicate their SQLite data into Postgres for advanced use cases, emphasising that write operations remain disallowed.

2. **Remote LLM Support**
   - Should remote LLM endpoints be supported, include detailed privacy settings where users can select what gets sent. At a minimum, users should choose whether to send table names, column names or both. Data rows should never be sent.
   - Consider proxying remote calls through a privacy‑preserving service that strips metadata.

## Summary

Safety rules underpin Alchemist’s core value: trust. By enforcing read‑only database access, validating SQL, requiring user confirmation and keeping all computations local, we protect user data and maintain a clear boundary between personal information and the outside world. All contributors must consult this document before implementing new features or modifying existing logic.
