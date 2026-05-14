{% spec id="SPEC-047" status="draft" tags="pagination, nav, docs, sequential-reading" %}

# Sequential page navigation

Add a `pagination` rune for prev/next links in sequential reading flows — tutorials, ordered docs, recipes. Derive sibling order automatically from the page tree (or any explicit `nav` rune that defines order), with an escape hatch for hand-authored prev/next.

## Problem

Sequential reading flows ("← Install / Configuration →") are common in docs and tutorials, but refrakt has no rune for them. Authors today either:

- **Hand-write prev/next links at the bottom of every page** — duplication, drift when pages are renamed, missing entirely when authors forget.
- **Build a one-off Svelte component that walks the page tree** — bypasses the rune system, only available to themes that ship it, and re-implements logic the registry already provides.

The `pageTree` aggregate (`packages/content/src/pipeline.ts`, Phase 3) already indexes sibling order during the cross-page pipeline, so the data is there; nothing surfaces it to authors.

-----

## Design Principles

**Auto by default.** A single line — `{% pagination auto /%}` — should produce sane prev/next links for the vast majority of pages without any per-page configuration. Place it once in `_layout.md` and every page in the cascade gets pagination for free.

**Explicit when needed.** When the author wants a different flow (a curated tutorial path, a recipe that's part of two different sequences, a deliberate jump), the same rune accepts explicit `prev` and `next` attributes.

**Respect declared order over inferred order.** If a sidebar `nav` rune at the layout level defines the page sequence, that's the canonical reading order. Auto pagination should follow it. Only fall back to file-system order when no `nav` defines the sequence.

**No wrap-around.** First page → no prev link. Last page → no next link. Wrapping a user from the end back to the start is almost always wrong; if it's ever right, it's an explicit-mode concern.

-----

## Authoring Surface

```markdoc
{% pagination auto /%}                                # derive from siblings
{% pagination prev="install" next="configuration" /%} # explicit
{% pagination auto scope="section" /%}                # widen to whole section
```

Auto mode is the common case. Layout files can place `{% pagination auto /%}` once in a `_layout.md` so every page in the directory tree gets it for free — no per-page authoring needed.

For tutorials that span multiple directories or otherwise diverge from page-tree order, place `{% pagination prev="..." next="..." /%}` explicitly on each page. The values accept either slugs (resolved via the registry) or absolute URLs.

-----

## Ordering Priority for Auto Mode

When `auto` resolves prev/next during postProcess, sibling order is determined by, in order:

1. **Explicit `nav` order** — if a `nav` rune anywhere in the active layout cascade lists the current page among its items, use the order defined there. This means the sidebar's ordering is automatically the reading order; authors don't restate it.
2. **Frontmatter `order` field** — numeric field on each page; ascending sort. Useful when no sidebar nav exists.
3. **Directory order** — file-system order, respecting numeric prefixes (`01-intro.md` sorts before `02-install.md`). Final fallback.

The first source that produces a definite position wins. Pages without an `order` field that appear in a `nav` rune still get their position from the nav; pages absent from both sources fall back to directory order.

`scope="section"` widens the search beyond direct siblings to include all pages in the current top-level section (useful for tutorials where one section contains nested subdirectories that should still be read in sequence). Default is `scope="siblings"` — direct page-tree siblings only.

-----

## Engine Config

```ts
Pagination: {
  block: 'rf-pagination',
  tag: 'nav',
  modifiers: {
    auto: { source: 'attr', default: 'false' },
    scope: { source: 'attr', default: 'siblings' },  // siblings | section
  },
  structure: [
    { type: 'element', tag: 'a', dataName: 'prev', if: { hasProperty: 'prev' } },
    { type: 'element', tag: 'a', dataName: 'next', if: { hasProperty: 'next' } },
  ],
}
```

Produces:
- `.rf-pagination` (block, `<nav>`)
- `.rf-pagination__prev`, `.rf-pagination__next` (link elements via `data-name`)
- `data-direction="prev|next"` on each link for variant styling
- `[aria-label]` on the wrapping `<nav>` for accessibility

-----

## Auto Resolution

At schema time, `{% pagination auto /%}` emits a sentinel renderable with a `__pagination-auto` meta property and the requested scope. The core `postProcess` hook (`packages/runes/src/config.ts` → `corePipelineHooks`) resolves it:

1. Look up the current page's siblings using the ordering priority above.
2. Find the current page's position; pick the previous and next entries.
3. Replace the sentinel with `prev` and `next` link tags whose `href` and label come from the resolved sibling pages' URLs and titles.
4. At a boundary, omit that side entirely — the engine's `if: { hasProperty }` clauses drop the missing link so themes don't have to handle empty slots.

This piggybacks on the existing sentinel-resolution pattern used by `breadcrumb auto` and `nav auto` — no new pipeline phase required.

-----

## Acceptance Criteria

- [ ] `pagination` rune defined in `packages/runes/src/tags/pagination.ts` with `auto`, `prev`, `next`, `scope`, `prev-label`, `next-label` attributes
- [ ] `Pagination` config entry in `packages/runes/src/config.ts` producing `.rf-pagination` block with `prev`/`next` BEM elements and `data-direction` attribute
- [ ] `auto` mode emits a `__pagination-auto` sentinel that core `postProcess` resolves
- [ ] Sibling ordering follows the priority: explicit `nav` order → frontmatter `order` → directory order
- [ ] Boundary handling: no prev link on first sibling, no next link on last; the wrapping `<nav>` still renders so theme spacing stays consistent
- [ ] Explicit `prev` / `next` (slug or URL) work without `auto` and skip the sentinel resolution path
- [ ] Link label defaults to the target page's title; authors can override per-link via `prev-label` / `next-label` attributes
- [ ] `scope="section"` widens siblings to the current top-level section; `scope="siblings"` (default) uses direct page-tree siblings
- [ ] Lumina ships CSS for `.rf-pagination`, `.rf-pagination__prev`, `.rf-pagination__next` with sensible defaults
- [ ] Authoring docs (`site/content/docs/authoring/`) cover both auto and explicit forms
- [ ] At least one docs section in `site/content/` uses `{% pagination auto /%}` via `_layout.md` so the feature is exercised end-to-end
- [ ] `npx refrakt inspect pagination --auto` shows the expected sentinel; `npx refrakt inspect pagination --prev=foo --next=bar` shows resolved links
- [ ] CSS coverage tests updated for the new selectors

-----

## Out of Scope

- **Wrap-around at boundaries.** First / last pages get nothing on the missing side. No "loop back to start" mode.
- **Pagination across versioned doc sets.** No versioning infrastructure exists yet; cross-version prev/next is out.
- **Multi-step progress indicators.** Step counters ("3 of 7") are a separate visual primitive — could be added later as a `progress` rune.
- **Pagination for non-page content** (changelog entries, blog posts). Same rune may work, but verifying registry coverage for those entity types is a separate effort.

-----

## Open Questions

**Layout-level placement vs per-page.** Both should work. Placement in `_layout.md` is the ergonomic default for docs; per-page placement matters when a page belongs to a specific tutorial sequence that differs from its directory siblings. The spec supports both with no extra wiring — confirm during implementation that layout cascade doesn't double-render the rune when both layout and page place it.

**Label format.** "← Previous: Install" vs "← Install" vs plain "Install". Lean toward emitting the direction marker and the title in separate `data-name` elements (`marker`, `label`) so themes can show, hide, or restyle each independently. Authors override the whole label with `prev-label` / `next-label`.

**`scope="section"` semantics.** Defined here as "the current top-level section in the page tree." The page tree's notion of "section" may need clarification (is it the top-level directory? The directory containing the page's `_layout.md`?). Worth verifying against `pageTree` shape before committing.

**Interaction with `nav layout="cards"` (SPEC-046).** If a section landing page lists children as cards, the cards layout's order should *be* the reading order for child pages' auto pagination. Both features should resolve from the same source (the nav's declared order); confirm during implementation that they share the lookup path.

**Should auto pagination skip the section index page itself?** When the reader is on a section index (e.g. `/docs/`) and the children are listed below as cards, prev/next at the bottom is usually redundant. Suggest: auto mode renders nothing when the current page has children but no siblings of its own kind. Verify the heuristic against real content.

{% /spec %}
