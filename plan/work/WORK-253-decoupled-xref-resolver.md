{% work id="WORK-253" status="done" priority="high" complexity="moderate" source="SPEC-065" tags="runes, xref, pipeline, resolver" milestone="v0.15.0" %}

# Decoupled entity-lookup/URL-resolution chain; per-segment encoding; `data-target-type` propagation

Refactor the xref postProcess resolver to separate entity lookup from URL resolution: the registry provides metadata (label, type, kind); URL comes from the entity's `sourceUrl` if present and non-empty, else falls through to the patterns compiled in WORK-252, else unresolved. Encodes substituted values per URL segment so path-shaped captures preserve slashes. Propagates entity `type` as `data-target-type` on the rendered anchor (the generic hook drawer behaviors will consume in WORK-258).

## Acceptance Criteria

- [x] Resolution chain: entity lookup (registry exact-ID → registry name) captures entity metadata; URL resolution uses entity `sourceUrl` if present and non-empty, else falls through to patterns (first match), else unresolved
- [x] Registry entities with `sourceUrl: undefined` or `sourceUrl: ""` never produce `<a href="">`; the resolver always falls through to patterns or to the unresolved state
- [x] At registration time, `sourceUrl: ""` is normalized to `sourceUrl: undefined`
- [x] Patterns evaluated in array order; first match wins for any ID
- [x] Named groups in regex are accessible as `{name}` in templates
- [x] All placeholder values are encoded per URL segment: split on `/`, encode each segment via `encodeURIComponent`, rejoin with `/` (path-shaped captures preserve slashes)
- [x] Single-segment captures are encoded the same as full `encodeURIComponent` would produce
- [x] `type` field assigns `rf-xref--{type}` CSS modifier (default `external`)
- [x] `label` field templates the link text (default `{id}`)
- [x] `label=` attribute on the rune still overrides any computed label
- [x] Rendered anchor includes `data-xref-id="{matched-id}"`, `data-xref-source="registry"` (URL from entity) or `data-xref-source="pattern"` (URL from pattern), and `data-target-type="{entity-type}"` when the entity is registry-resolved (drawer and any future addressable rune query against this)
- [x] Self-reference warning fires when resolved href equals current page URL (after normalization)
- [x] Existing refs unaffected when no `xrefs` config present (no regression)
- [x] Unresolved xrefs still render as `rf-xref--unresolved`
- [x] Lumina ships baseline `.rf-xref--external` styling
- [x] Authoring docs cover the resolution chain, regex anchoring, placeholder semantics, per-segment URL encoding behavior, and recipe examples (trace, GitHub, RFC, npm at minimum)

## Approach

Per the spec's Engine Changes section. Extend `resolveXrefs` in `packages/runes/src/xref-resolve.ts` with a `patterns: CompiledXrefPattern[]` parameter; split the resolver into entity lookup + URL resolution.

Per-segment encoding helper: `segments(value).map(encodeURIComponent).join('/')`.

`data-target-type` propagation is small but architecturally important — it's the generic convention drawer and any future addressable rune (popover, modal, sheet) consume to opt into trigger behavior.

## Dependencies

- {% ref "WORK-252" /%} — compiled `XrefPattern[]` must exist before the resolver can iterate them

## References

- {% ref "SPEC-065" /%} — xref-resolution spec (full)
- {% ref "SPEC-060" /%} — drawer rune (consumes `data-target-type`)
- {% ref "SPEC-064" /%} — plan entities with `sourceUrl: undefined` (the case the decoupling enables)
- `packages/runes/src/xref-resolve.ts` — current resolver
- `packages/lumina/styles/runes/xref.css` — CSS scaffolding

## Resolution

Completed: 2026-05-23

Branch: `claude/v0.15.0-phase-1`

### What was done

