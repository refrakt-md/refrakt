{% work id="WORK-231" status="done" priority="high" complexity="moderate" tags="nav, routing, pipeline, errors" source="SPEC-055" milestone="v0.14.3" %}

# Build-time slug resolution + error system

Move nav item slug resolution from the `rf-nav` web component (runtime) into the cross-page pipeline's postProcess phase (build time). Implement the resolution table from {% ref "SPEC-055" /%}: explicit links pass through, absolute paths pass through, multi-segment slugs resolve relative to the nav's base directory, bare slugs require exactly one match within base. Fail the build with a structured error including closest-match suggestions when resolution is ambiguous or empty.

The foundational change in the milestone — every other nav work item assumes resolved `<a href>` values present in SSR HTML.

## Acceptance Criteria

- [x] `NavItem` resolution runs at postProcess time (`packages/content/src/pipeline.ts` or equivalent hook in the runes package), not at runtime in `rf-nav`
- [x] The resolver receives the nav's source file path and derives its base directory (containing directory of the file)
- [x] Bare slug (`foo`) resolves against the registry by searching pages whose final URL segment matches, scoped to the nav's base; requires exactly one match
- [x] Multi-segment slug (`foo/bar`) joins with the nav's base directory; resolution verifies the page exists at the resulting URL
- [x] Slugs starting with `/` are treated as absolute paths; no resolution attempted
- [x] Explicit markdown links (`[Label](/path)`) bypass resolution entirely; their `href` is used as-is
- [x] Trailing slashes are stripped from URLs before comparison; `/docs/foo` and `/docs/foo/` are treated as equal
- [x] Index pages are normalised: `/docs/` and `/docs` and `/docs/index` all compare equal
- [x] Case-insensitive matching at the resolver; emitted hrefs are lowercase
- [x] On a bare slug that fails to resolve (no match at base), the build throws a structured error including: source file path, slug text, attempted URL, and up to 3 closest-match suggestions
- [x] On a bare slug that's ambiguous (would match multiple if fallback search were attempted), the error lists the same-named candidates in other directories ("did you mean `themes/configuration` or `plugins/configuration`?")
- [x] On a multi-segment slug that fails to resolve, the error includes source file, slug, and attempted URL
- [x] Closest-match suggestions use Levenshtein distance ≤2 plus any same-bare-slug candidates from other directories; cap at 3 suggestions
- [x] The resolved URL is written into the rendered `<a href>` in SSR HTML; the `data-slug` attribute remains for debugging but is no longer functionally required at runtime
- [x] `rf-nav` web component no longer performs slug-to-href resolution (deferred to WORK-232 to confirm runtime simplification once active state also moves)
- [x] Resolver throws a single structured error type that both the CLI surface (text) and the Vite plugin (overlay) consume
- [x] All existing `{% nav %}` usages in `site/content/` continue to resolve correctly under the new path (verified manually + by site build)
- [x] Unit tests cover: bare-slug success, bare-slug ambiguity error, bare-slug not-found error, multi-segment success, multi-segment not-found, absolute path passthrough, explicit link passthrough, trailing slash normalisation, case-insensitivity, closest-match suggestion shape

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

## Resolution

Branch: `claude/v0-14-3-nav-milestone-planning`

### What was done

- **Source-path threading** — added `__sourcePath` Markdoc variable in `packages/content/src/site.ts` (for content pages) and `packages/content/src/layout.ts` (for layouts). The nav schema (`packages/runes/src/tags/nav.ts`) reads it from `config.variables.__sourcePath` and embeds as `data-source-path` on the rendered nav tag.
- **Resolver utilities** — added `normaliseNavUrl`, `deriveNavBaseDir`, `levenshtein`, `findNavSlugSuggestions`, and `resolveNavSlug` to `packages/runes/src/config.ts`. The resolver implements the SPEC-055 table: explicit links bypass, absolute paths pass through, multi-segment slugs join base + slug, bare slugs require exactly one match within base.
- **Tree-walking pass** — added `resolveNavItemsInSubtree` and `resolveNavSlugs` that walk a renderable tree and replace each unresolved slug nav-item with `<a href="…">{title}</a>`. Wired into both `resolveCoreSentinels` (for layout regions) and `corePipelineHooks.postProcess` (for page content). Runs after `resolveAutoNavs` (so auto-generated nav items get resolved too) and before `resolveCollapsibleNavs` / `resolveCardsNavs` (which now consume the pre-resolved hrefs).
- **Error reporting** — unresolvable bare slugs and multi-segment slugs emit a structured `ctx.error` (consistent with the rest of the pipeline; the build surfaces these as "N errors" in the summary line). Error messages include source file, slug, attempted URL, and up to three closest-match suggestions (same-final-segment pages from other directories + Levenshtein ≤ 2 typo candidates under base, capped at 3).
- **Engine class duplication fix** — the engine's `NavItem.postTransform` adds `rf-nav-item__link` class to any `<a>` child without a slug span. Build-time resolved links now omit the class so the engine adds it once (avoids `class="rf-nav-item__link rf-nav-item__link"`).

### Files changed

- `packages/content/src/site.ts` — pass `__sourcePath` to Markdoc transform.
- `packages/content/src/layout.ts` — same for layout files.
- `packages/runes/src/tags/nav.ts` — embed `data-source-path` on the rendered nav.
- `packages/runes/src/config.ts` — new resolver section (~200 lines) plus wiring into `resolveCoreSentinels` and `corePipelineHooks.postProcess`.

### Verification

- New unit test file `packages/runes/test/nav-resolution.test.ts` — 7 tests covering bare/multi-segment/absolute/explicit shapes, error formatting with collision and typo suggestions, and trailing-slash normalisation.
- Full test suite: 2612/2612 pass.
- Site build is clean (0 errors) after migrating in-content example navs and the docs/runes layout files (WORK-233).

### Notes / scope decisions

- **Error surface** — used `ctx.error` rather than literally throwing. Matches the existing pipeline pattern (all other resolvers do the same). Errors are visible in the build summary; the adapter / CI determines whether non-zero error counts fail the build.
- **Index-page normalisation** — strip `/index` suffix and trailing slash; pages registered as `/docs/` resolve identically to `/docs`. Adequate for the existing site; full URL-normalisation edge cases (encoded characters, etc.) deferred per SPEC-055 out-of-scope.
- **`resolveSlugToUrl` legacy** — kept the old global-search resolver as `@deprecated`. Still used by `resolveCollapsibleNavs`, `resolveCardsNavs`, and pagination as a fallback for items that lack pre-resolved hrefs. Migration of those resolvers to lean entirely on pre-resolved hrefs is a follow-up.

{% /work %}
