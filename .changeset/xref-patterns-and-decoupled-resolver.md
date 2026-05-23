---
"@refrakt-md/types": minor
"@refrakt-md/runes": minor
"@refrakt-md/content": minor
---

Cross-reference resolution: configurable URL patterns, decoupled entity/URL lookup, per-segment encoding, and `data-target-type` propagation (SPEC-065).

The xref resolver now supports a `xrefs: XrefPattern[]` array in `refrakt.config.json` that maps unresolved IDs to URLs via regex + template. Compiled once per build via `compileXrefPatterns` (exported from `@refrakt-md/runes`).

Resolution model:

1. **Entity lookup** — find the entity in the registry (exact ID, then name/title). Captures metadata (label, type) regardless of whether a URL is available.
2. **URL resolution** — use the entity's `sourceUrl` if present and non-empty; otherwise iterate `xrefs` patterns, first match wins; otherwise unresolved.
3. **Rendered anchor** carries `data-xref-id`, `data-xref-source="registry"|"pattern"`, and `data-target-type="{entity-type}"` when the entity was matched (drawer / future addressable runes query this).

`EntityRegistration.sourceUrl` is now optional. Empty strings passed at registration are normalized to `undefined` so plan content registered without a URL (SPEC-064) flows correctly through pattern resolution. The byTypeAndUrl index skips entries without a URL.

Substituted template values are encoded per URL segment (split on `/`, encode each segment, rejoin) so path-shaped captures like `(?<path>[a-z0-9/-]+)` preserve their slash structure: a pattern matching `docs:guide/intro` now resolves to `.../guide/intro`, not `.../guide%2Fintro`.

Authors using `corePipelineHooks` directly continue to work unchanged; the new `createCorePipelineHooks({ xrefPatterns })` factory is used by the content loader to inject compiled patterns. `createRefraktLoader` reads `refrakt.config.json#/xrefs` and compiles automatically.

The old `data-entity-type` / `data-entity-id` attributes on resolved anchors are replaced by `data-target-type` / `data-xref-id`. No production code outside of the resolver itself referenced the old names.