- **`packages/types/src/pipeline.ts`** — `EntityRegistration.sourceUrl` is now optional. TSDoc explains the semantics: undefined means "no usable canonical URL"; the resolver falls through to patterns instead of emitting `<a href="">`.
- **`packages/content/src/registry.ts`** — `EntityRegistryImpl.register` normalizes `sourceUrl: ""` to `sourceUrl: undefined` at registration. The byTypeAndUrl secondary index is skipped for entries without a URL (primary `getById` index still finds them).
- **`packages/runes/src/xref-resolve.ts`** — full rewrite of the resolver around the decoupled lookup/URL model:
  - `resolveXrefs(renderable, pageUrl, registry, patterns, ctx)` (new `patterns` parameter).
  - `resolvePlaceholder` does the chain: entity lookup → URL via `sourceUrl` → URL via pattern → unresolved.
  - `data-target-type` set when an entity was matched (regardless of URL source); `data-xref-source` carries `registry` or `pattern`; `data-xref-id` is the matched ID.
  - `applyTemplate` / `applyLabelTemplate` substitute `{id}` and `{name}` placeholders.
  - `encodePerSegment(value)` splits on `/`, encodes each segment via `encodeURIComponent`, rejoins. Path-shaped captures preserve slashes.
  - Self-reference detection now runs on the resolved href (covers pattern-resolved refs too).
  - Old `data-entity-type` / `data-entity-id` attributes replaced by spec-mandated `data-target-type` / `data-xref-id` (no production consumers).
- **`packages/runes/src/config.ts`**:
  - `resolveCoreSentinels`'s coreData shape gains `xrefPatterns?: CompiledXrefPattern[]`; both call sites pass through.
  - `corePipelineHooks` becomes the result of `createCorePipelineHooks()` (no patterns) — a new exported factory that closes over `opts.xrefPatterns` and threads them through `aggregate` into postProcess's coreData.
- **`packages/content/src/site.ts`** — `ProcessContentTreeOptions` and `LoadContentFromTreeOptions` gain `xrefPatterns?: CompiledXrefPattern[]`. `loadContent` accepts a 10th positional `xrefPatterns` arg. When patterns are present, the loader uses `createCorePipelineHooks({ xrefPatterns })` instead of the bare const.
- **`packages/content/src/loader.ts`** — `SiteLoaderOptions` and `VirtualSiteLoaderOptions` gain `xrefPatterns`, threaded to the underlying loader functions.
- **`packages/content/src/refract-loader.ts`** — `createRefraktLoader` reads `rawConfig.xrefs`, compiles via `compileConfiguredXrefPatterns` (which logs diagnostics to stderr without throwing), and passes the result to `createSiteLoader`. `createVirtualRefraktLoader` accepts an `xrefs?: XrefPattern[]` option with the same compilation path.
- **`packages/runes/test/xref-resolve.test.ts`** — 19 tests total. Existing tests updated for the new attribute names. Added: pattern fallback when no entity matches, registry-wins-over-patterns precedence, entity-without-sourceUrl + pattern resolution (the SPEC-064 case), per-segment encoding preserving slashes, single-segment encoding of reserved characters, unresolved fallback when neither matches, and `EntityRegistration.sourceUrl` normalization.
- **`packages/lumina/styles/runes/xref.css`** — added baseline `.rf-xref--external` styling with an outbound indicator (↗) for pattern-resolved (and any other non-local-type) refs.
- **`site/content/runes/xref.md`** — authoring docs updated with the new resolution model: split lookup/URL chain, configurable pattern config, pattern field reference, URL-encoding behavior, and recipes for refrakt trace, GitHub, RFC, npm, and Wikipedia.
- **`.changeset/xref-patterns-and-decoupled-resolver.md`** — minor-version changeset documenting the resolver refactor, optional `sourceUrl`, and renamed attributes.

### Notes

- **Pattern resolution preserves entity metadata when available.** If the registry matched an entity but its `sourceUrl` was empty/undefined, the pattern provides the URL while the entity's title and type still drive the rendered label and `rf-xref--{type}` modifier. The resolver also emits `data-target-type="{entity-type}"` in this case so behaviors (drawer, future addressable runes) can query against the matched entity even when the URL came from a pattern.
- **`corePipelineHooks` const stays exported** for back-compat. Tests using it directly still work (no patterns configured); only the content loader switches to the parameterized factory.
- **stderr diagnostics for pattern compilation:** the loader bootstrap surfaces compile warnings and errors directly to stderr so misconfigured patterns don't silently disappear. Pattern compilation never throws — invalid entries are skipped and the rest of the site still loads.
- **Three places needed manual test updates** because the attribute rename (`data-entity-type` → `data-target-type`, `data-entity-id` → `data-xref-id`) flowed through the test file. No production code uses the old names.

{% /work %}
