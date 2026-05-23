{% work id="WORK-254" status="ready" priority="medium" complexity="simple" source="SPEC-062" tags="runes, code, shared-utility" milestone="v0.15.0" %}

# Shared `lang-map` module in `@refrakt-md/runes`

Add a small extension-to-language map at `packages/runes/src/lang-map.ts`, exported from `@refrakt-md/runes`. Consumers (the snippet rune from WORK-255, the inspect tool in `packages/cli/`, the contracts generator, future runes wanting extension inference) import from there.

Living in `@refrakt-md/runes` rather than a plugin or the transform package is deliberate: every consumer already depends on runes; plugins can import from runes but not the reverse; and it's rune-shaped knowledge, sitting alongside the existing rune-utility surface.

## Acceptance Criteria

- [ ] `packages/runes/src/lang-map.ts` exists and is exported from the package's index
- [ ] Map covers the extensions documented in {% ref "SPEC-062" /%} Language Inference: `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.svelte`, `.vue`, `.md`, `.markdoc`, `.json`, `.jsonc`, `.html`, `.css`, `.yml`, `.yaml`, `.toml`, `.sh`, `.bash` (extensible)
- [ ] Unknown extensions fall back to `"text"` (no highlighting)
- [ ] Exported as both the raw map and a helper function (e.g., `inferLanguage(path: string): string`) for ergonomic use
- [ ] Unit tests cover the documented mappings and the fallback case
- [ ] Type definitions exported

## Approach

Tiny module: a `Record<string, string>` plus a helper. Both exported from `@refrakt-md/runes`. The helper takes a file path or extension and returns the language string (defaulting to `"text"`). No external dependencies.

## Dependencies

- None within v0.15.0. Independent.

## References

- {% ref "SPEC-062" /%} — snippet-rune spec (language inference section)
- `packages/runes/src/` — package home

{% /work %}
