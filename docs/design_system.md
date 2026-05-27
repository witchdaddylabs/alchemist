# Design System

The Alchemist design system defines the visual identity, components and interaction patterns used throughout the application. It is inspired by dark hacker aesthetics with neon highlights, reflecting the Witch Daddy Labs branding. This document sets out colour palettes, typography, sizing, and component guidelines to ensure a cohesive, accessible and polished user interface.

## Colour Palette

Alchemist uses a dark base with vivid neon accents. Colours are defined using hex values and named tokens. The palette may be extended in the future, but these core colours should be used consistently.

| Token        | Description                  | Hex       | Usage                               |
|-------------|------------------------------|----------|--------------------------------------|
| **bg-base** | Primary background           | `#0D0B14` | Main window background               |
| **bg-panel**| Panel backgrounds            | `#1A1725` | Sidebars, cards, modals             |
| **bg-hover**| Hover state fill             | `#221D33` | Hover on list items, buttons        |
| **text-primary**| Primary text colour      | `#EDEDED` | Main body text                      |
| **text-secondary**| Secondary text colour  | `#B6B3C9` | Labels, hints, less important text  |
| **accent-purple** | Neon purple accent      | `#8A4AFB` | Primary actions, highlights         |
| **accent-magenta**| Neon magenta accent    | `#E02EFF` | Secondary actions, status icons     |
| **accent-blue**| Electric blue accent       | `#00CFFF` | Links, interactive elements         |
| **accent-green**| Acid green accent         | `#B2F500` | Success states, on/off toggles      |
| **error-red** | Error/warning colour        | `#FF4D67` | Validation errors, destructive actions |

### Guidelines

- Use dark backgrounds for all surfaces; panels should be slightly lighter than the window background for depth.
- Reserve neon accents for interactive elements (buttons, links) and important highlights. Avoid using too many accent colours at once; pick one primary accent for the current context.
- Ensure sufficient contrast between text and background. Use `text-primary` for main content and `text-secondary` for supplementary information.
- For disabled states, lower the opacity of the element rather than changing the hue.

## Typography

Alchemist’s typography balances readability and developer‑centric aesthetics.

| Token        | Purpose                          | Example font stack                         |
|-------------|----------------------------------|---------------------------------------------|
| **heading** | Section headings                 | `"SF Pro Display", Inter, sans-serif`     |
| **body**    | Primary body text                | `Inter, "Helvetica Neue", sans-serif`      |
| **monospace**| Code blocks and SQL editor      | `"JetBrains Mono", Menlo, monospace`        |
| **small**   | Captions, labels                 | Same as body with 85 % size                |

### Guidelines

- Use headings (`h1`–`h3`) to establish hierarchy. Headings should be bold and slightly larger than body text.
- Body text should be set at 15–16 px for comfortable reading on desktop screens.
- Monospaced font is mandatory in code and SQL contexts to maintain alignment and readability.
- Text should never be centred except in special cases (e.g. empty states, dialog titles). Left‑align body content.

## Spacing and Layout

Alchemist uses a 4 px spacing scale for consistency. Typical values are 4 px (xs), 8 px (sm), 12 px (md), 16 px (lg), 24 px (xl), and 32 px (xxl). Components should adhere to this rhythm.

- **Margins and padding:** Use multiples of 4 px. Panels typically have 16 px padding; cards have 12 px; buttons have horizontal padding of 16 px and vertical padding of 8 px.
- **Grid:** The main workspace uses a 12‑column flexible grid with responsive breakpoints. Sidebars are fixed at 280 px on large screens and collapse into drawers on smaller widths.
- **Border radius:** Corners of panels and buttons are rounded with a radius of 6 px. Cards use 8 px; inputs use 4 px.
- **Shadow:** Use subtle shadows to lift interactive elements (cards, modals) off the background. Example: `box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4)`.

## Component Guidelines

### Buttons

Buttons come in three variants: **Primary**, **Secondary**, and **Ghost**.

