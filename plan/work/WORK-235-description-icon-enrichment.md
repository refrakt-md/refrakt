{% work id="WORK-235" status="ready" priority="medium" complexity="moderate" tags="nav, pipeline, frontmatter, enrichment" source="SPEC-054" milestone="v0.14.3" %}

# Description / icon enrichment generalised across auto layouts

Generalise the existing `auto=true` frontmatter enrichment (currently implemented for `layout="cards"`) so it applies to every layout. Resolution rules: inline description child (paragraph following a list item) wins; frontmatter `description` is the fallback; nothing otherwise. `icon` follows the same shape — inline `{% icon %}` rune in link text overrides frontmatter `icon`.

Data is always attached to the item during postProcess; theme CSS decides whether to render. The mega layout (WORK-236) will consume this enrichment; cards continues to work unchanged.

## Acceptance Criteria

- [ ] When `auto=true` is set on a `{% nav %}`, description resolution applies uniformly to every layout — not just `cards`
- [ ] For each `NavItem`, the resolver determines `description` per the rules: explicit paragraph child wins; linked-page frontmatter `description` is the fallback; nothing if neither
- [ ] For each `NavItem`, the resolver determines `icon` per the same rules: inline `{% icon %}` in the link wins; frontmatter `icon` is the fallback; nothing if neither
- [ ] Title resolution continues to work as today: frontmatter `title` for slug items; link text for explicit-link items
- [ ] Resolved `description`, `icon`, and `title` properties are attached to the NavItem at postProcess time and present in the SSR HTML (as text content or data attributes, per the engine config)
- [ ] Existing `layout="cards"` behavior is preserved exactly — same rendered output for the same input
- [ ] When an item's link points to an external URL or a page missing `description` / `icon`, the resolver attaches nothing (no broken fallbacks)
- [ ] When an inline paragraph follows a list item in the source (CommonMark indented continuation), the engine recognises it as the item's description child and consumes it (verified via a Markdoc-behaviour spike — see Approach)
- [ ] Tests cover all four item shapes from {% ref "SPEC-054" /%}'s resolution table: plain slug, explicit link no paragraph, explicit link with paragraph, slug with paragraph
- [ ] Tests cover icon resolution with both inline `{% icon %}` and frontmatter sources
- [ ] `npx refrakt inspect nav` with a representative `auto=true` input shows resolved properties on each item
- [ ] No regression in the existing cards-layout demos in `site/content/`

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

{% /work %}
