---
title: Architecture Guide
description: A technical overview of refrakt.md for developers, contributors, and theme authors
---

# refrakt.md Architecture Guide

> A technical overview for developers evaluating the project, potential contributors, and theme authors.

---

## 1. Vision & Core Concept

refrakt.md is a content-first website generation system built on [Markdoc](https://markdoc.dev/). It transforms standard Markdown into semantically rich, beautifully themed websites -- without requiring authors to learn component APIs, write JSX, or manage frontmatter schemas.

The key insight is the **rune**: a Markdoc tag that acts as an *interpretation context*. The same Markdown primitives -- headings, lists, paragraphs, blockquotes, images -- take on completely different semantic meaning depending on which rune wraps them.

Consider a simple unordered list:

```md
- Spaghetti
- Pancetta
- Egg yolks
```

On its own, that is just a list. But wrap it in a rune, and it becomes something else entirely:

- Inside `{% recipe %}` -- those are **ingredients**, and the system emits `schema.org/Recipe` structured data.
- Inside `{% pricing %}` -- those are **feature items** in a pricing tier.
- Inside `{% nav %}` -- those are **page references** (slugs), resolved into a navigation tree.
- Inside `{% cast %}` -- those are **team members**, parsed as "Name - Role" entries with `schema.org/Person` metadata.

{% hint type="note" %}
This is **semantic reinterpretation of Markdown primitives**. Authors write familiar Markdown. The rune supplies the interpretation. The theme supplies the presentation. And SEO structured data falls out automatically because the system already understands what the content *means*.
{% /hint %}

The architecture is organized into several focused packages:

| Package | Purpose |
|---------|---------|
| `@refrakt-md/runes` | Rune definitions, Markdoc schemas, transforms, and SEO extraction |
| `@refrakt-md/types` | Shared TypeScript interfaces for components, themes, and configuration |
| `@refrakt-md/transform` | Identity transform engine -- BEM classes, structural injection, meta consumption |
| `@refrakt-md/content` | Content tree, filesystem routing, layout resolution, sitemap generation |
| `@refrakt-md/svelte` | Svelte adapter -- Renderer, ThemeShell, serialization, component registry |
| `@refrakt-md/sveltekit` | Vite plugin, virtual modules, content HMR |
| `@refrakt-md/highlight` | Syntax highlighting -- Shiki-based tree walker, CSS variables integration, pluggable highlighter |
| `@refrakt-md/lumina` | Lumina theme identity -- design tokens, per-rune CSS, and pre-built transform |
| `@refrakt-md/ai` | AI content generation -- system prompt builder, Anthropic and Ollama providers |
| `@refrakt-md/cli` | CLI tool (`refrakt write`) |

---

## 2. Rune Library

refrakt.md ships 39 author-facing runes (plus internal child runes). Each rune defines which Markdown primitives it reinterprets and, where applicable, which schema.org type it generates.

### Layout & Structure

| Rune | Aliases | Reinterprets | Schema.org |
|------|---------|-------------|------------|
| `grid` | `columns` | `hr` as grid cell delimiter | -- |
| `cta` | `call-to-action` | Heading as headline, paragraph as blurb, list as action buttons, fence as command | -- |
| `hero` | -- | Heading as hero title, paragraph as subtitle/tagline, list as action buttons, fence as command | -- |
| `bento` | -- | Heading as cell title (level determines size: h2=large, h3=medium, h4+=small), paragraph as cell content, image as cell background | -- |
| `feature` | -- | Heading as section headline, paragraph as description, list items as feature definitions with icon/name/description | -- |
| `steps` | -- | Heading as step name, paragraph as step content (ordered list auto-converted) | -- |
| `storyboard` | `comic` | Image as panel visual, paragraph as caption/dialogue | -- |

### Content

| Rune | Aliases | Reinterprets | Schema.org |
|------|---------|-------------|------------|
| `hint` | `callout`, `alert` | Paragraph as message body. Type variants: note, warning, caution, check | -- |
| `details` | -- | Heading as summary label, paragraph as collapsible content | -- |
| `figure` | -- | Image as figure image, paragraph as caption | `ImageObject` |
| `sidenote` | `footnote`, `marginnote` | Paragraph as margin note content | -- |
| `annotate` | -- | Paragraph as main content, nested `{% note %}` tags as margin annotations | -- |
| `embed` | -- | Paragraph as fallback text. Auto-detects YouTube, Vimeo, Twitter/X, CodePen, Spotify | `VideoObject` |
| `breadcrumb` | -- | List as breadcrumb path items, links as breadcrumb links | `BreadcrumbList` |
| `toc` | `table-of-contents` | Auto-generated from document headings (configurable depth) | -- |
| `reveal` | -- | Heading as reveal step label, paragraph as revealed content (progressive disclosure) | -- |
| `conversation` | `dialogue`, `chat` | Blockquote as speaker message, strong as speaker name | -- |
| `form` | `contact-form` | List items as form fields (type inferred from name), blockquote as help text or selection group, heading as fieldset group, strong as submit button label | -- |

### Navigation & Disclosure

| Rune | Aliases | Reinterprets | Schema.org |
|------|---------|-------------|------------|
| `tabs` | -- | Heading as tab name, content below heading as tab panel | -- |
| `accordion` | `faq` | Heading as section header (toggleable), content below as collapsible panel | `FAQPage` |
| `nav` | -- | Heading as nav group title, list items as page references (slugs) | -- |
| `layout` + `region` | -- | Layout wraps `_layout.md` definitions; region creates named content blocks (header, nav, footer, sidebar) with mode (replace/prepend/append) | -- |

### Data & Code

| Rune | Aliases | Reinterprets | Schema.org |
|------|---------|-------------|------------|
| `datatable` | `data-table` | Markdown table as interactive data table with sorting, filtering, pagination | `Dataset` |
| `chart` | -- | Markdown table as chart data (first column = axis labels, header row = series names) | -- |
| `diagram` | -- | Fenced code block as diagram source (Mermaid, PlantUML, ASCII art) | -- |
| `compare` | -- | Fenced code blocks as side-by-side comparison panels with labels | -- |
| `diff` | -- | Two fenced code blocks as before/after code (unified or side-by-side mode) | -- |
| `api` | `endpoint` | Heading as endpoint title, fence as request/response examples, table as parameter list, blockquote as notes/warnings | -- |
| `codegroup` | -- | Fenced code blocks as language-tabbed code block (auto-detects language as tab name) | -- |

### Commercial

| Rune | Aliases | Reinterprets | Schema.org |
|------|---------|-------------|------------|
| `pricing` | -- | Heading as section headline, contains `{% tier %}` children with name, price, feature lists | `Product` + `Offer` |
| `testimonial` | `review` | Blockquote as testimonial quote, strong as author name, paragraph as author role, image as avatar | `Review` |
| `comparison` | `versus`, `vs` | Heading as column header (thing being compared), list as feature rows, strong as row alignment label, `s` (strikethrough) as negative indicator, blockquote as callout badge | -- |

### Semantic

| Rune | Aliases | Reinterprets | Schema.org |
|------|---------|-------------|------------|
| `recipe` | -- | Unordered list as ingredients, ordered list as steps, blockquote as chef tips, image as recipe photo, heading as recipe name | `Recipe` |
| `howto` | `how-to` | Ordered list as steps, unordered list as tools/materials, heading as title | `HowTo` |
| `event` | -- | Heading as event name, list as speakers/agenda, blockquote as venue description, link as registration URL | `Event` |
| `cast` | `team` | List items as people entries ("Name - Role" pattern), image as avatar/headshot, link as profile URL | `Person` |
| `organization` | `business` | Heading as organization name, image as logo, link as website/social profiles | `Organization` |
| `timeline` | -- | Heading as dated milestone ("2023 - Company founded" pattern), paragraph as event description | `ItemList` |
| `changelog` | -- | Heading as version + date ("v2.1.0 - 2024-01-15"), list as categorized changes, strong as change category | -- |

### Music

| Rune | Aliases | Reinterprets | Schema.org |
|------|---------|-------------|------------|
| `music-playlist` | -- | Heading as playlist name, list items as tracks (pipe-delimited fields), image as album art | `MusicPlaylist` |
| `music-recording` | -- | Heading as track name; attributes for artist, duration (ISO 8601), copyright year | `MusicRecording` |

---

## 3. Theme System

The theme system has a two-layer architecture that separates **identity** (what the content looks like structurally) from **implementation** (how interactive behavior works at runtime).

### Identity Layer (Framework-Agnostic)

The identity layer is powered by `@refrakt-md/transform` (the generic engine) and `@refrakt-md/lumina` (the Lumina-specific configuration and CSS). It consists of three parts:

**1. Design Tokens** -- CSS custom properties that define the visual language. These are declared in `tokens.css` and follow a `--rf-` prefix convention:

```css
:root {
  --rf-font-sans: 'Inter', system-ui, sans-serif;
  --rf-color-primary: #0ea5e9;
  --rf-color-text: #1a1a2e;
  --rf-radius-md: 10px;
  --rf-shadow-md: 0 4px 12px rgba(0,0,0,0.07);
  /* ... */
}
```

Tokens cover typography, a full color scale (primary 50-950, semantic colors, surfaces), border radii, shadows, and code block styling. A dark mode token set overrides these in a `prefers-color-scheme: dark` context.

**2. Identity Transform Engine** -- A pure function that walks the serialized tag tree and enhances it with BEM classes, context-aware modifiers, structural elements, and modifier data attributes. This is where the `typeof` attribute on rendered tags gets resolved into a theme-specific presentation. The engine threads parent rune context through the recursion, so nested runes can receive additional BEM modifiers based on their parent -- for example, a Hint inside a Hero automatically gets `rf-hint--in-hero`, allowing CSS to style it differently without any framework code.

For example, a `Hero` rune with `align="center"` is transformed into:

```html
<section typeof="Hero" class="rf-hero rf-hero--center" data-align="center">
  <header data-name="header" class="rf-hero__header">
    <h1 property="headline" class="rf-hero__headline">...</h1>
    <p property="blurb" class="rf-hero__blurb">...</p>
  </header>
  <div data-name="actions" class="rf-hero__actions">...</div>
</section>
```

The engine also injects structural elements not present in the Markdown. For a `Hint` rune with `type="warning"`, the engine prepends a header containing an icon span and a title span -- all driven by the theme configuration, not by the rune transform itself.

The engine is configured declaratively. Each rune gets a `RuneConfig` that specifies:
- `block` -- the BEM block name (`hint`, `hero`, `cta`, etc.)
- `modifiers` -- which `meta` tags to consume and convert into BEM modifier classes
- `contextModifiers` -- optional mapping from parent rune `typeof` to BEM modifier suffix (e.g., `{ 'Hero': 'in-hero' }` produces `rf-hint--in-hero` when nested inside a Hero)
- `autoLabel` -- rules for adding `data-name` attributes to child elements
- `structure` -- structural elements to inject (headers, icons, badges, metadata displays)
- `contentWrapper` -- optional wrapper element for the content area

**3. Per-Rune CSS** -- Each rune has its own CSS file targeting BEM classes. A `hint.css` styles `.rf-hint`, `.rf-hint--warning`, `.rf-hint__header`, `.rf-hint__icon`, and so on. Because all runes produce stable, predictable BEM class names, theme CSS is straightforward to write and override.

### Implementation Layer (Framework-Specific)

The implementation layer is only needed for runes that require **runtime interactivity**.

{% hint type="check" %}
Most runes -- hero, hint, feature, cta, breadcrumb, timeline, changelog, recipe, and many more -- are fully rendered by the identity transform + CSS alone. They need zero JavaScript.
{% /hint %}

Interactive runes register Svelte components in the theme's component registry:

```typescript
export const registry: ComponentRegistry = {
  'TabGroup': Tabs,       // Tab switching behavior
  'DataTable': DataTable, // Sorting, filtering, pagination
  'Form': Form,           // Form validation and submission
  'Accordion': Accordion, // Expand/collapse behavior
  'Details': Details,     // Disclosure toggle
  'Reveal': Reveal,       // Progressive disclosure steps
  'Diagram': Diagram,     // Mermaid/PlantUML rendering
  'Chart': Chart,         // Chart visualization
  'Nav': Nav,             // Active page highlighting
  'Grid': Grid,           // Dynamic grid layout
  'Bento': Bento,         // Bento grid sizing
  'Storyboard': Storyboard,
  'Embed': Embed,         // iframe injection
  'Pricing': Pricing,     // Tier rendering logic
  'Comparison': Comparison,
  'Testimonial': Testimonial,
};
```

The current implementation targets **SvelteKit** with Svelte 5 components using runes (Svelte's `$props()`, `$derived()`, `$state()`).

### Theme Manifest

Every theme ships a `manifest.json` that declares its capabilities:

```json
{
  "name": "lumina",
  "target": "sveltekit",
  "designTokens": "tokens.css",
  "layouts": {
    "default": {
      "component": "layouts/DefaultLayout.svelte",
      "regions": ["header", "footer"]
    },
    "docs": {
      "component": "layouts/DocsLayout.svelte",
      "regions": ["header", "nav", "sidebar", "footer"],
      "requiredRegions": ["nav"]
    },
    "blog": {
      "component": "layouts/BlogLayout.svelte",
      "regions": ["header", "sidebar", "footer"]
    }
  },
  "routeRules": [
    { "pattern": "docs/**", "layout": "docs" },
    { "pattern": "blog", "layout": "blog" },
    { "pattern": "blog/**", "layout": "blog" },
    { "pattern": "**", "layout": "default" }
  ],
  "unsupportedRuneBehavior": "passthrough"
}
```

The manifest is the universal contract between content and rendering. It tells the system which layouts exist, which regions they support, and which URL patterns map to which layouts.

### Element Overrides

Beyond rune components, themes can override rendering of standard HTML elements. Lumina overrides `<table>`, `<blockquote>`, and `<pre>` with Svelte components that add responsive wrappers, enhanced styling, and interactive features like copy-to-clipboard on code blocks. This is done through the `elements` map:

```typescript
export const elements: ElementOverrides = {
  'table': Table,
  'blockquote': Blockquote,
  'pre': Pre,
};
```

---

## 4. Layout System

Layouts in refrakt.md are defined in Markdown, not in framework-specific template files. This keeps the content layer portable.

### Layout Files

A `_layout.md` file in any content directory defines the layout for that directory and its descendants. It uses two special runes:

- `{% layout %}` -- wraps the entire layout definition
- `{% region %}` -- creates a named content block

```markdoc
{% layout %}

{% region name="header" %}
# My Site
{% /region %}

{% region name="nav" %}
{% nav %}
## Getting Started
- installation
- quick-start

## Guides
- theming
- deployment
{% /nav %}
{% /region %}

{% region name="footer" %}
Built with refrakt.md
{% /region %}

{% /layout %}
```

### Region Inheritance

Layout files cascade down the directory tree. A `_layout.md` in `/content/` applies to all pages. A `_layout.md` in `/content/docs/` can override, extend, or augment the parent layout's regions:

- **`mode="replace"`** (default) -- completely replaces the parent's region content
- **`mode="prepend"`** -- adds content before the parent's region content
- **`mode="append"`** -- adds content after the parent's region content

```markdoc
{% layout extends="parent" %}

{% region name="nav" mode="append" %}
{% nav %}
## API Reference
- rest-api
- graphql
{% /nav %}
{% /region %}

{% /layout %}
```

The layout resolver walks up the directory tree from the page's location to the content root, collecting all `_layout.md` files into a chain, then merges their regions according to each region's mode.

### Layout-to-Component Mapping

The theme manifest maps layout names to Svelte components. Lumina ships three layouts:

- **`DefaultLayout`** -- supports `header` and `footer` regions. Used for landing pages, marketing content, standalone pages.
- **`DocsLayout`** -- supports `header`, `nav`, `sidebar`, and `footer` regions. The `nav` region is required. Used for documentation with sidebar navigation.
- **`BlogLayout`** -- supports `header`, `sidebar`, and `footer` regions. Renders an index page with post cards when the page has no `date` frontmatter, and a full article view with metadata (date, author, tags) for individual posts.

---

## 5. Routing

Content routing operates in three layers, each refining the previous:

### Layer 1: Filesystem

The filesystem is the source of truth. File paths map directly to URL paths:

| File Path | URL |
|-----------|-----|
| `content/index.md` | `/` |
| `content/about.md` | `/about` |
| `content/docs/index.md` | `/docs` |
| `content/docs/getting-started.md` | `/docs/getting-started` |
| `content/docs/01-installation.md` | `/docs/installation` |

Key conventions:
- `.md` extensions are stripped
- `index.md` files map to the directory root
- Numeric prefixes (`01-`, `02-`) are stripped -- they control sort order without affecting URLs
- `_layout.md` files are excluded from routing entirely

### Layer 2: Frontmatter Overrides

YAML frontmatter can override the computed route:

```yaml
---
title: My Custom Page
slug: /custom-path          # Override the URL
draft: true                 # Exclude from production builds
redirect: /new-location     # Redirect to another page
---
```

- **`slug`** replaces the filesystem-derived URL entirely
- **`draft`** flags the page for exclusion from sitemaps and production builds
- **`redirect`** marks the page as a redirect (not rendered, emits redirect metadata)

### Layer 3: Manifest Route Rules

The theme manifest's `routeRules` array determines which layout handles each URL. Rules are evaluated in order; the first match wins:

```json
[
  { "pattern": "docs/**", "layout": "docs" },
  { "pattern": "blog",    "layout": "blog" },
  { "pattern": "blog/**", "layout": "blog" },
  { "pattern": "**",      "layout": "default" }
]
```

Pattern syntax:
- `**` matches any depth of nesting (`docs/a/b/c`)
- `*` matches a single path segment (`blog/my-post` but not `blog/2024/my-post`)
- Exact strings match literally (`about` matches `/about`)

---

## 6. SEO Generation

{% hint type="check" %}
SEO in refrakt.md is automatic. Because runes already understand the semantic meaning of content, structured data generation is a by-product of the transform pipeline -- not a separate annotation step.
{% /hint %}

### JSON-LD Structured Data

The SEO extractor walks the rendered tag tree, finds tags with `typeof` attributes that map to schema.org types, and generates JSON-LD objects. The system currently generates these schema.org types:

| Schema.org Type | Generated By |
|----------------|-------------|
| `Recipe` | `{% recipe %}` -- extracts name, ingredients, steps, prep/cook time, servings |
| `FAQPage` | `{% accordion %}` / `{% faq %}` -- each accordion item becomes a Question/Answer pair |
| `Product` + `Offer` | `{% pricing %}` with `{% tier %}` -- extracts product name, tier names, prices, currencies |
| `Event` | `{% event %}` -- extracts name, date, location, registration URL |
| `Review` | `{% testimonial %}` -- extracts quote, author name, role, rating |
| `HowTo` | `{% howto %}` -- extracts title, steps, tools/materials, estimated time |
| `BreadcrumbList` | `{% breadcrumb %}` -- extracts ordered path items with URLs |
| `Organization` | `{% organization %}` -- extracts name, contact details, social profiles |
| `Person` | `{% cast %}` -- extracts names and roles |
| `MusicPlaylist` | `{% music-playlist %}` -- extracts playlist name, track count, track listing |
| `MusicRecording` | `{% music-recording %}` -- extracts track name, artist, duration, copyright year |
| `ImageObject` | `{% figure %}` -- extracts image URL and caption |
| `VideoObject` | `{% embed %}` (video providers) -- extracts title, content URL, embed URL |
| `ItemList` | `{% timeline %}` -- extracts ordered list of dated milestones |
| `Dataset` | `{% datatable %}` -- extracts tabular data |

The currency for pricing tiers is auto-detected from price symbols (`$` = USD, `EUR` = EUR, `kr` = SEK, etc.).

### Open Graph Tags

OG metadata is derived automatically with a priority cascade:

1. **Frontmatter** -- explicit `title`, `description`, `image` fields take highest priority
2. **Hero rune** -- if the page contains a `{% hero %}`, its headline becomes `og:title` and its blurb becomes `og:description`
3. **First content elements** -- the first `<h1>` becomes `og:title`, the first `<p>` becomes `og:description`, the first `<img>` becomes `og:image`

### Injection

The `ThemeShell` Svelte component automatically injects both JSON-LD scripts and OG meta tags into the page `<head>`:

```html
<svelte:head>
  {#if page.seo?.og.title}
    <title>{page.seo.og.title}</title>
    <meta property="og:title" content={page.seo.og.title} />
  {/if}
  {#each page.seo.jsonLd as schema}
    {@html `<script type="application/ld+json">${JSON.stringify(schema)}</script>`}
  {/each}
</svelte:head>
```

{% hint type="note" %}
No configuration or annotation is required from the content author. Write a recipe, get Recipe structured data. Write an FAQ, get FAQPage structured data.
{% /hint %}

---

## 7. Build Pipeline

### Dev Mode

In development, the system uses SvelteKit's catch-all `[...slug]` route for on-demand rendering:

1. **Content directory watching** -- The Vite plugin watches the content directory for `.md` file changes (adds, edits, deletes) and triggers full page reloads via WebSocket.

2. **On-demand parsing** -- Each page request parses the Markdown through the full pipeline: `ContentTree` -> frontmatter extraction -> Markdoc parse/transform -> SEO extraction -> serialization -> identity transform.

3. **Vite HMR** -- Theme component changes (Svelte files, CSS) use standard Vite hot module replacement for instant updates.

### Virtual Modules

The Vite plugin (`@refrakt-md/sveltekit`) provides three virtual modules that decouple the application from hardcoded theme references:

| Virtual Module | Provides |
|---------------|----------|
| `virtual:refrakt/theme` | The resolved theme object (component registry, layouts, manifest). Supports component overrides from `refrakt.config.json` |
| `virtual:refrakt/tokens` | CSS import for the theme's design token file |
| `virtual:refrakt/config` | The project configuration as a JSON module |

The theme virtual module is particularly interesting. If the project defines component overrides in `refrakt.config.json`, the plugin generates import code that merges overrides into the base theme:

```json
{
  "contentDir": "./content",
  "theme": "@refrakt-md/lumina",
  "target": "sveltekit",
  "overrides": {
    "Hero": "./src/components/MyHero.svelte"
  }
}
```

This produces a virtual module that imports the base theme, imports the override, and merges them -- no build configuration gymnastics required.

### Content Pipeline

The full content pipeline flows through these stages:

{% steps headingLevel=3 %}
### ContentTree
Filesystem scan with deterministic ordering.

### Frontmatter parsing
YAML extraction and route resolution.

### Layout resolution
Walk directory tree, collect `_layout.md` chain, merge regions by mode.

### Markdoc transform
Parse AST, apply rune schemas, transform to renderable tree.

### SEO extraction
Walk renderable tree, generate JSON-LD and Open Graph meta.

### Serialization
Convert Markdoc Tag instances to plain objects for SSR transfer.

### Identity transform
Apply BEM classes, structural injection, and meta consumption.

### Syntax highlight transform
Walk the tree, find elements with `data-language` and text children, apply Shiki highlighting with CSS variables, and set `data-codeblock` for raw HTML injection. Unknown languages fall back to plain text.

### Renderer
Svelte recursive component with `typeof`-based component dispatch.

### HTML output
Static HTML ready for the browser.
{% /steps %}

### Static Output

For production, SvelteKit's prerender adapter generates static HTML for every page. The sitemap generator produces a `sitemap.xml` with:
- Draft pages excluded
- Priority assigned by URL depth (root = 1.0, top-level = 0.8, deeper = 0.6)

---

## 8. AI Content Generation

refrakt.md includes a built-in CLI for generating content using large language models. The system leverages the rune definitions themselves to teach the LLM how to write refrakt.md content.

### How It Works

The `refrakt write` command:

1. **Auto-generates a system prompt** from the rune registry. Every author-facing rune's name, aliases, description, attributes (with types and allowed values), content reinterpretation rules, and a usage example are serialized into a comprehensive prompt. Internal/child-only runes (like `step`, `tab`, `accordion-item`) are excluded.

2. **Sends the prompt** to the configured AI provider with the user's content request.

3. **Streams the output** to stdout or writes it to a file.

```bash
# Generate to stdout
refrakt write "Create a getting started guide for a Node.js framework"

# Generate to a file
refrakt write -o content/docs/api.md "Write an API reference page"

# Use a specific provider and model
refrakt write -p ollama -m llama3.2 "Write a FAQ page about billing"

# Anthropic (auto-detected from env var)
ANTHROPIC_API_KEY=sk-... refrakt write "Create a landing page with pricing"
```

### Providers

| Provider | Detection | Default Model |
|----------|-----------|---------------|
| **Anthropic** (Claude) | `ANTHROPIC_API_KEY` environment variable | `claude-sonnet-4-5-20250929` |
| **Ollama** (local models) | `OLLAMA_HOST` env var, or default `localhost:11434` | `llama3.2` |

Provider auto-detection checks for `ANTHROPIC_API_KEY` first, then falls back to Ollama. Both providers use streaming responses.

### System Prompt Design

The generated system prompt teaches the LLM:
- The `{% tag %}...{% /tag %}` Markdoc syntax
- Frontmatter conventions (`title`, `description`)
- Every rune's attributes with types and valid values
- How each rune reinterprets Markdown (e.g., "heading -> tab name" for tabs)
- Concrete examples of each rune's usage
- Nesting rules (e.g., `{% tier %}` inside `{% pricing %}`)
- The horizontal rule delimiter convention for grids and code groups

{% hint type="note" %}
Because the prompt is generated from the actual rune metadata, it stays perfectly synchronized with the rune library -- no separate documentation to maintain.
{% /hint %}

---

## 9. Component Registry

The component registry is the dispatch mechanism that connects the framework-agnostic renderable tree to framework-specific interactive components.

### How Dispatch Works

Every rune's Markdoc transform outputs a tag with a `typeof` attribute. This attribute carries the rune's type name (`Hero`, `TabGroup`, `Accordion`, `DataTable`, etc.) through serialization and into the renderer.

The Svelte `Renderer` component checks each tag:

```html
{@const Component = node.attributes?.typeof
  ? getComponent(node.attributes.typeof)
  : undefined}

{#if Component}
  <Component tag={node}>
    {#each node.children as child}
      <Renderer node={child} />
    {/each}
  </Component>
{:else}
  <svelte:element this={node.name} {...htmlAttrs(node.attributes)}>
    ...
  </svelte:element>
{/if}
```

If a component is registered for that `typeof` value, it gets rendered. Otherwise, the tag is rendered as plain HTML with its BEM classes (applied by the identity transform). This means:

- **Interactive runes** (tabs, accordion, datatable, form, diagram, reveal, chart) are handled by Svelte components that add behavior.
- **Static runes** (hero, hint, cta, feature, breadcrumb, timeline, changelog, recipe, howto, event, cast, organization, figure, sidenote, annotate, conversation, etc.) are fully rendered by the identity transform + CSS. They produce semantic HTML with BEM classes, and the theme's CSS handles all presentation.

### Theme Manifest Declaration

The theme manifest declares which components handle which rune types. This is a static declaration that tells the system what the theme supports:

```json
{
  "components": {
    "TabGroup": { "component": "components/Tabs.svelte" },
    "DataTable": { "component": "components/DataTable.svelte" },
    "Nav": { "component": "components/Nav.svelte" },
    "Pricing": { "component": "components/Pricing.svelte" }
  },
  "unsupportedRuneBehavior": "passthrough"
}
```

When `unsupportedRuneBehavior` is set to `"passthrough"`, runes without a matching component are rendered as plain HTML with their BEM classes. This means a theme can support a subset of runes and still render the rest with reasonable defaults.

### Component Override System

Projects can override any theme component via `refrakt.config.json` without forking the theme:

```json
{
  "overrides": {
    "Hero": "./src/components/MyCustomHero.svelte",
    "Pricing": "./src/components/MyPricing.svelte"
  }
}
```

The Vite plugin merges these overrides into the theme's component registry at build time, so the override component receives the same `tag` prop (the serialized renderable tree node) as the original.

### Context System

The component registry and element overrides are distributed through Svelte's context API. The `ThemeShell` component sets them up during initialization:

```typescript
setRegistry(theme.components);       // Rune typeof -> Svelte component
setElementOverrides(theme.elements); // HTML element -> Svelte component override
setContext('pages', page.pages);     // Page list for navigation
```

Any component in the tree can then call `getComponent('TabGroup')` to resolve the registered component for a given type name, enabling nested runes to dispatch correctly regardless of their depth in the component tree.
