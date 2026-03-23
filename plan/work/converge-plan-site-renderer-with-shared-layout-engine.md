{% work id="WORK-050" status="draft" priority="high" complexity="complex" tags="plan, transform, layout, pipeline" %}

# Converge plan site renderer with shared layout engine

The plan site's `renderPage()` in `runes/plan/src/commands/render-pipeline.ts` manually assembles HTML using a local `planTheme`/`planLayout` definition, bypassing the shared layout engine in `@refrakt-md/transform`. Meanwhile, `packages/transform/src/layouts.ts` already exports a `planLayout` config (WORK-037) that goes through the standard layout engine but isn't used by the plan site's renderer.

Converge the plan site's renderer to use the shared layout engine so it can leverage declarative layout features — computed ToC, conditional slots, `behaviors` array, computed content — rather than hand-building HTML. This unblocks ToC ("on this page"), dependency visualization (WORK-049), keyboard nav behaviors (WORK-048), and any future layout-level features without custom rendering code.

## Acceptance Criteria

- [ ] `planLayout` in `packages/transform/src/layouts.ts` is extended with `computed.toc` (headings, minLevel 2, maxLevel 3, minCount 2)
- [ ] `planLayout` main slot wraps content with a ToC aside, matching the docs layout pattern
- [ ] Plan site's `renderPage()` delegates to the shared layout engine instead of manually assembling HTML
- [ ] The sidebar nav region (status groups, search input, dashboard link) renders identically to current output
- [ ] Sidebar behavior scripts (collapse, search/filter) are injected via the layout engine or a behavior entry point
- [ ] Copy-to-clipboard behavior is injected via the layout engine or a behavior entry point
- [ ] "On this page" ToC appears on entity pages with 2+ headings
- [ ] ToC is styled consistently with the docs layout ToC (sticky, right-side aside)
- [ ] Plan-specific CSS for the ToC aside (`.rf-plan-toc` or reusing `.rf-docs-toc` pattern) is added
- [ ] All existing plan site tests pass
- [ ] `refrakt plan serve` and `refrakt plan build` produce equivalent output (modulo new ToC)

## Approach

### Phase 1 — Extend planLayout config

Add `computed.toc` and restructure the `main` slot in `packages/transform/src/layouts.ts` to include a ToC aside and content wrapper, following the `docsLayout` pattern:

```ts
computed: {
    toc: {
        type: 'toc',
        source: 'headings',
        options: { minLevel: 2, maxLevel: 3 },
        visibility: { minCount: 2 },
    },
},
```

Add a content wrapper with `conditionalModifier` for `has-toc` and a ToC aside sourced from `computed:toc`.

### Phase 2 — Wire renderPage to the layout engine

Replace the manual HTML assembly in `renderPage()` with a call through the shared layout engine. The nav region builder output feeds into the `region:nav` slot. Page content feeds into the `content` source. The layout engine handles structure, conditional slots, and computed content.

The local `planTheme` manifest and `planLayout` in `render-pipeline.ts` can be removed once the shared config is authoritative.

### Phase 3 — Migrate inline behaviors

Move the inline `<script>` blocks (sidebar collapse/search, copy-to-clipboard) to proper behavior entry points that the layout engine can inject. Options:
- Add them to `planLayout.behaviors` array if they can be standard `@refrakt-md/behaviors` modules
- Or keep them as plan-specific scripts injected via the engine's script slot

### Phase 4 — Add ToC CSS

Add plan-specific ToC styles (`.rf-plan-toc`) to `runes/plan/styles/default.css`, following the sticky aside pattern from `packages/lumina/styles/layouts/docs.css`. The ToC should sit to the right of `.rf-plan-main` content.

## Non-goals

- Migrating the dashboard page to a different rendering approach (it can continue using `generateDashboardContent()`)
- Adding breadcrumbs to the plan layout (not needed for flat entity pages)
- Adding a header bar or top navigation (plan site stays minimal)

## References

- WORK-037 (original planLayout definition — this extends it)
- WORK-039 (HTML adapter refactor — prerequisite infrastructure)
- WORK-049 (dependency viz — unblocked by this, can use a computed slot)
- WORK-048 (keyboard nav — can use the `behaviors` array)
- SPEC-014 (Plan Site via HTML Adapter)
- SPEC-015 (Plan Site UX at Scale)

{% /work %}
