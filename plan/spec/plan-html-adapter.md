{% spec id="SPEC-014" status="draft" tags="plan, html, themes, architecture" %}

# Plan Site via HTML Adapter

> Refactor `plan serve` and `plan build` to render through `@refrakt-md/html` instead of a bespoke HTML pipeline, and introduce a `planLayout` in the transform layer.

## Problem

The plan site (`plan serve` / `plan build`) currently maintains its own HTML rendering pipeline:

- A hand-rolled HTML shell template with inline `<style>` and hardcoded sidebar markup
- Direct `renderToHtml()` calls bypassing the layout transform system
- Hardcoded Lumina base CSS resolution via `getLuminaBaseCss()`
- Its own `escapeHtml`, nav rendering, and document structure

Meanwhile, `@refrakt-md/html` already provides a framework-agnostic rendering path that solves all of these:

- `renderFullPage()` — complete `<!DOCTYPE html>` documents with SEO meta, script injection, stylesheet links
- `layoutTransform()` — the same layout system used by docs, blog, and default layouts
- `HtmlTheme` — a clean abstraction over layouts + manifest, decoupled from any specific theme
- Client-side `initPage()` — progressive enhancement for interactive runes via `@refrakt-md/behaviors`

The plan site is essentially a lightweight refrakt site with plan-specific content loading. It should use the same rendering infrastructure.

## Goals

1. **Remove the bespoke HTML pipeline** from `@refrakt-md/plan` — use `@refrakt-md/html` instead
2. **Define a `planLayout`** in `@refrakt-md/transform` alongside `docsLayout` and `blogArticleLayout`
3. **Decouple from Lumina** — any theme that provides plan layout CSS works; the built-in plan styles (`default.css`, `minimal.css`) remain as fallbacks
4. **Preserve all existing functionality** — sidebar nav, auto-generated dashboard, hot reload, static build, theme selection, base-url support
5. **Add syntax highlighting** — apply `@refrakt-md/highlight` to code fences so plan content gets proper code coloring
6. **Enable client behaviors** — load `@refrakt-md/behaviors` via `initPage()` to provide copy-to-clipboard on code blocks

## Design

### Architecture

```
plan serve / plan build
  ├── Scanner (plan-specific content loading — unchanged)
  ├── Pipeline hooks: register/aggregate/postProcess (unchanged)
  ├── Auto-generated dashboard content (unchanged)
  ├── @refrakt-md/highlight
  │    └── createHighlightTransform() → walk tree, apply Shiki, emit CSS
  ├── @refrakt-md/behaviors (client-side)
  │    └── initPage() → copy-to-clipboard on all <pre> elements
  └── @refrakt-md/html
       ├── renderFullPage(input, options)
       │   ├── layoutTransform(planLayout, pageData)
       │   └── renderToHtml(tree)
       └── HtmlTheme { manifest, layouts: { plan: planLayout } }
```

### Plan Layout (`planLayout`)

A new `LayoutConfig` in `packages/transform/src/layouts.ts`:

- **Block name**: `plan`
- **Slots**:
  - `sidebar` — fixed sidebar navigation (source: `region:nav`)
  - `main` — primary content area (source: `content`)
- **No computed content** — no TOC, no breadcrumb, no version switcher
- **No behaviors** — no mobile menu, no search (plan sites are simple)

The sidebar structure (group titles, entity links, active state) is built by `@refrakt-md/plan` and passed as the `nav` region in `LayoutPageData.regions`. The layout just places it.

### Theme Resolution

Current `--theme` flag semantics are preserved but the implementation changes:

| `--theme` value | Behaviour |
|-----------------|-----------|
| `default` | Built-in plan styles from `runes/plan/styles/default.css` — includes tokens, entity cards, sidebar, dashboard grid |
| `minimal` | Built-in plan styles from `runes/plan/styles/minimal.css` — print-friendly, no sidebar |
| Path to CSS file | User-provided CSS, passed as a stylesheet to `renderFullPage()` |

The key change: instead of inlining CSS into a `<style>` tag, stylesheets are passed to `renderFullPage()` via the `stylesheets` option. For built-in themes, the CSS is written to the output directory (for `build`) or served from a route (for `serve`).

The `@refrakt-md/lumina` dependency is removed from `@refrakt-md/plan`. The plan's built-in themes include their own base reset/typography tokens (they already do via `tokens.css`).

### Navigation as a Region

The sidebar navigation is currently built by `buildNavigation()` in `render-pipeline.ts` and rendered directly into the HTML shell. Under the new design:

1. `buildNavigation()` still builds the `NavGroup[]` structure
2. A new `buildNavRegion()` function converts it into a renderable tag tree (serialized tags with BEM classes matching the existing `.rf-plan-sidebar__*` selectors)
3. This tree is passed as `regions.nav` in the `LayoutPageData` given to `renderFullPage()`
4. The `planLayout` places the `nav` region in the sidebar slot

This keeps the plan-specific nav logic in `@refrakt-md/plan` while the structural placement is handled by the layout system.

### HtmlTheme Assembly

`@refrakt-md/plan` assembles a minimal `HtmlTheme` for the plan site:

