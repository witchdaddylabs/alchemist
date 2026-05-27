# UI Screen Specifications

This document outlines the primary screens of the Alchemist application. It describes layouts, components and interactions to guide the implementation of the user interface. These specifications are not pixel‑perfect mockups, but they contain enough detail for Codex or designers to create high‑fidelity designs consistent with the Design System.

## 1. Welcome / Vault Screen

### Purpose
Provide an entry point for the application, emphasise the local‑first nature of the product, and allow users to open or drag a SQLite database. The vault concept reflects the idea of secure, personal data storage.

### Layout

- **Header:** centered app name (“Alchemist”) with a small tagline (“Ask your local database what it knows”). Use the brand font and neon accent for the word “Alchemist”.
- **Primary action:** A large, outlined button labeled “Open SQLite database” with an icon representing a file/folder. The button triggers the system file picker.
- **Drag‑and‑drop area:** The entire middle panel accepts drag‑and‑drop of `.db` or `.sqlite` files. When the user drags a file over, the area highlights with an animated neon border.
- **Recent vaults:** Below the main action, display a list of recently opened databases. Each vault appears as a card with the file name, number of tables, last opened date/time, and a read‑only badge. Cards are click‑able to reopen the database.
- **Trust strip:** At the bottom, show a row of icons/text that communicates “Local only”, “Read‑only”, “No account required”. Use subtle neon icons and small labels. This educates the user about privacy and safety before they open a file.

### Interactions

- Clicking “Open SQLite database” opens a file picker restricted to `.db`, `.sqlite` and `.sqlite3` extensions.
- Drag‑and‑drop triggers the same opening flow.
- Clicking a recent vault opens the database directly.

## 2. Main Workspace

### Purpose
Allow users to browse the schema, ask questions, preview and execute SQL, and view results. This is the core screen where most of the workflow happens.

### Layout

The workspace is divided into three primary panels:

1. **Schema Panel (Left sidebar)**
   - Fixed width; dark background slightly lighter than the main body.
   - Displays the database name at the top with a drop‑down icon for switching vaults.
   - Shows a collapsible tree of tables. Each table lists its columns and inferred data type icons. Foreign keys can be indicated by a linking symbol.
   - At the bottom of the panel, a simple search box filters tables/columns by name.

2. **Chat & SQL Panel (Centre)**
   - **Chat input:** A multi‑line text area at the bottom of this panel with placeholder text: “Ask your database…”. It auto‑expands up to a reasonable limit and supports shift+enter for new lines.
   - **History area:** Above the input, display a scrollable list of past questions and answers. Each entry shows the question, the generated SQL (collapsible), and an icon for saving it as a spell.
   - **Generated SQL preview:** When the user submits a question, the app scrolls to the new entry and displays the LLM’s SQL suggestion. This panel should clearly differentiate user text, LLM text, and code blocks (use monospaced font and syntax highlighting for SQL).
   - **Buttons:** Each new entry includes buttons such as “Run query”, “Edit SQL”, “Discard”. These are secondary buttons with iconography.

3. **Result & Insight Panel (Right sidebar)**
   - This panel is context‑sensitive. After a query is run, it switches to display results:
     - **Table view:** Data grid with sortable columns. Use alternating row colours. Provide pagination or virtual scrolling for large datasets.
     - **Summary view:** Plain text describing the number of rows returned, key aggregates, or notable patterns extracted from the result (future enhancement).
     - **Chart view:** Tabs for simple bar/line/pie charts when the result is suitable (e.g. one numeric and one categorical column). The user can switch between chart types.
     - **Export controls:** Buttons for copying the result to clipboard, exporting to CSV or Markdown.
   - If no result is selected, the panel can display a placeholder (e.g. “Results will appear here”).

### Interactions

- Typing a question and pressing Enter sends it to the backend. The Chat panel enters a loading state (“Thinking…”), then the SQL preview appears.
- Clicking “Run query” validates and executes the SQL. If validation fails, a toast/alert informs the user and highlights the invalid part.
- Selecting “Edit SQL” opens an inline editor where the user can modify the generated query. The editor uses monospaced font and basic syntax highlighting.
- Clicking a table in the Schema Panel inserts its name into the chat input (e.g. clicking `ideas` inserts “ideas” at the cursor position). Double‑clicking a table opens a quick preview of the first 100 rows in the Result panel.

