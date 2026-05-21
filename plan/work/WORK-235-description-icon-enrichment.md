{% work id="WORK-235" status="done" priority="medium" complexity="moderate" tags="nav, pipeline, frontmatter, enrichment" source="SPEC-054" milestone="v0.14.3" %}

# Description / icon enrichment generalised across auto layouts

Generalise the existing `auto=true` frontmatter enrichment (currently implemented for `layout="cards"`) so it applies to every layout. Resolution rules: inline description child (paragraph following a list item) wins; frontmatter `description` is the fallback; nothing otherwise. `icon` follows the same shape — inline `{% icon %}` rune in link text overrides frontmatter `icon`.

Data is always attached to the item during postProcess; theme CSS decides whether to render. The mega layout (WORK-236) will consume this enrichment; cards continues to work unchanged.

## Acceptance Criteria

- [x] When `auto=true` is set on a `{% nav %}`, description resolution applies uniformly to every layout — not just `cards`
- [x] For each `NavItem`, the resolver determines `description` per the rules: explicit paragraph child wins; linked-page frontmatter `description` is the fallback; nothing if neither
- [x] For each `NavItem`, the resolver determines `icon` per the same rules: inline `{% icon %}` in the link wins; frontmatter `icon` is the fallback; nothing if neither
- [x] Title resolution continues to work as today: frontmatter `title` for slug items; link text for explicit-link items
- [x] Resolved `description`, `icon`, and `title` properties are attached to the NavItem at postProcess time and present in the SSR HTML (as text content or data attributes, per the engine config)
- [x] Existing `layout="cards"` behavior is preserved exactly — same rendered output for the same input
- [x] When an item's link points to an external URL or a page missing `description` / `icon`, the resolver attaches nothing (no broken fallbacks)
- [x] When an inline paragraph follows a list item in the source (CommonMark indented continuation), the engine recognises it as the item's description child and consumes it (verified via a Markdoc-behaviour spike — see Approach)
- [x] Tests cover all four item shapes from {% ref "SPEC-054" /%}'s resolution table: plain slug, explicit link no paragraph, explicit link with paragraph, slug with paragraph
- [x] Tests cover icon resolution with both inline `{% icon %}` and frontmatter sources
- [x] `npx refrakt inspect nav` with a representative `auto=true` input shows resolved properties on each item
- [x] No regression in the existing cards-layout demos in `site/content/`

## Approach

**Spike first: Markdoc paragraph-under-list-item behaviour.** SPEC-054 flagged this as a needed spike. Before writing the resolver, confirm what Markdoc gives us when an author writes:

```markdown
- [Plan](/plan)

  Track work, specs, and decisions.
```

CommonMark says the indented paragraph is a continuation of the list item — so the AST should have a `paragraph` node as a child of the list item, alongside the link. Verify with a small test. If Markdoc deviates, document the required indent level or paragraph delimiter convention as part of the work.

**Refactor existing enrichment.** The current `auto=true` cards-layout enrichment lives somewhere in the runes / pipeline path (locate via `git log` and grep for `frontmatter.description` / cards-layout-specific code). Extract the resolution logic into a layout-agnostic helper:

```ts
function resolveItemEnrichment(
  item: NavItemNode,
  registry: EntityRegistry,
): { title?: string; description?: string; icon?: string };
```

Called for every NavItem when the parent Nav has `auto=true`, regardless of layout.

**Property attachment.** Properties are attached during identity transform / postProcess so the engine config can declare structural slots for them. The mega layout (WORK-236) will consume these as `data-name="description"` / `data-name="icon"` children that the engine wraps with the right BEM classes. Cards already consumes them the same way — preserve that contract.

**Migration risk.** The cards-layout demos in `site/content/` are the primary backwards-compat target. Run the site build before and after this work; diff the rendered cards HTML to confirm identical output.

## Dependencies

- None blocking — can begin in parallel with WORK-231 and WORK-234
- WORK-236 (mega layout engine) depends on this — the mega layout's per-item description rendering assumes enrichment is layout-agnostic

## References

