{% work id="WORK-179" status="ready" priority="high" complexity="moderate" tags="nav, behaviors, postprocess, a11y" source="SPEC-046" milestone="v0.13.0" %}

# Collapsible sidebar nav with URL-aware auto-open

Add a `collapsible` modifier to the `nav` rune that turns each `NavGroup` into a collapsible disclosure. Default behaviour: the group containing the current page auto-expands; all others start collapsed. Authors can override per-group via a `defaultOpen` attribute. Authors never write per-heading state markers; the postProcess pipeline figures out "which one is open" from the current URL.

## Acceptance Criteria

- [ ] `nav` rune accepts a `collapsible` boolean attribute (only meaningful when `layout="vertical"` / default)
- [ ] `nav` rune accepts a `defaultOpen` attribute (comma-separated group titles, case-sensitive match) that overrides auto-open
- [ ] Engine config emits `.rf-nav--collapsible` modifier class on the wrapping `<nav>` when the attribute is set
- [ ] When the parent nav is collapsible, each `NavGroup` is emitted with `data-collapsed="auto"` and a property listing the URLs / slugs of its child items
- [ ] Core `postProcess` hook in `corePipelineHooks` (`packages/runes/src/config.ts` or its companion file) walks the renderable tree, finds `NavGroup` nodes with `data-collapsed="auto"`, and rewrites the attribute based on the current page URL:
  - The group containing the current page URL becomes `data-collapsed="false"`
  - All other auto groups become `data-collapsed="true"`
  - Group titles named in `defaultOpen` also become `data-collapsed="false"` regardless of URL match
- [ ] `@refrakt-md/behaviors` ships a `nav-collapsible` behavior that listens for clicks on group headers and toggles `data-collapsed` between `"true"` and `"false"`
- [ ] Group header is keyboard-focusable, `Enter` / `Space` toggle, `aria-expanded` reflects state, `aria-controls` points at the items container
- [ ] Lumina CSS styles `[data-collapsed="true"]` to hide the items list and `[data-collapsed="false"]` to show it, with a chevron / indicator on the group header that reflects state
- [ ] Existing non-collapsible nav (`{% nav %}` without the modifier) renders byte-identical output to today
- [ ] `npx refrakt inspect nav --collapsible` shows expected output including `data-collapsed` sentinel attributes
- [ ] Authoring docs include a collapsible sidebar example

## Approach

The auto-open postProcess hook needs the **current page URL** at the time it runs. Verify in {% ref "WORK-178" /%} (or in this item's spike) that `TransformedPage` exposes a URL field to plugin postProcess hooks via the pipeline signature. If it doesn't, widen the signature first — this is a small change to `packages/types/src/pipeline.ts` and `packages/content/src/pipeline.ts`.

URL matching: the schema emits each `NavGroup`'s child item URLs as a property (already resolved by the existing slug-resolution path in `nav.ts`). The postProcess hook does string comparison against the page's URL with simple prefix matching so that `/docs/install` is contained within a group listing `/docs/`.

The behaviour is intentionally **flat — no `localStorage`, no animation, no remembered state**. Click expands or collapses; URL change re-runs auto-open at build time. Persisted "I clicked closed, keep it closed across navigations" state is a future enhancement, not part of this item.

`defaultOpen` is comma-separated group titles. Compare on the title text the author wrote in the heading (`## Getting Started` → match against `"Getting Started"`). Whitespace trimmed, otherwise exact match.

## Dependencies

- {% ref "WORK-178" /%} — needs the `layout` foundation in place so the `collapsible` modifier composes cleanly with `layout="vertical"`.

## References

- {% ref "SPEC-046" /%} — full design, especially "Auto-Open for Collapsible Sidebars".
- `packages/content/src/pipeline.ts` — `runPipeline()`, Phase 4 (postProcess) — where the auto-open resolution runs.
- `packages/runes/src/tags/breadcrumb.ts` — reference for an existing sentinel-based postProcess pattern (`BREADCRUMB_AUTO_SENTINEL`).
- `packages/behaviors/` — directory layout for new behaviors.

{% /work %}
