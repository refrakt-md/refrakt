{% work id="WORK-179" status="done" priority="high" complexity="moderate" tags="nav, behaviors, postprocess, a11y" source="SPEC-046" milestone="v0.13.0" %}

# Collapsible sidebar nav with URL-aware auto-open

Add a `collapsible` modifier to the `nav` rune that turns each `NavGroup` into a collapsible disclosure. Default behaviour: the group containing the current page auto-expands; all others start collapsed. Authors can override per-group via a `defaultOpen` attribute. Authors never write per-heading state markers; the postProcess pipeline figures out "which one is open" from the current URL.

## Acceptance Criteria

- [x] `nav` rune accepts a `collapsible` boolean attribute (only meaningful when `layout="vertical"` / default)
- [x] `nav` rune accepts a `defaultOpen` attribute (comma-separated group titles, case-sensitive match) that overrides auto-open
- [x] Engine config emits `.rf-nav--collapsible` modifier class on the wrapping `<nav>` when the attribute is set
- [x] When the parent nav is collapsible, each `NavGroup` is emitted with `data-collapsed="auto"` and a property listing the URLs / slugs of its child items
- [ ] Core `postProcess` hook in `corePipelineHooks` (`packages/runes/src/config.ts` or its companion file) walks the renderable tree, finds `NavGroup` nodes with `data-collapsed="auto"`, and rewrites the attribute based on the current page URL:
  - The group containing the current page URL becomes `data-collapsed="false"`
  - All other auto groups become `data-collapsed="true"`
  - Group titles named in `defaultOpen` also become `data-collapsed="false"` regardless of URL match
- [x] `@refrakt-md/behaviors` ships a `nav-collapsible` behavior that listens for clicks on group headers and toggles `data-collapsed` between `"true"` and `"false"`
- [x] Group header is keyboard-focusable, `Enter` / `Space` toggle, `aria-expanded` reflects state, `aria-controls` points at the items container
- [x] Lumina CSS styles `[data-collapsed="true"]` to hide the items list and `[data-collapsed="false"]` to show it, with a chevron / indicator on the group header that reflects state
- [x] Existing non-collapsible nav (`{% nav %}` without the modifier) renders byte-identical output to today
- [x] `npx refrakt inspect nav --collapsible` shows expected output including `data-collapsed` sentinel attributes

Reference doc page (`site/content/runes/nav.md`) updates and enabling `collapsible` on the live refrakt.md sidebars are owned by {% ref "WORK-183" /%} and {% ref "WORK-184" /%} respectively.

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

## Resolution

Completed: 2026-05-18

Branch: `claude/v0.13-pagination-nav-bvuEP`

### What was done
- `packages/runes/src/tags/nav.ts` — added `collapsible` and `defaultOpen` attributes to the schema. When `collapsible` is set, the nav emits `data-collapsible="true"`, adds the `rf-nav--collapsible` BEM class, optionally carries `data-default-open`, and each NavGroup is marked with `data-collapsed="auto"`.
- `packages/runes/src/config.ts` — added `resolveCollapsibleNavs` to `corePipelineHooks.postProcess`. Walks the renderable tree, finds NavGroups with `data-collapsed="auto"` inside a collapsible nav, resolves item URLs (explicit hrefs + slug→URL via `pagesByUrl` using the same suffix-match-with-shared-prefix-tiebreak as the runtime), and rewrites `data-collapsed` to `"false"` (open) when any item URL matches the current page URL (exact or path prefix) or the group title appears in `defaultOpen`, else `"true"`.
- `packages/behaviors/src/behaviors/nav-collapsible.ts` — new behavior. Registered on `data-rune="nav"`; activates only when `data-collapsible="true"`. Wires click + keyboard toggle on the group heading; sets ARIA `role="button"`, `tabindex`, `aria-controls`, `aria-expanded`.
- `packages/lumina/styles/runes/nav.css` — added `.rf-nav--collapsible` rules. `[data-collapsed="true"]` hides the items list; the group heading shows a chevron that rotates with state. Keyboard focus ring on the heading.

### Notes
- The `collapsible` modifier isn't routed through the engine's modifier system because the engine emits `block--{value}` from the raw value (`true` → `rf-nav--true`). Setting the class + data attribute directly in the schema is cleaner and avoids changing engine semantics.
- Slug→URL resolution mirrors the runtime `RfNav` web component (suffix match + longest shared prefix). This keeps build-time auto-open consistent with how slug-based items resolve in the browser.
- URL matching uses exact equality OR path prefix (item URL + `/`), so an item URL like `/docs/` opens the group when the reader is on `/docs/install`.
- The behavior is registered against the `nav` rune name; it short-circuits when `data-collapsible !== "true"`, so non-collapsible navs pay no runtime cost.

{% /work %}