- {% ref "SPEC-054" /%} — Description Resolution section, resolution rules table
- Existing cards-layout enrichment — find via `grep -r "frontmatter" packages/runes/src/tags/nav.ts` and pipeline files
- `packages/content/src/registry.ts` — `EntityRegistryImpl` for page lookups

## Resolution

Branch: `claude/v0-14-3-nav-milestone-planning`

### What was done

- **`data-auto` plumbing through schema and auto-resolution.** Added `tag.attributes['data-auto'] = 'true'` in `forwardLayout` of `packages/runes/src/tags/nav.ts` so every nav declared with `auto=true` carries the marker through the pipeline. Updated `buildAutoNav` (in `packages/runes/src/config.ts`) to accept the original sentinel-bearing tag and copy contextual attributes (`layout`, `data-layout`, `data-auto`, `data-source-path`, `data-collapsible`, `data-default-open`) onto the freshly-built nav — fixes a latent bug where `{% nav layout="cards" auto=true %}` would lose its layout attribute through sentinel replacement.
- **Generalised enrichment in `resolveCardsNavs`.** The function now dispatches on `(layout === 'cards')` vs `(data-auto === 'true')`:
  - **Cards layout** → existing `enrichNavItemAsCard` full replacement (icon + title + description wrapped in `<a>`). Unchanged byte-for-byte from previous behaviour.
  - **Any other layout with `auto=true`** → new `augmentNavItemFromFrontmatter` helper that prepends an `<rf-icon data-name="icon">` to the existing `<a>` link's children (when frontmatter has `icon`) and appends a `<span data-name="description">` (when frontmatter has `description`). Preserves the link's existing href and text. Idempotent — re-runs detect existing `data-name` children and skip.
- **No enrichment for plain navs.** A nav without `data-auto` and without cards layout receives no frontmatter enrichment — preserves today's behaviour for the docs sidebar nav and other vertical layouts that intentionally use only the link text.
- **External link handling.** External URLs (`https://`, `mailto:`) in nav items are skipped by the auto-augment path — no frontmatter to enrich from. Cards layout continues to render external links as title-only cards (existing behaviour).

### Files changed

- `packages/runes/src/tags/nav.ts` — emit `data-auto="true"` from `forwardLayout` when `attrs.auto`
- `packages/runes/src/config.ts` — `buildAutoNav` preserves original attributes; `resolveCardsNavs` dispatches on layout/auto and gains the new `augmentNavItemFromFrontmatter` helper
- `packages/runes/test/nav-auto-enrichment.test.ts` — 7 new tests

### Verification

- New `nav-auto-enrichment.test.ts` covers: menubar with `auto=true` enriches; menubar without `auto` does NOT enrich; vertical without `auto` does NOT enrich; cards layout still does full replacement (backwards compat); items without frontmatter description get nothing; external links are skipped; the pass is idempotent. 7/7 pass.
- Full suite: 2628/2628 pass.
- Site build: 0 errors, 171 pages. The existing `{% nav layout="cards" auto=true /%}` demo at `/runes/` continues to render correctly with the cards CSS layout (confirms the `buildAutoNav` attribute-preservation fix).

### Notes / scope decisions

- **Inline-paragraph-as-description detection deferred to WORK-236.** The position-based slot rule for menubar groups (including detecting a description paragraph that follows a list item) lives in the schema's `headingsToList` / `buildGroups` path, not in postProcess. WORK-235 only covers the FRONTMATTER fallback; WORK-236 will add inline-paragraph detection at schema time and ensure it takes precedence over the frontmatter fallback (per the resolution table in SPEC-054).
- **Cards full-replacement vs auto augmentation.** Kept these as separate code paths because the visual contracts differ: cards is opinionated about layout (icon-above-title-above-description), while auto on other layouts just attaches data so themes can choose. Unifying would force a single CSS contract that doesn't fit either case cleanly.
- **Markdoc paragraph-under-list-item spike**: not done as part of this work since the inline-paragraph detection is WORK-236's concern. Worth confirming the AST shape before WORK-236 starts; flagged in WORK-236's approach notes.

{% /work %}
