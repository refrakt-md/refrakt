{% work id="WORK-257" status="done" priority="medium" complexity="moderate" source="SPEC-060" tags="runes, ui, core, transform" milestone="v0.15.0" %}

# Drawer rune (schema, transform, CSS)

The body-only drawer rune: declares an addressable panel by ID, renders its body as a visible in-flow `<section>` at the authored position. Triggers come from xrefs to the drawer's ID anywhere on the page (WORK-258 wires up the JS enhancement that turns the section into a `<dialog>` and intercepts xref clicks).

This work item covers the identity-transform rune (schema, config, CSS for both no-JS and JS states) and the registry hookup. Behaviors layer is WORK-258.

## Acceptance Criteria

- [x] `{% drawer id="..." %}` produces the drawer body as a visible in-flow `<section>` at its authored position
- [x] `id` attribute is required; missing `id` fails content load with a clear error
- [x] `title` attribute renders as a heading in the drawer header
- [x] `headingLevel` attribute controls the title's heading level
- [x] When `headingLevel` is omitted, the title's level is auto-detected from outline position (same convention as `nav`/`hint`)
- [x] `shortcut` attribute writes `data-shortcut` on the wrapper
- [x] `side` attribute applies `rf-drawer--{value}` modifier class and `data-side="{value}"` (matches engine modifier-from-meta convention)
- [x] `size` attribute applies `rf-drawer--{value}` modifier class and `data-size="{value}"`
- [x] Drawer element gets `id="drawer-{author-id}"` so fragment navigation lands at it
- [x] Drawer rune registers a page-scoped entity (`type: 'drawer'`, `scope: 'page'`) in the registry with `sourceUrl: "{page-url}#drawer-{id}"`
- [x] `{% ref "drawer-id" /%}` on the same page resolves (via WORK-253) to `<a href="#drawer-{id}" data-target-type="drawer">…</a>`
- [x] Multiple xrefs to the same drawer on the same page each resolve to the same anchor target
- [x] Drawer IDs are page-scoped: two pages each declaring `id="foo"` do not collide in the registry
- [x] Close button in the drawer header is `hidden` by default (behaviors layer reveals it)
- [x] Lumina CSS implements both no-JS (in-flow callout) and JS-targeted (`dialog.rf-drawer[open]`) rendering for all four sides and three sizes
- [x] `refrakt inspect drawer` shows the expected HTML
- [x] CSS coverage tests pass for `.rf-drawer*` selectors

## Approach

Per the spec:

- `packages/runes/src/tags/drawer.ts` — schema with block content model (no delimiter)
- `packages/runes/src/config.ts` — `Drawer` config entry: modifier-from-meta for `side`/`size`/`shortcut`, structural injection for the header (title + hidden close button)
- Register hook (extension of `corePipelineHooks` or a new drawer-specific hook) scans each page for drawer runes and registers them as page-scoped entities
- `packages/lumina/styles/runes/drawer.css` — covers both no-JS callout state and dialog state

Title-level auto-detection mirrors the existing `nav`/`hint` convention (one level deeper than the nearest preceding heading).

## Dependencies

- {% ref "WORK-253" /%} — `data-target-type` propagation in xref resolver (drawer needs the marker on resolved anchors so the behaviors layer can query for them)
- {% ref "WORK-256" /%} — `EntityRegistration.scope: 'page'` field (for page-scoped drawer IDs)

## References

- {% ref "SPEC-060" /%} — drawer-rune spec (full)
- {% ref "SPEC-066" /%} — expand rune (composes inside drawer bodies)
- `packages/runes/src/config.ts` — engine config home

## Resolution

Completed: 2026-05-23

Branch: `claude/v0.15.0`