| Variant    | Background             | Text Colour       | Usage                                      |
|-----------|------------------------|-------------------|--------------------------------------------|
| Primary   | `accent-purple`        | `bg-base`         | Main actions like “Run query”               |
| Secondary | `bg-hover`             | `accent-purple`   | Supporting actions like “Edit SQL”          |
| Ghost     | Transparent            | `text-secondary`  | Low‑emphasis actions like “Discard”         |

Buttons have a minimum height of 32 px and horizontal padding of 16 px. Add a subtle 2 px border on secondary and ghost buttons (`border-color: #2A2540`). On hover, darken the background and lighten the text slightly. Disabled buttons lower the opacity to 50 % and remove pointer events.

### Inputs and Text Areas

- Inputs have dark backgrounds (`bg-panel`), a 1 px border in `bg-hover`, and 4 px border radius. On focus, the border colour animates to `accent-blue` or `accent-purple`.
- Placeholder text uses `text-secondary` at 70 % opacity.
- Text areas auto‑expand up to a maximum height; they display a subtle scroll bar beyond that.

### Cards

- Used for items in recent vaults, saved spells and history entries. Cards have `bg-panel` backgrounds, 8 px border radius, 1 px `bg-hover` border and a slight shadow.
- On hover, cards lift with a more pronounced shadow and slightly lighten.
- Card contents should include a title, optional subtitle, metadata (e.g. last opened) and action icons aligned to the right.

### Tables

- Use a striped pattern: alternating row backgrounds (`bg-panel` and `bg-hover`).
- The header row has `bg-hover` and bold text. Sorting icons appear on hover.
- Cells have 12 px horizontal padding and 8 px vertical padding.
- When a column is numeric, align values to the right. For text, left‑align and truncate with ellipsis if longer than the column width (provide a tooltip on hover).

### Modals and Panels

- Modals appear over a semi‑transparent backdrop (`rgba(0,0,0,0.8)`), centred in the viewport. They have a maximum width of 600 px, `bg-base` background, 16 px padding and 8 px border radius. Provide a close icon at the top right.
- Panels (sidebars) slide in from the side on narrow screens. They have the same background as cards but occupy the full height.

## Iconography

Alchemist uses simple line icons consistent with the neon theme. Icons should be monochrome (usually in accent colours) and scale to 16 px or 20 px. Recommended sets include [Lucide](https://lucide.dev/) or [Heroicons](https://heroicons.com/). Use the following mapping:

- **File/database icons:** indicate vaults and tables.
- **Chat icons:** indicate the input area.
- **Shield/check icons:** indicate safety approval.
- **Alert/exclamation icons:** indicate warnings or validation errors.
- **Save/bookmark icons:** indicate saved spells.
- **Play/run icons:** indicate running queries or spells.

## Charts

- Use shadcn/chart components (which wrap Recharts) with dark backgrounds and bright bars/lines styled through the shadcn theming system.
- Use simple gridlines in `bg-hover` to aid readability.
- Axis labels and legends should use `text-secondary` for reduced emphasis. The focus should remain on the data.
- Hover tooltips should invert the background and accent colour for contrast.

## Motion and Micro‑interactions

Keep animations subtle and purposeful. Do not overuse flashy transitions; the goal is to support the magical theme without distracting from data.

- **Loading indicators:** Use a pulsing neon line or shimmer rather than a spinning wheel.
- **Hover states:** Animate background colour and slight scaling (1–2 %) to indicate interactivity.
- **Focus indicators:** Inputs and buttons should animate their border colours smoothly on focus.
- **Drag‑and‑drop:** When dragging a file over the vault screen, animate the drop area border with a glowing neon gradient.

## Accessibility Considerations

- All text should meet WCAG AA contrast ratios against the background (dark backgrounds require careful choice of accent colours).
- Buttons and interactive elements should have clear focus states for keyboard navigation.
- Include ARIA roles and labels on non‑semantic elements (e.g. custom tabs, chart toggles).
- Support keyboard shortcuts for major actions and allow screen reader users to access all content.
