# @refrakt-md/runes

## 0.4.0

### Minor Changes

- ### New packages

  - `@refrakt-md/highlight` — Shiki-based syntax highlighting with Markdoc grammar support, CSS variables integration, and copy-to-clipboard
  - `@refrakt-md/transform` — Identity transform engine extracted into its own package (BEM classes, structural injection, meta consumption)

  ### New runes

  - `form` — Form component with field validation
  - `comparison` — Comparison matrices and tables
  - `storyboard` — Story visualization
  - `reveal` — Progressive disclosure
  - `conversation` — Chat-style content
  - `bento` — Grid layout component
  - `annotate` — Annotated content

  ### Theme restructuring

  - Merged `@refrakt-md/theme-lumina` into `@refrakt-md/lumina/svelte` as a subpath export
  - SvelteKit plugin now derives theme adapter dynamically from `config.theme` + `config.target`
  - Theme packages now serve framework adapters via subpath exports — no separate packages per framework

  ### CodeGroup redesign

  - Replaced Editor rune with dedicated CodeGroup component for multi-file code blocks

  ### SEO extractors

  - Added Recipe, HowTo, Event, Person, Organization, and Dataset schema.org extractors

  ### Other improvements

  - Unified actions pattern across Hero and CTA runes
  - Blog layout added to Lumina theme
  - Copy-to-clipboard for code blocks
  - Test coverage expanded from ~299 to 370 tests

### Patch Changes

- @refrakt-md/types@0.4.0

## 0.3.0

### Minor Changes

- 4588cf7: New runes and bug fixes

  SEO-Rich Content:

  recipe — Ingredients, steps, chef's tips with prep/cook time metadata
  howto — Step-by-step instructions with tools/materials list
  event — Event info with date, location, registration URL
  cast (alias: team) — People directory with name/role parsing
  organization (alias: business) — Structured business information

  Data Visualization & Developer Tools:

  datatable (alias: data-table) — Interactive table with sortable/searchable attributes
  api (alias: endpoint) — API endpoint documentation with method badges
  diff — Side-by-side or unified diff between two code blocks
  0chart — Bar/line/pie/area charts from Markdown tables
  diagram — Mermaid.js diagram rendering

  Other:
  sidenote (aliases: footnote, marginnote) — Margin notes, footnotes, and tooltips

### Patch Changes

- Updated dependencies [4588cf7]
  - @refrakt-md/types@0.3.0

## 0.2.0

### Minor Changes

- c0b3cb5: Added SEO layer

### Patch Changes

- @refrakt-md/types@0.2.0