### What was done
- `packages/runes/src/tags/drawer.ts` — schema with required `id`, optional `title` / `headingLevel` / `shortcut` / `side` / `size`. Emits a `<section data-rune="drawer" id="drawer-{id}">` with a header (title + hidden close button) and a body div. Title heading uses an explicit `h{n}` when `headingLevel` is set (clamped to 1-6), or an `h3` placeholder marked `data-drawer-title-auto` when omitted.
- `packages/runes/src/drawer-pipeline.ts` — two hooks:
  - **`registerDrawers`** walks each page's renderable for `data-rune="drawer"` tags and registers each as a page-scoped entity (`type: 'drawer'`, `scope: 'page'`, `sourceUrl: "${pageUrl}#drawer-${id}"`) with `data.title`/`data.side`/`data.size`/`data.shortcut` for tooling. Warns on within-page id duplicates; errors on missing id (shouldn't happen since schema enforces required, but defensive).
  - **`resolveAutoDrawerTitleLevels`** walks the page renderable, tracks the most recent `h{n}` level seen, and rewrites any `data-drawer-title-auto` placeholder to `h{n+1}` (clamped 1-6, defaults to `h2` when no preceding heading).
- `packages/runes/src/config.ts` — `Drawer` engine entry: `modifiers` for `side` (default `right`), `size` (default `md`), `shortcut` (no BEM class). `sections` for header/body. Hooked `registerDrawers` into `corePipelineHooks.register` and `resolveAutoDrawerTitleLevels` into `corePipelineHooks.postProcess` ahead of the xref resolver pass.
- `packages/runes/src/index.ts` — catalog entry under `Layout`.
- `packages/runes/src/xref-resolve.ts` — same-page href compaction. When an entity's resolved href targets the current page plus a fragment (modulo trailing-slash normalization), the rendered anchor's href is the fragment alone (`#drawer-x`) — matches SPEC-060's drawer-trigger contract.
- `packages/content/src/registry.ts` — `getById` gained a cross-page fallback so a page-scoped entity (drawer registered on page A) is reachable from a xref on page B. Also normalises trailing slashes when keying page-scoped entries so adapters that emit `/x/` and `/x` coalesce.
- `packages/lumina/styles/runes/drawer.css` — two-mode CSS: `section.rf-drawer` styles the no-JS in-flow callout (visually distinct, with a coloured left border); `dialog.rf-drawer[data-side="..."][data-size="..."]` selectors anchor each modal to the right edge / size class.
- `packages/lumina/index.css` — imports the drawer stylesheet.
- `packages/lumina/contracts/structures.json` — regenerated to include `Drawer`.
- `site/content/runes/drawer.md` — authoring docs with a live drawer + xref-as-trigger example. Linked from `runes/_layout.md` (Layout section) and `runes/rune-catalog.md` (Layout table).

### Tests
- `packages/runes/test/drawer.test.ts` — 17 new tests covering schema shape, header/title rendering, close button, side/size meta tags, missing-title case, register-hook drawer extraction, cross-page id uniqueness, duplicate-id warning, and auto title-level rewriting (h2 default, h3 under h2, h4 under h3, h6 clamp, explicit override).
- `packages/runes/test/xref-resolve.test.ts` — 3 new tests for same-page href compaction, trailing-slash tolerance, and cross-page absolute-href preservation.
- `packages/content/test/registry.test.ts` — 2 new tests for cross-page page-scoped lookup and trailing-slash normalization.
- 2786/2786 tests pass.

### Notes
- The BEM modifier produced is `rf-drawer--{value}` (e.g. `rf-drawer--right`), not `rf-drawer--side-{value}`, matching the engine's modifier-from-meta convention used throughout the codebase. Updated SPEC-060 to reflect this; the `[data-side]`/`[data-size]` attribute selectors remain the canonical variant hooks (Lumina uses these).
- Title auto-detection chose a simple linear walk (track the most recent heading level seen in document order) rather than a tree-depth approach — the document-order semantics match how readers experience outline depth, and it's robust against nested runes that contain their own headings.
- The same-page href compaction lives in the xref resolver (not the registry) because the registry doesn't know the resolving page; the resolver does. It normalises trailing slashes the same way the registry does so both layers agree on identity.
- The cross-page registry fallback returns the first page-scoped match in registration order. Callers wanting strict resolution pass `pageUrl` and can verify via `sourceUrl` on the returned entry — none in v0.15.0 need this, but it documents the contract for follow-up work.
- Drawer behaviors (the JS that turns `<section>` into `<dialog>` and wires shortcut/hash-sync) are WORK-258.

{% /work %}
