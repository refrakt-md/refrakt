{% work id="WORK-254" status="done" priority="medium" complexity="simple" source="SPEC-062" tags="runes, code, shared-utility" milestone="v0.15.0" %}

# Shared `lang-map` module in `@refrakt-md/runes`

Add a small extension-to-language map at `packages/runes/src/lang-map.ts`, exported from `@refrakt-md/runes`. Consumers (the snippet rune from WORK-255, the inspect tool in `packages/cli/`, the contracts generator, future runes wanting extension inference) import from there.

Living in `@refrakt-md/runes` rather than a plugin or the transform package is deliberate: every consumer already depends on runes; plugins can import from runes but not the reverse; and it's rune-shaped knowledge, sitting alongside the existing rune-utility surface.

## Acceptance Criteria

- [x] `packages/runes/src/lang-map.ts` exists and is exported from the package's index
- [x] Map covers the extensions documented in {% ref "SPEC-062" /%} Language Inference: `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.svelte`, `.vue`, `.md`, `.markdoc`, `.json`, `.jsonc`, `.html`, `.css`, `.yml`, `.yaml`, `.toml`, `.sh`, `.bash` (extensible)
- [x] Unknown extensions fall back to `"text"` (no highlighting)
- [x] Exported as both the raw map and a helper function (e.g., `inferLanguage(path: string): string`) for ergonomic use
- [x] Unit tests cover the documented mappings and the fallback case
- [x] Type definitions exported

## Approach

Tiny module: a `Record<string, string>` plus a helper. Both exported from `@refrakt-md/runes`. The helper takes a file path or extension and returns the language string (defaulting to `"text"`). No external dependencies.

## Dependencies

- None within v0.15.0. Independent.

## References

- {% ref "SPEC-062" /%} — snippet-rune spec (language inference section)
- `packages/runes/src/` — package home

## Resolution

Completed: 2026-05-23

Branch: `claude/v0.15.0-phase-2`

### What was done

- **`packages/runes/src/lang-map.ts`** — new module exporting `LANG_MAP` (frozen `Readonly<Record<string, string>>`), `FALLBACK_LANG` (`'text'`), and `inferLanguage(pathOrExt: string): string`. The map covers every extension documented in SPEC-062 § Language Inference: `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.svelte`, `.vue`, `.md`, `.markdoc`, `.json`, `.jsonc`, `.html`, `.css`, `.yml`, `.yaml`, `.toml`, `.sh`, `.bash`.
- **`packages/runes/src/index.ts`** — re-exports `LANG_MAP`, `FALLBACK_LANG`, and `inferLanguage` from the package entry point.
- **`packages/runes/test/lang-map.test.ts`** — 12 tests covering: the documented mappings, frozen-ness, fallback constant value, inference from full paths (POSIX + Windows separators), inference from bare extensions (with and without leading dot), case-insensitivity, fallback for unknown extensions, defensive paths for empty / null / undefined input, multi-dot filenames, and the "dot in path segment but no extension on final segment" edge case.

### Notes

- `inferLanguage` accepts three input shapes for ergonomics: full path (`"src/lib/foo.ts"`), bare extension with dot (`".ts"`), and bare extension without dot (`"ts"`). The "no dot anywhere" branch treats the whole string as a bare extension — matches the pattern where a caller has already extracted the extension somehow but didn't normalize the leading dot.
- Frozen map (`Object.freeze`) prevents downstream mutation. If extension coverage needs to grow, future consumers should extend via composition (e.g., a wrapper that checks a plugin-supplied map first, falls back to `LANG_MAP`), not by mutating the canonical export.
- Windows path support uses `Math.max` over both `/` and `\` lastIndexOf values so cross-platform paths Just Work without callers having to normalize first.

{% /work %}
