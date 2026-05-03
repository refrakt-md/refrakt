{% spec id="SPEC-044" status="draft" tags="cli, mcp, content, ai-workflow" %}

# Agent content rendering and validation tools

Tools and resources that close the agent's content-authoring inner loop. Today an AI agent writing refrakt content can read the rune reference, inspect a single rune in isolation, and run the build — but there's no way to render or validate an arbitrary Markdown snippet without the build, and no structured listing of the site's pages.

## Problem

The MCP surface added by {% ref "SPEC-043" /%} has good *introspection* tools (`refrakt.inspect`, `refrakt.contracts`, `refrakt.reference`) but the *authoring loop* is incomplete:

**No way to preview a snippet.** `refrakt.inspect` shows what a single rune produces with given attrs — useful for understanding rune output, but nothing for an agent that's just composed a multi-rune page or a section. The only way to see the rendered HTML of a snippet today is to write the file, run the build, and read the output. That's a slow, side-effecting loop.

**No way to validate a snippet.** Similar gap: an agent writing a `recipe` or `api` rune has to hope its attributes are correct. Markdoc parse errors only surface at build time. There's no "did I write this correctly?" tool that returns structured errors for missing required attributes, wrong heading levels, unknown rune names, etc.

**No structured listing of site pages.** `refrakt://plan/index` exposes every plan entity. There's no equivalent for actual content pages. An agent helping with content authoring has to walk the filesystem to know what pages exist, what URL each maps to, what layout each uses, or what frontmatter shape each layout expects.

-----

## Design Principles

**Render and validate take snippets, not files.** The unit of work is a Markdown string with optional frontmatter and an optional layout name. Agents can compose, validate, and preview without touching the filesystem. Once the snippet is good, the agent writes it via the existing file-write tools.

**Render reuses the production pipeline.** No second renderer to keep in sync — the tool calls the same Markdoc parse → schema transforms → identity transform → renderToHtml chain that the build uses, with the same merged package set.

**Validate is render-without-render.** Same input shape, but stops after the schema transform stage. Returns structured errors (where in the snippet, what's missing, what the rune expected). Cheaper than render, suitable for tight inner loops.

**Pages-index is a thin EntityRegistry projection.** The cross-page pipeline already builds an `EntityRegistry` of every page. A new `refrakt://pages/index` resource exposes that registry — no new scanning, just re-shape the data.

-----

## Tool Surface

| Tool / Resource | Inputs | Outputs |
|---|---|---|
| `refrakt.render` | `markdown: string`, `frontmatter?: object`, `layout?: string`, `site?: string` | `{ html, tree, seo, meta, warnings }` — full pipeline output for the snippet |
| `refrakt.validate_content` | `markdown: string`, `frontmatter?: object`, `site?: string` | `{ errors: [{ severity, line, column, message, suggestion? }], runesUsed: string[] }` |
| `refrakt://pages/index` | (resource) | List of `{ url, file, layout, runes, title, frontmatter }` for every page in the active site |
| `refrakt://pages/<url>` | (resource, optional) | Per-page detail: same as above plus parsed body tree |

`refrakt.render` and `refrakt.validate_content` accept the same input core, so callers can validate-then-render with the same payload.

-----

## Acceptance Criteria

- [ ] `refrakt.render` MCP tool accepting Markdown snippet plus optional frontmatter/layout and returning `{ html, tree, seo, meta, warnings }`
- [ ] `refrakt.render` reuses the production pipeline (no second renderer)
- [ ] `refrakt.render` honors the project's installed packages — community runes resolve correctly
- [ ] `refrakt.validate_content` MCP tool returning structured errors with line/column/message/suggestion
- [ ] Validation errors include unknown rune names, missing required attributes, invalid attribute values (per rune schema), and Markdoc parse errors
- [ ] `refrakt://pages/index` resource listing every site page with URL, file path, layout, runes used, title, and frontmatter
- [ ] Pipeline state cached across calls within a server lifetime; cache invalidates on `refrakt.config.json` mtime change
- [ ] First-call latency documented (cold cache should be a few seconds; warm cache should be milliseconds)
- [ ] Error shape matches the existing MCP error contract (`errorCode`, `hint`)
- [ ] CLI parity: `refrakt render` and `refrakt validate-content` commands wrap the same logic, per the "wrap the CLI" principle from {% ref "SPEC-043" /%}
- [ ] Documented in `site/content/docs/mcp/` alongside the existing tool reference

-----

## Open Questions

**Snippet caching.** A common agent pattern is "render this ten times with small edits." Should the server cache parsed Markdoc ASTs by content hash to skip the parse stage? Profile first; only cache if the parse stage is actually hot.

**Cross-snippet registry.** Some runes (`breadcrumb`, `nav` auto-link) need the EntityRegistry of *all* pages to render correctly. For an isolated snippet, those resolve to "no data" warnings. Worth documenting; not worth fixing in v1.

**`pages/<url>` granularity.** The per-page resource is listed as optional because the index plus a file read covers most use cases. Add only if agents reach for it repeatedly.

{% /spec %}
