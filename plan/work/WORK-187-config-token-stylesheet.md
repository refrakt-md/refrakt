{% work id="WORK-187" status="in-progress" priority="high" complexity="medium" tags="config, tokens, build" source="SPEC-048" milestone="v0.14.0" %}

# Config-driven token stylesheet generation

Make `refrakt.config.json` → `theme.tokens` the canonical authoring surface for token overrides. The build pipeline validates the config against the typed contract, generates a `:root { --rf-* }` stylesheet, and injects it after the theme's base CSS but before any user CSS. Power users can still drop a stylesheet for things JSON can't express (`color-mix()`, scoped overrides), but the common case is config sugar.

## Acceptance Criteria

- [x] `theme.tokens` field in `refrakt.config.json` validated against `ThemeTokensConfig` at build time — `validateThemeTokensConfig` exported from `@refrakt-md/transform` walks the contract tree and rejects unknown keys, non-string leaves, and bad shapes
- [x] Validation errors surface clear messages (path + invalid value + valid options where applicable), not opaque schema errors — `TokenValidationError` carries dot-path + human-readable message; `formatTokenValidationErrors` produces multi-line output for adapters to throw or log
- [x] Build pipeline emits a generated `:root { --rf-* }` stylesheet matching the validated config — `generateTokenStylesheet` and `generateThemeStylesheet` exported from `@refrakt-md/transform`
- [ ] Generated stylesheet injected into the rendered page after the theme package's CSS and before any user CSS files *(deferred to Chunk 3 — adapter integration lands with the Lumina migration in {% ref "WORK-191" /%}, where the pipeline can be verified against a real config-driven theme)*
- [x] `extra: Record<string, string>` escape hatch passes through to the generated stylesheet as `:root { --<key>: <value>; }` declarations
- [ ] A site with `theme.tokens.color.text = "#ff0000"` in config renders body text as red without any custom CSS *(deferred to Chunk 3 with adapter integration)*
- [x] Unit tests cover: validation passes for valid configs, validation fails with clear messages for invalid configs, generated stylesheet matches expected output — 35 new tests across `token-merge.test.ts`, `token-stylesheet.test.ts`, `token-validate.test.ts`

## Approach

The generation pipeline lives in `@refrakt-md/transform` or `@refrakt-md/content` (decide during implementation — likely transform since it's where the merge logic lives).

Validation: use a runtime schema validator (Zod is already in use elsewhere in the project — check first; otherwise `valibot` or hand-rolled given the shape's stability). Validate at config-load time, fail fast.

Stylesheet generation: walk the `ThemeTokensConfig` tree, emit one CSS custom property per leaf, generate the dot-to-dash mapping (`color.surface.base` → `--rf-color-surface-base`).

Injection: the SvelteKit Vite plugin and any other adapter integrates the generated stylesheet after the theme package's CSS in the document head. Order matters — theme provides defaults, generated CSS overrides them.

Out of scope here: the actual token *values* for the neutral default (that's {% ref "WORK-200" /%}), preset merge (that's {% ref "WORK-190" /%}), mode overlays (that's {% ref "WORK-188" /%}).

## Dependencies

- {% ref "WORK-185" /%} — `ThemeTokensConfig` shape must exist.

## References

- {% ref "SPEC-048" /%} — "Config is sugar over CSS, not a replacement" design principle
- Existing `refrakt.config.json` validation (if any) — extend rather than parallel-implement
- `packages/sveltekit` — Vite plugin where CSS injection order is currently controlled

{% /work %}
