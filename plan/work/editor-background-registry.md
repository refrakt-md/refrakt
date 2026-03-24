{% work id="WORK-056" status="ready" priority="medium" complexity="complex" tags="editor, pipeline" milestone="v0.9.0" %}

# Editor Background Entity Registry

> Ref: SPEC-002 (Cross-Page Pipeline — Editor Integration)

## Summary

The editor needs cross-page awareness for preview rendering — breadcrumbs need the page hierarchy, bold entity names should show as links, glossary terms should be highlighted. But the editor only has the current page loaded. A background entity registry solves this: a web worker scans all project files on open and builds the same `EntityRegistry` the build pipeline uses.

Before the registry is ready, cross-page runes render as visually distinct placeholders. Once ready, the page re-renders with resolved references.

## Acceptance Criteria

- [ ] A web worker scans all project `.md` files on editor startup and builds an `EntityRegistry`
- [ ] The worker performs a lightweight pass — extracting rune tags and name attributes, not running full transforms
- [ ] The registry is shared with the main thread and available to the preview renderer
- [ ] The preview pipeline gains a post-process step: `parse → rune transform → post-process(registry) → identity transform → render`
- [ ] Cross-page runes render as placeholders before the registry is ready (dashed border, muted colour)
- [ ] Placeholders resolve to final content once the registry completes
- [ ] Registry updates incrementally when a page is saved — only re-registers entities from the changed page
- [ ] Entity changes (rune added/removed, name attribute changed) trigger re-registration; prose changes do not
- [ ] If multiple tabs are open, registry is shared — renaming an entity in tab A updates references in tab B
- [ ] Performance: a 200-page project scans in under 2 seconds

## Approach

**Web worker:** Create a worker that receives the project root path, globs for `.md` files, and for each file: parses frontmatter (title, slug), scans for `{% rune_name %}` tags using a lightweight regex or Markdoc parse, extracts `name`/`id` attributes and headings. Produces `EntityRegistration[]` matching the build-time format.

**Integration:** On project open, spawn the worker. The preview renderer checks for registry availability. If absent, skip post-processing (placeholders render). When the worker sends results, store the registry in a shared store and trigger re-render of the current page.

**Incremental updates:** Track which entities came from which file. On save, re-scan only the changed file, diff its entity list against the previous scan, and update the registry if changed. Debounce aggregation re-runs (200ms).

**Placeholder styling:** Add CSS for `.rf-placeholder` class: dashed border, muted text colour, subtle "resolves at build time" tooltip.

## References

- SPEC-002 (Cross-Page Pipeline — Editor Integration, Background Registry, Placeholder Rendering)

{% /work %}