```ts
const planTheme: HtmlTheme = {
  manifest: {
    name: 'plan',
    routeRules: [{ match: '**', layout: 'plan' }],
  },
  layouts: {
    plan: planLayout,
  },
};
```

All routes use the plan layout. The theme is constructed internally — users don't need to configure it.

### Page Data Construction

For each entity page and the dashboard, `@refrakt-md/plan` builds a `LayoutPageData`:

```ts
{
  renderable: serializedTree,    // Markdoc → serialize → identity transform
  regions: { nav: navTree },     // sidebar navigation as renderable tree
  title: page.title,
  url: page.url,
  pages: allPageUrls,
  frontmatter: {},
  headings: [],
}
```

### Syntax Highlighting

The current plan site renders code fences as plain `<pre><code>` with no coloring. The refactored pipeline adds `@refrakt-md/highlight`:

1. **Build time**: `createHighlightTransform()` returns an async tree-walker that finds all elements with `data-language` attributes and applies Shiki syntax highlighting
2. **Apply**: After serialization and identity transform, run the highlight transform on the tree before passing it to `renderToHtml()`
3. **CSS**: The transform exposes a `.css` property containing the generated highlight theme CSS — this is concatenated with the plan theme CSS and served as a single stylesheet

```ts
const highlightTransform = await createHighlightTransform();
const highlighted = await highlightTransform(transformed);
// highlightTransform.css → append to theme stylesheet
```

The highlight transform uses CSS variables by default, so it inherits light/dark mode from the plan theme automatically. No additional configuration needed.

This adds `@refrakt-md/highlight` as a dependency of `@refrakt-md/plan`. The highlight package depends on Shiki (already a project dependency via the editor).

### Client Behaviors

The copy-to-clipboard button (and any future behaviors) are provided by `@refrakt-md/behaviors`, loaded client-side via the `initPage()` entry point from `@refrakt-md/html/client`.

**What this enables:**
- Copy button (clipboard icon) on all `<pre>` code blocks — automatic, no per-block opt-in
- Foundation for future interactive behaviors if plan runes ever need them (e.g., collapsible sections)

**How it's wired in:**

- `serve`: The behaviors JS bundle is served at `/__plan-behaviors.js` and included via the `scripts` option on `renderFullPage()`
- `build`: The bundle is written to `{out}/behaviors.js` and referenced by all pages

The behaviors bundle is small (~4KB gzipped) and has no framework dependencies. The copy behavior wraps each `<pre>` in a `.rf-code-wrapper` div and injects a button — the plan theme CSS needs a few selectors to style these (`.rf-code-wrapper`, `.rf-copy-button`, `.rf-copy-button--copied`).

### Serve Command Changes

- The HTTP server serves HTML from `renderFullPage()` output (as before, but using the HTML adapter)
- Built-in theme CSS is served at `/__plan-theme.css` and referenced via `stylesheets: ['/__plan-theme.css']`
- SSE hot reload script is injected via the `headExtra` option on `renderFullPage()`
- The `pageIndex` map is rebuilt on file changes (unchanged)

### Build Command Changes

- Theme CSS is written to `{out}/theme.css`
- Entity pages reference `../theme.css` or `{baseUrl}theme.css`
- `renderFullPage()` handles the document shell (unchanged interface for callers)

## Package Dependency Changes

**Before:**
```
@refrakt-md/plan → @refrakt-md/runes, @refrakt-md/transform, @refrakt-md/types, @refrakt-md/lumina
```

**After:**
```
@refrakt-md/plan → @refrakt-md/runes, @refrakt-md/transform, @refrakt-md/types, @refrakt-md/html, @refrakt-md/highlight
```

`@refrakt-md/lumina` is no longer a dependency. `@refrakt-md/html` is added (it only depends on `transform` + `types`, so no new transitive dependencies). `@refrakt-md/highlight` is added for syntax highlighting (depends on Shiki). `@refrakt-md/behaviors` is a runtime dependency loaded client-side — not a build-time package dependency.

## Scope Boundaries

**In scope:**
- `planLayout` in `packages/transform/src/layouts.ts`
- Refactor `render-pipeline.ts` to use `renderFullPage()` from `@refrakt-md/html`
- Navigation region builder
- Syntax highlighting via `@refrakt-md/highlight` in the render pipeline
- Client behaviors bundle (copy-to-clipboard) via `@refrakt-md/behaviors`
- Copy button styling in plan theme CSS (`.rf-code-wrapper`, `.rf-copy-button`)
- Remove `getLuminaBaseCss()` and the bespoke HTML shell
- Update `@refrakt-md/plan` dependencies
- Plan layout CSS in Lumina (`packages/lumina/styles/layouts/plan.css`) — optional, for users who want plan content in a Lumina-themed site
- Update existing tests

**Out of scope:**
- Embedding plan content inside a regular refrakt site (future work — requires content loading integration)
- Custom highlight themes or language configuration (use defaults)
- New plan CLI commands or options

## Migration

The refactoring is internal to `@refrakt-md/plan`. The CLI interface (`plan serve`, `plan build`) and all flags remain identical. Users see no change in behaviour — only the internal rendering path changes.

{% /spec %}
