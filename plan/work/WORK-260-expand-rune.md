{% work id="WORK-260" status="ready" priority="medium" complexity="complex" source="SPEC-066" tags="runes, plan, transform, embed" milestone="v0.15.0" %}

# Expand rune (resolver, extraction, `level=` demotion, canonical-link affordance)

The `expand` rune inlines a registered entity's content at the point of reference. Resolves the entity in the registry (populated for plan content by WORK-251), reads its `sourceFile`, extracts the entity's top-level rune subtree, and substitutes it into the host page. Sets `data-outline-scope` on its wrapper so the WORK-259 walkers isolate the embed's headings from the host TOC and namespace their IDs. Optional `level=` demotion suppresses the outline-scope attribute and merges the embed into the host outline.

The canonical-link affordance composes with the xref resolver from WORK-253: when the embedded entity has a canonical URL (via `sourceUrl` or pattern resolution), expand renders a "view canonical" link.

## Acceptance Criteria

- [ ] `{% expand "ID" /%}` resolves the entity via the `EntityRegistry`, reads its `sourceFile`, and inlines its top-level rune subtree
- [ ] Unresolved IDs (no entity in the registry) fail with a build error naming the ID and the source file
- [ ] Entities without a `sourceFile` (cannot be expanded) fail with a clear build error
- [ ] `sourceFile` is read with the same sandbox rules as snippet ({% ref "SPEC-062" /%}); traversal escape rejected
- [ ] Source-file parsing is cached per build (one parse per file, regardless of how many pages expand it)
- [ ] Expand wrapper carries `data-outline-scope="{entityId}"` (e.g., `data-outline-scope="SPEC-023"`) when `level=` is unset
- [ ] When `level=` is set, `data-outline-scope` is **not** emitted; the embed participates in the host outline as authored sub-content
- [ ] When `level=` is set, embedded headings are demoted by `N - 1` levels; clamping at H6 with a build warning naming the affected headings
- [ ] When `level=` is set, heading IDs go through the normal slugifier (no prefix)
- [ ] Embedded heading levels are preserved by default (no demotion when `level=` is unset)
- [ ] Canonical-link affordance: when the entity has a `sourceUrl` (via registry or {% ref "SPEC-065" /%} pattern), expand renders a "view canonical" link with a sensible default label (entity title or type) that authors can override
- [ ] `expand` honors `label=` attribute on the canonical link
- [ ] CSS in `packages/lumina/styles/runes/expand.css` covers the wrapper, the embedded-content area, and the canonical-link affordance
- [ ] `refrakt inspect expand` shows the expected HTML
- [ ] Authoring docs cover the rune syntax, attribute reference, the level= sub-section pattern, the data-outline-scope convention, and canonical-link customization

## Approach

Per the spec:

- `packages/runes/src/tags/expand.ts` — schema (`createContentModelSchema`)
- `packages/runes/src/config.ts` — `Expand` config entry; wrapper sets `data-outline-scope` (or omits when `level=` is set)
- PostProcess hook resolves the entity from the registry, reads + parses the source file, extracts the top-level rune subtree, runs heading processing (level shift when level= is set; heading-ID walker handles the prefix via outline-scope), and splices into the host page's tree
- Per-build cache keyed by `sourceFile` (same machinery as snippet's caching open question)
- Canonical-link rendering uses the same xref resolution chain as `{% ref %}` (WORK-253) — entity lookup gives metadata, URL comes from `sourceUrl` or patterns

## Dependencies

- {% ref "WORK-251" /%} — plan entities registered with `sourceFile` and `extract` (primary content source for expand)
- {% ref "WORK-259" /%} — generic `data-outline-scope` walkers (consume the attribute expand sets)
- {% ref "WORK-253" /%} — xref resolver (canonical-link affordance reuses it)

## References

- {% ref "SPEC-066" /%} — expand-rune spec (full)
- {% ref "SPEC-064" /%} — plan-entity registration (the primary content source)
- {% ref "SPEC-065" /%} — xref resolution (canonical-link composition)
- {% ref "SPEC-060" /%} — drawer rune (common composition target: expand inside drawer body)

{% /work %}
