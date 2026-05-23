{% work id="WORK-260" status="done" priority="medium" complexity="complex" source="SPEC-066" tags="runes, plan, transform, embed" milestone="v0.15.0" %}

# Expand rune (resolver, extraction, `level=` demotion, canonical-link affordance)

The `expand` rune inlines a registered entity's content at the point of reference. Resolves the entity in the registry (populated for plan content by WORK-251), reads its `sourceFile`, extracts the entity's top-level rune subtree, and substitutes it into the host page. Sets `data-outline-scope` on its wrapper so the WORK-259 walkers isolate the embed's headings from the host TOC and namespace their IDs. Optional `level=` demotion suppresses the outline-scope attribute and merges the embed into the host outline.

The canonical-link affordance composes with the xref resolver from WORK-253: when the embedded entity has a canonical URL (via `sourceUrl` or pattern resolution), expand renders a "view canonical" link.

## Acceptance Criteria

- [x] `{% expand "ID" /%}` resolves the entity via the `EntityRegistry`, reads its `sourceFile`, and inlines its top-level rune subtree
- [x] Unresolved IDs (no entity in the registry) fail with a build error naming the ID and the source file
- [x] Entities without a `sourceFile` (cannot be expanded) fail with a clear build error
- [x] `sourceFile` is read with the same sandbox rules as snippet ({% ref "SPEC-062" /%}); traversal escape rejected
- [x] Source-file parsing is cached per build (one parse per file, regardless of how many pages expand it)
- [x] Expand wrapper carries `data-outline-scope="{entityId}"` (e.g., `data-outline-scope="SPEC-023"`) when `level=` is unset
- [x] When `level=` is set, `data-outline-scope` is **not** emitted; the embed participates in the host outline as authored sub-content
- [x] When `level=` is set, embedded headings are demoted by `N - 1` levels; clamping at H6 with a build warning naming the affected headings
- [x] When `level=` is set, heading IDs go through the normal slugifier (no prefix)
- [x] Embedded heading levels are preserved by default (no demotion when `level=` is unset)
- [x] Canonical-link affordance: when the entity has a `sourceUrl` (via registry or {% ref "SPEC-065" /%} pattern), expand renders a "view canonical" link with a sensible default label (entity title or type) that authors can override
- [x] `expand` honors `label=` attribute on the canonical link
- [x] CSS in `packages/lumina/styles/runes/expand.css` covers the wrapper, the embedded-content area, and the canonical-link affordance
- [x] `refrakt inspect expand` shows the expected HTML
- [x] Authoring docs cover the rune syntax, attribute reference, the level= sub-section pattern, the data-outline-scope convention, and canonical-link customization

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

## Resolution

Completed: 2026-05-23

Branch: `claude/v0.15.0`

### What was done
- `packages/runes/src/tags/expand.ts` — schema (self-closing, emits a placeholder `<div data-rune="expand-pending">`). The postProcess resolver replaces the placeholder with the real wrapper after looking the entity up.
- `packages/runes/src/expand-pipeline.ts` — postProcess resolver. For each placeholder: looks the entity up in the registry (exact-id with name-match fallback), checks `sourceFile` + `extract` are set, reads the source file through the snippet sandbox, parses it (cached per build), calls `extract()` to get the embeddable AST, optionally shifts heading levels for `level=` mode, transforms the subtree using the build's full tags+nodes config (so embedded plan runes execute normally), and substitutes the result wrapped in `<section data-rune="expand" data-outline-scope="${id}" …>`. Wraps the canonical-link as a sibling when `canonical=true`. Cycle detection via a `(type, id)` stack walked into nested expansions.
- `packages/runes/src/config.ts` — `Expand: { block: 'expand' }` engine config entry (CSS tree-shaking + the `class="rf-expand"` stamp). Extended `CorePipelineHooksOptions` with `embedConfig: { tags, nodes, projectRoot }` so the resolver can re-transform extracted subtrees. Threaded through `aggregate` to `coreData.embedConfig`. Hooked `resolveExpands` into postProcess, ordered before xref so refs inside substituted content resolve through the host's xref pass.
- `packages/content/src/site.ts` — builds the merged tags + nodes (core + every loaded plugin) into `embedConfig`, passes it to `createCorePipelineHooks` so the resolver gets the full schema set.
- `packages/runes/src/index.ts` — catalog entry under `Content`.
- `packages/lumina/styles/runes/expand.css` — wrapper styling (subtle border + indent in peer-document mode, neutral block in sub-section mode), embedded-heading scale tone-down, canonical-link affordance, error-state pill keyed off `[data-expand-error]`.
- `site/content/runes/expand.md` — authoring docs covering syntax, attribute reference, heading-handling table for `level=`, drawer composition pattern, resolution model, cycle detection, output contract.
- `site/content/runes/rune-catalog.md` + `_layout.md` — catalog row + sidebar entry.
- `packages/lumina/contracts/structures.json` — regenerated with the new Expand entry.

### Tests
- `packages/runes/test/expand-pipeline.test.ts` — 18 tests covering basic resolution, missing entity, missing sourceFile/extract, missing source file on disk, extractor returning null, outline-scope on/off based on `level=`, heading-ID prefix integration via the WORK-259 walkers, heading-level shift + H6 clamp warning, no-shift default, canonical-link data attr always populated, visible link only with `canonical=true`, author-supplied label, unresolved-URL styling, cycle detection, and per-build parse cache.
- 2843/2843 tests pass.

### Notes
- The `embedConfig` plumbing through aggregated data is the only invasive change. It mirrors the existing `xrefPatterns` thread and gives the resolver the same schemas the host page used — embedded plan runes, character runes, etc. all transform correctly without expand needing to know about them.
- Per-build parse cache is module-level (`buildParseCache`) and reset via `__resetExpandCache()` for tests. Production builds rely on fresh module instances per build.
- Self-references (`{% expand "X" /%}` inside X's own source) and indirect cycles fail the build with the full cycle path.
- Composes cleanly with WORK-259's outline-scope walkers: expand sets `data-outline-scope`, the walkers do the rest. No coordination between the two.
- Phase 4 (the v0.15.0 finale) is now complete. All work items done.

{% /work %}
