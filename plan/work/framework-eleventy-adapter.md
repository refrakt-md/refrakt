{% work id="WORK-092" status="done" priority="low" complexity="simple" tags="frameworks, eleventy" milestone="v1.0.0" source="ADR-002,SPEC-030" %}

# Create @refrakt-md/eleventy adapter package

Build the Eleventy (11ty v3) framework adapter. The simplest integration — no Vite, no bundler, no framework. Just global data files, templates, and `renderToHtml()`.

## Acceptance Criteria

- [x] `packages/eleventy/` package exists with correct `package.json` (peer dep `@11ty/eleventy@^3.0.0`)
- [x] Eleventy plugin (`plugin.js`) configures passthrough copy for Lumina CSS and optionally behaviors JS
- [x] Data file factory (`data.js`) calls `loadContent()` + `createTransform()` + `layoutTransform()` + `renderToHtml()` for each page
- [x] Example base template (`base.njk`) renders page HTML via `| safe`, includes SEO meta tags, links CSS, and initializes behaviors
- [x] Content directory is kept separate from Eleventy's template discovery (no Markdown-it collision)
- [x] Pagination config generates one page per content item with correct permalinks
- [x] Behavior initialization via `<script type="module">` in template (with bundled or passthrough-copied behaviors JS)
- [x] Works with Eleventy 3.0 ESM-native mode
- [x] Example site renders core runes, layouts, behaviors, and web components correctly
- [x] Adapter documentation page at `site/content/docs/adapters/eleventy.md` with installation, project structure, configuration, code examples (plugin setup, global data file, base template, pagination config, behavior script, CSS passthrough), and getting-started guide matching the depth of existing SvelteKit adapter docs

## Approach

Eleventy's data cascade is the natural integration point. A global data file runs the entire refrakt pipeline at build time, producing pre-rendered HTML for each page. Eleventy pagination creates one output page per content item. The template is a thin Nunjucks wrapper providing the `<html>` shell.

No HMR infrastructure needed — Eleventy's `--serve` mode with BrowserSync triggers full rebuilds on content change, and `loadContent()` re-reads on each call.

For behaviors JS, either use a simple esbuild step to bundle `@refrakt-md/behaviors` for the browser, or serve directly from node_modules via passthrough copy.

## Dependencies

- {% ref "WORK-088" /%} (shared utility extraction)

## References

- {% ref "SPEC-030" /%} (Phase 4)
- {% ref "ADR-002" /%} (Eleventy section)

## Resolution

Completed: 2026-04-04

Branch: `claude/implement-spec-030-F0LFn`

### What was done
- Created `packages/eleventy/` with createDataFile factory, refraktPlugin, base.njk template
- Data file loads content, applies layout transform + renderToHtml, produces pre-rendered pages
- Lumina Eleventy adapter at `packages/lumina/eleventy/index.ts`
- Docs page at `site/content/docs/adapters/eleventy.md`

### Notes
- Simplest adapter: no Vite, no bundler — just data files and templates
- Uses dynamic import for @refrakt-md/content to avoid bundling issues
- Template uses Nunjucks | safe filter for HTML injection

{% /work %}
