# Test Plan

This document defines the testing strategy for Alchemist. It outlines the types of tests to be performed, the scope of each test suite and specific scenarios to verify. The goal is to ensure that the application meets functional requirements, enforces safety constraints, provides a polished user experience and remains stable across updates.

## Testing Philosophy

1. **Safety first** — Validate that the app never writes to the user’s database or leaks data.
2. **Deterministic behaviour** — Use low randomness in the model and mock LLM responses where possible to ensure repeatable tests.
3. **User‑centric** — Focus on flows that mirror how real users interact with the app: opening files, asking questions, and exploring results.
4. **Automated and manual** — Combine automated unit and integration tests with manual exploratory testing for design and accessibility.

## Test Suites

### 1. Unit Tests

These tests target individual functions and modules in the Rust backend and frontend utility libraries.

#### Examples

- **Schema parsing:** Verify that `db.rs` correctly extracts table names, column types and foreign keys from various SQLite schemas (e.g. simple tables, composite keys, tables with reserved keywords).
- **SQL validator:** Test that `validate.rs` correctly identifies allowed and disallowed queries, single statements, missing limits, presence of write commands, multiple semicolons, and ambiguous column names.
- **LLM prompt builder:** Ensure that the schema context is trimmed to relevant tables and that the final prompt conforms to the contract defined in the Local Model Contract document.
- **Storage:** Test reading and writing of recent files and saved spells. Ensure that file corruption or malformed JSON fails gracefully.

### 2. Backend Integration Tests

These tests interact with the full Rust backend (without the UI) to verify end‑to‑end logic.

#### Examples

- **Open Database:** Use a temporary SQLite file to ensure that `open_db()` opens the file in read‑only mode, rejects invalid paths and returns the correct schema.
- **Generate SQL:** Mock the LLM HTTP endpoint to return a sample SQL query and verify that the backend constructs the prompt correctly, sends it to the model and receives the expected response.
- **Run Query:** Given a specific SQL string, ensure that `run_query()` executes the query, returns the expected rows, and enforces the row limit.
- **Error propagation:** Simulate a failing SQL execution and confirm that error messages bubble up to the UI layer with appropriate user‑friendly messages.

### 3. Frontend Unit Tests

Use a framework like Jest with React Testing Library to test React components in isolation.

#### Examples

- **Schema panel:** Ensure that table names and columns render correctly, that the search filter works, and that clicking a table inserts its name into the input.
- **Chat console:** Verify that pressing Enter sends a question, that loading states appear, and that history entries render with correct content and action buttons.
- **Result panel:** Confirm that tables display data correctly, that sorting and pagination work, and that chart tabs appear when appropriate.
- **Saved spells:** Test creation, editing, deletion and running of spells; confirm that unsaved changes prompt warnings.

### 4. End‑to‑End (E2E) Tests

Use a tool like Playwright or Cypress to simulate user interactions against the compiled application in a controlled environment. For macOS, these tests should run against the packaged Tauri app.

#### Scenarios

1. **First Launch**
   - Launch the app. Verify that the vault screen appears, recent vaults are absent on first run and the trust strip is visible.

2. **Open Database**
   - Drag a test `.sqlite` file into the vault area. Confirm that the main workspace loads, the schema panel lists tables and the database name appears.

3. **Ask Question and Run Query**
   - Type “List all ideas” and press Enter. Mock the LLM to return `SELECT title FROM ideas LIMIT 10;`. Confirm that the SQL preview appears, that the user can run it and that the result table shows the expected data.

4. **Safety Rejection**
   - Mock the LLM to return `DELETE FROM ideas;`. Confirm that validation rejects the query, shows an error message and disables the Run button.

5. **Edit SQL**
   - After a valid query, click “Edit SQL”, change `LIMIT 10` to `LIMIT 5`, and run it. Confirm that only five rows are returned.

6. **Save Spell and Run**
   - Save the last query as “Top ideas”. Go to the Saved Spells screen, run the spell and verify that the results match the previous output.

7. **Large Result Handling**
   - Run a query that returns more than 1000 rows. Verify that only the first 1000 rows are displayed and that a “Load all” button appears.

8. **Chart Rendering**
   - Ask a question whose result can be charted (e.g. count of ideas by tag). Confirm that the Chart tab appears and displays a bar chart with the correct categories and values.

9. **Error Handling**
   - Simulate the LLM server being offline. Verify that the UI shows a clear error and suggests starting the model service.

10. **Keyboard Accessibility**
    - Navigate through the application using only the keyboard. Ensure that all interactive elements are reachable and that focus indicators are visible.

### 5. Manual Exploratory Testing

Human testers should perform ad‑hoc testing to uncover usability issues, layout inconsistencies, and aesthetic problems that automated tests might miss.

#### Areas of focus

- **Dark mode readability:** Ensure that text is readable and that contrast meets accessibility guidelines in different lighting conditions.
- **Interaction animations:** Evaluate the quality of micro‑interactions (hover effects, loading indicators). They should feel responsive and not cause motion sickness.
- **Drag‑and‑drop:** Test dropping multiple files, unsupported file types and dragging across different areas of the UI.
- **Localization/Character Sets:** Verify that queries and results display properly for non‑ASCII data (e.g. languages with accents, emoji). Ensure the font handles these gracefully.

### 6. Performance Tests

Although the app is local, it must remain responsive when handling large databases and long result sets.

- **Load time:** Measure time from launching the app to the first render of the vault screen; target <1 second on modern hardware.
- **Schema introspection:** On large databases (e.g. thousands of tables), ensure the schema panel populates within a reasonable timeframe (target <1 second for 100 tables, scaled as appropriate).
- **Query execution:** Test queries returning large result sets (e.g. 500 k rows) and verify that streaming and pagination keep the UI responsive (no frame drops).
- **Memory usage:** Monitor memory when executing queries and loading results; ensure the app does not leak or consume excessive RAM.

### 7. Regression Tests

Each release should run the full test suite against the compiled binary. Any bug fixed in a previous version should have a regression test added. For example, if a bug allowed multi‑statement queries past the validator, the test should explicitly assert that such queries are blocked in the future.

## Test Environment Setup

- **Mock Model Server:** Use a lightweight HTTP server to simulate the LLM. Preconfigure responses for specific inputs to allow deterministic tests.
- **Test Databases:** Provide several SQLite files with known schemas and data. Include small, medium and large datasets; include corner cases like missing primary keys, reserved column names and composite foreign keys.
- **CI Integration:** Set up a continuous integration pipeline (GitHub Actions) to run all unit, integration and E2E tests on every pull request. Run E2E tests on macOS runners and optionally on Windows and Linux if cross‑platform support is added.
- **Code Coverage:** Use coverage tools (e.g. `tarpaulin` for Rust, Istanbul for JS) to ensure critical paths are adequately tested. Aim for at least 80 % coverage in the core logic.

## Test Schedule

- **During development:** Run unit tests on every file save (watch mode). Run backend integration tests when implementing new commands. Run front‑end unit tests as components are built.
- **Pre‑release:** Run the full test suite (including E2E and performance tests). Perform manual exploratory testing and cross‑platform checks. Fix any critical issues before tagging a release.
- **Post‑release:** Collect user feedback and bug reports. Triage issues and add regression tests accordingly.

## Summary

Comprehensive testing is essential to maintain trust in a local‑first data tool. By combining automated tests with manual evaluation and focusing on safety, determinism and user experience, Alchemist can evolve rapidly without compromising stability or privacy.
