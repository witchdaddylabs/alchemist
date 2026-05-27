# Local Model Contract

Alchemist uses a local large language model (LLM) to translate natural‑language questions into safe SQL queries. This document defines the contract between the application and the LLM. It covers how prompts are constructed, the expected response format, and safety constraints. Adhering to this contract ensures consistent behaviour across different local models (e.g. Qwen, Codestral) and safeguards against unintended behaviour.

## Model Assumptions

- The LLM is hosted locally via Ollama or a similar framework that exposes a REST API for text generation.
- The model understands English instructions and can generate SQL for SQLite databases.
- The model does not have internet access; it can only use the information provided in the prompt.
- The model is expected to follow system prompts that impose safety rules (no destructive queries, single statements, limited rows).

## Prompt Structure

When the user asks a question, Alchemist constructs a prompt with three parts:

1. **System instructions** — A directive that defines the model’s role, safety constraints and response format.
2. **Schema context** — A plain‑text description of the relevant tables and columns, including inferred relationships (e.g. foreign keys) and data types.
3. **User question** — The natural‑language question provided by the user.

### System instructions example

```
You are a helpful assistant that writes safe, read‑only SQLite queries.
Your task is to generate a single SQL statement to answer the user’s question based on the provided schema.
Constraints:
- Produce exactly one SQL query. Do not write explanations.
- Use only SELECT statements or common table expressions (WITH ... SELECT).
- Do not use INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, PRAGMA or other modifying commands.
- Include a LIMIT clause to restrict the number of rows returned to 1000 unless the user’s question clearly requires an aggregate (e.g. COUNT). If a LIMIT already exists, respect it.
- Qualify column names with their table names to avoid ambiguity.
- Do not select all columns with *. Select only the columns necessary to answer the question.
Respond only with the SQL code in a fenced code block like this:
```sql
SELECT ...
```
Do not wrap the code in any additional text.
```

### Schema context example

```
The database has the following tables:

Table ideas:
- id (INTEGER, primary key)
- title (TEXT) — the name of the idea
- summary (TEXT)
- tags (TEXT) — comma‑separated labels
- created_at (TEXT) — ISO 8601 timestamp

Table themes:
- id (INTEGER, primary key)
- name (TEXT)

Table idea_themes:
- idea_id (INTEGER) — references ideas.id
- theme_id (INTEGER) — references themes.id
```

The schema description should include only the tables and columns relevant to the current question (the front‑end can determine relevance by analysing referenced table names and keywords). Limiting the schema context reduces prompt size and potential hallucination.

### User question

The user’s question is appended after the schema context, separated by a delimiter (e.g. “### Question:”). The question is the exact text entered by the user.

## Expected Response Format

The model must respond with a code block containing only SQL. The preferred format is:

```
```sql
SELECT ...
```
```

Outside of the fenced code block there should be no explanatory text. The application will parse the code block and extract the SQL query. If no code block is found, the entire response is treated as SQL after trimming leading/trailing whitespace.

Example valid response:

```
```sql
SELECT ideas.title, COUNT(*) AS idea_count
FROM ideas
JOIN idea_themes ON ideas.id = idea_themes.idea_id
JOIN themes ON idea_themes.theme_id = themes.id
WHERE themes.name = 'AI'
GROUP BY ideas.title
LIMIT 1000;
```
```

## Safety Constraints

The model must abide by the following rules (which should be reiterated in the system instructions):

1. **One statement only** — No semicolons except at the end of the single query. No multiple statements or compound queries.
2. **SELECT/CTE only** — Must not include any data modification or schema alteration commands.
3. **Limit rows** — Add `LIMIT 1000` (or a specified limit) to restrict the result set unless the query uses an aggregate function (COUNT, SUM, MAX, MIN, AVG). If the user explicitly asks for all rows, maintain the limit but inform the user in the error message after validation.
4. **Column selection** — Avoid `SELECT *`; instead choose only necessary columns. If the question is broad (“show all columns”), use `SELECT *` but still respect the row limit.
5. **Qualify columns** — Use `table.column` notation for clarity and to avoid ambiguous column names when joining tables.
6. **Parameter values** — Do not guess values outside of what the user has provided. If a question refers to a tag “AI”, hard‑code `'AI'`; do not hallucinate tag names.

## Error Handling

The model may occasionally return SQL that violates the contract. The application will parse and validate the SQL using a parser. If validation fails, the UI will show a warning and allow the user to edit or discard the query. The model should not output commentary on errors; it should defer error handling to the app.

If the model cannot answer the question based on the provided schema (for example, if the schema lacks relevant fields), it should return a single SQL query that will always return zero rows, such as `SELECT NULL WHERE 0=1;`. Do not generate arbitrary queries over non‑existent tables.

## Model Choice and Configuration

Alchemist does not prescribe a single model; instead, users can choose any local LLM supported by Ollama. The following considerations apply:

- **Context window:** The model should support a sufficient token limit to include the system instructions, schema and question. If the schema is large, the front‑end must trim it to the relevant tables.
- **Temperature:** A low temperature (e.g. 0.1–0.3) is recommended to encourage deterministic, safe outputs. Randomness is not desirable for SQL generation.
- **Stop sequences:** Configure the model to stop at the end of the code block (e.g. detect triple backticks) to avoid additional text generation.

## Future Extensions

In future versions, the contract may evolve to support:

- **Multiple statements** for dashboards or views, subject to stronger validation.
- **Parameterized queries** where the model returns a template and separate parameter values.
- **Explanation channel** where the model also returns a plain‑language description of the SQL (separated from the code block), which could enhance the UI’s results panel.

Any changes to the contract should be versioned and the backend/validator must support the new format.

## Summary

The Local Model Contract ensures that Alchemist’s integration with LLMs yields predictable, safe SQL queries. By structuring the prompt, enforcing response formats and imposing strict safety rules, we mitigate the risks associated with natural‑language interfaces while still empowering users to explore their data.