## 3. SQL Preview & Safety Panel

### Purpose
To reassure users that the generated SQL is safe to run and provide them with control over execution.

### Layout

When a question is asked, the chat entry expands to reveal a **SQL preview card**:

- **Header:** “Generated SQL” with a small “Safe” badge showing a green shield icon. Hovering over the badge reveals a tooltip explaining why the query is considered safe (e.g. “Single SELECT statement, no writes, row limit applied”).
- **Code block:** The SQL query is displayed in a scrollable code block with syntax highlighting. Long queries wrap lines or have horizontal scrolling.
- **Action buttons:**
  - **Run Query:** primary button. Executes the SQL if it is valid.
  - **Edit SQL:** secondary button that opens the query editor overlay.
  - **Discard:** ghost button that removes this entry from the history.
- **Safety warnings:** If the validation found risky elements (e.g. missing `LIMIT`), display a red badge with a warning icon and a message. The Run button is disabled until the user fixes the issue.

### Interactions

- Hovering over the shield/warning badges reveals tooltips describing the safety checks and the reason for approval or rejection.
- Clicking “Edit SQL” opens an overlay with a large monospaced editor (similar to VS Code’s Light theme) and a row limit field. The user can modify the SQL; the validator runs in real‑time and shows warnings below the editor.
- Closing the editor returns to the preview card, updating the displayed SQL with changes.

## 4. Results & Charts Screen

### Purpose
Display query results in a way that enables exploration and understanding. Provide simple visualisations without requiring the user to design charts.

### Layout

- **Toolbar:** Above the table, show the number of rows returned, time taken and the active query name. To the right, include buttons for “Copy results”, “Export CSV”, “Export Markdown” and toggles for different views (Table, Summary, Chart).
- **Table view:**
  - Sticky header row; columns are resizable and sortable.
  - Each cell is rendered according to type (e.g. numbers right‑aligned, dates formatted, text truncated with ellipsis and tooltip on hover).
  - If there are more than 1000 rows, show only the first 1000 by default with a “Load all” button.

- **Chart view:**
  - Tabs for each available chart type (bar, line, pie). Chart options are automatically generated based on the result set:
    - Bar charts require a categorical column and a numeric column (e.g. “tag” vs “count”).
    - Line charts require a date/time column and a numeric column.
    - Pie charts require a categorical column and a numeric column.
  - If no valid chart combinations exist, display a friendly message like “Charting unavailable for this result”.
  - Include interactive hover tooltips and legend for clarity.

- **Summary view:**
  - A generated narrative summarises the main patterns (optional in MVP). For v0.1, this could be a simple sentence (“24 rows returned”).

### Interactions

- Switching tabs updates the view without re‑running the query.
- Hovering over a cell shows the full value and allows copying.
- Exporting results writes a CSV/Markdown file to the user’s chosen location.

## 5. Saved Spells Screen

### Purpose
Allow users to save useful questions/queries as reusable “spells” and organise them for future use.

### Layout

- **Header:** Title “Saved spells” and a brief description (“Quickly run your favourite queries”).
- **Spell list:** Cards or list items showing the spell name, a short description, and the last run date. Each item has a play button to run the query immediately and an edit icon to modify the underlying question or SQL.
- **New spell button:** A floating action button (FAB) or plus icon that opens a dialogue for creating a new spell from scratch or from a previous history entry.

### Interactions

- Clicking a spell runs the associated SQL, showing the result in the Result panel.
- Editing a spell opens a dialogue similar to the SQL editor with fields for the spell name, description, question and underlying SQL. The safety validator runs when the user changes the SQL.
- Deleting a spell prompts confirmation.

## General UI Behaviour

- **Dark mode:** The entire application uses a dark colour scheme with neon accents. Text should be high contrast against the dark background (see Design System).
- **Keyboard shortcuts:** Provide shortcuts for common actions (Ctrl/Cmd+O to open file, Ctrl/Cmd+Enter to run query, Ctrl/Cmd+S to save spell, Ctrl/Cmd+L to clear chat input).
- **Responsive layout:** Although the primary target is desktop, the layout should accommodate resizable windows. Sidebars can collapse into drawers when the window is narrow.
- **Accessibility:** Ensure proper focus management, ARIA roles for interactive elements, and keyboard navigation across panels.
