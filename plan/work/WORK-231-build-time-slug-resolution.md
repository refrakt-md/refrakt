{% work id="WORK-231" status="ready" priority="high" complexity="moderate" tags="nav, routing, pipeline, errors" source="SPEC-055" milestone="v0.14.3" %}

# Build-time slug resolution + error system

Move nav item slug resolution from the `rf-nav` web component (runtime) into the cross-page pipeline's postProcess phase (build time). Implement the resolution table from {% ref "SPEC-055" /%}: explicit links pass through, absolute paths pass through, multi-segment slugs resolve relative to the nav's base directory, bare slugs require exactly one match within base. Fail the build with a structured error including closest-match suggestions when resolution is ambiguous or empty.

The foundational change in the milestone — every other nav work item assumes resolved `<a href>` values present in SSR HTML.

## Acceptance Criteria

- [ ] `NavItem` resolution runs at postProcess time (`packages/content/src/pipeline.ts` or equivalent hook in the runes package), not at runtime in `rf-nav`
- [ ] The resolver receives the nav's source file path and derives its base directory (containing directory of the file)
- [ ] Bare slug (`foo`) resolves against the registry by searching pages whose final URL segment matches, scoped to the nav's base; requires exactly one match
- [ ] Multi-segment slug (`foo/bar`) joins with the nav's base directory; resolution verifies the page exists at the resulting URL
- [ ] Slugs starting with `/` are treated as absolute paths; no resolution attempted
- [ ] Explicit markdown links (`[Label](/path)`) bypass resolution entirely; their `href` is used as-is
- [ ] Trailing slashes are stripped from URLs before comparison; `/docs/foo` and `/docs/foo/` are treated as equal
- [ ] Index pages are normalised: `/docs/` and `/docs` and `/docs/index` all compare equal
- [ ] Case-insensitive matching at the resolver; emitted hrefs are lowercase
- [ ] On a bare slug that fails to resolve (no match at base), the build throws a structured error including: source file path, slug text, attempted URL, and up to 3 closest-match suggestions
- [ ] On a bare slug that's ambiguous (would match multiple if fallback search were attempted), the error lists the same-named candidates in other directories ("did you mean `themes/configuration` or `plugins/configuration`?")
- [ ] On a multi-segment slug that fails to resolve, the error includes source file, slug, and attempted URL
- [ ] Closest-match suggestions use Levenshtein distance ≤2 plus any same-bare-slug candidates from other directories; cap at 3 suggestions
- [ ] The resolved URL is written into the rendered `<a href>` in SSR HTML; the `data-slug` attribute remains for debugging but is no longer functionally required at runtime
- [ ] `rf-nav` web component no longer performs slug-to-href resolution (deferred to WORK-232 to confirm runtime simplification once active state also moves)
- [ ] Resolver throws a single structured error type that both the CLI surface (text) and the Vite plugin (overlay) consume
- [ ] All existing `{% nav %}` usages in `site/content/` continue to resolve correctly under the new path (verified manually + by site build)
- [ ] Unit tests cover: bare-slug success, bare-slug ambiguity error, bare-slug not-found error, multi-segment success, multi-segment not-found, absolute path passthrough, explicit link passthrough, trailing slash normalisation, case-insensitivity, closest-match suggestion shape

## Approach

The work is mostly in two files plus tests.

**`packages/runes/src/tags/nav.ts`** — Today the schema sets `data-slug` on each item via the `headingsToList` / `buildGroups` path. Keep that. The schema's job remains "structure markdown into nav-item shapes."

**`packages/content/src/pipeline.ts`** — Add a new postProcess pass (or extend an existing nav-related one) that walks each page's transformed tree, finds `NavItem`s, and resolves their `data-slug` against the entity registry. The pass needs:

1. The source file path of the nav (already available via `TransformedPage.source` or the layout cascade — verify).
2. The entity registry built in Phase 2 (Register) of the pipeline.
3. The resolution table implementation.

The resolver function is pure: `(slug: string, baseDir: string, registry: EntityRegistry) => Result<string, ResolutionError>`. Testable in isolation.

**Closest-match algorithm** — Two sources of suggestions:
- Levenshtein distance against all page final segments under base (typo case): "getting-startd" → "getting-started"
- Same-bare-slug pages from outside base (collision case): "configuration" at `/docs/` → `themes/configuration`, `plugins/configuration`

Cap combined suggestions at 3, prioritising exact-bare-slug matches over typo matches.

**Error shape** — Define `NavResolutionError extends Error` with `{ sourceFile, slug, attemptedUrl, suggestions }`. CLI prints a formatted message; Vite plugin transforms into a SvelteKit overlay (existing pattern; check how other build errors propagate).

**Backwards-compatibility check** — Before merging, audit every `{% nav %}` in `site/content/` for items that would now fail. Most should already use unambiguous slugs within their section's scope; document any that need updating as part of WORK-233.

## Dependencies

None — this is the foundation work.

## References

- {% ref "SPEC-055" /%} — Resolution rules table, build error shape examples
- `packages/runes/src/tags/nav.ts` — Current nav schema (extends with no schema change)
- `packages/content/src/pipeline.ts` — Pipeline orchestrator; new postProcess pass lands here
- `packages/content/src/registry.ts` — `EntityRegistryImpl` provides the page lookup

{% /work %}
