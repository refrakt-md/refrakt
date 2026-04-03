{% work id="WORK-092" status="ready" priority="low" complexity="simple" tags="frameworks, eleventy" milestone="v1.0.0" %}

# Create @refrakt-md/eleventy adapter package

Build the Eleventy (11ty v3) framework adapter. The simplest integration — no Vite, no bundler, no framework. Just global data files, templates, and `renderToHtml()`.

## Acceptance Criteria

- [ ] `packages/eleventy/` package exists with correct `package.json` (peer dep `@11ty/eleventy@^3.0.0`)
- [ ] Eleventy plugin (`plugin.js`) configures passthrough copy for Lumina CSS and optionally behaviors JS
- [ ] Data file factory (`data.js`) calls `loadContent()` + `createTransform()` + `layoutTransform()` + `renderToHtml()` for each page
- [ ] Example base template (`base.njk`) renders page HTML via `| safe`, includes SEO meta tags, links CSS, and initializes behaviors
- [ ] Content directory is kept separate from Eleventy's template discovery (no Markdown-it collision)
- [ ] Pagination config generates one page per content item with correct permalinks
- [ ] Behavior initialization via `<script type="module">` in template (with bundled or passthrough-copied behaviors JS)
- [ ] Works with Eleventy 3.0 ESM-native mode
- [ ] Example site renders core runes, layouts, behaviors, and web components correctly
- [ ] Adapter documentation page at `site/content/docs/adapters/eleventy.md` with installation, project structure, configuration, code examples (plugin setup, global data file, base template, pagination config, behavior script, CSS passthrough), and getting-started guide matching the depth of existing SvelteKit adapter docs

## Approach

Eleventy's data cascade is the natural integration point. A global data file runs the entire refrakt pipeline at build time, producing pre-rendered HTML for each page. Eleventy pagination creates one output page per content item. The template is a thin Nunjucks wrapper providing the `<html>` shell.

No HMR infrastructure needed — Eleventy's `--serve` mode with BrowserSync triggers full rebuilds on content change, and `loadContent()` re-reads on each call.

For behaviors JS, either use a simple esbuild step to bundle `@refrakt-md/behaviors` for the browser, or serve directly from node_modules via passthrough copy.

## Dependencies

- WORK-088 (shared utility extraction)

## References

- SPEC-030 (Phase 4)
- ADR-002 (Eleventy section)

{% /work %}
