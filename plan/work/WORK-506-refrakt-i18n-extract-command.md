{% work id="WORK-506" status="done" priority="high" complexity="moderate" source="SPEC-035" milestone="v0.29.0" tags="i18n,cli,mcp,tooling" %}

# `refrakt i18n extract` command (+ `--check` + MCP)

Auto-derived keys (Decision D1) are only usable if authors and translators can discover them, so
this command is the load-bearing mitigation, not a convenience. It emits the full derivable key set
with English defaults as a JSON dictionary — the same shape as translation files (Decision D3), so
`extract → translate → commit <locale>.json` round-trips.

## Scope

- `refrakt i18n extract` — walk every rune's structure / `metaFields` (reuse the `contracts` machinery) and emit `key → English default` as JSON to stdout / `-o`.
- Include core, layout, computed, enum, and per-plugin keys; only structured/JSON output (makes the MCP wrapper thin).
- `--check` mode (mirroring `contracts --check`) — fail CI on a new labelled field with no dictionary entry or an orphaned key after a rename; report per-locale coverage (e.g. `de: 94%`).
- Expose as an MCP tool following the `refrakt.contracts` precedent. Detailed input schema is deferred to implementation.

## Acceptance Criteria

- [x] `refrakt i18n extract` emits a complete `key → English default` JSON dictionary covering core + all loaded plugins.
- [x] `--check` fails on missing/orphaned keys and prints per-locale coverage.
- [x] Extract output shape matches the translation-file format consumed by `ThemeConfig.strings` / `Plugin.translations`.
- [x] The command is registered as an MCP tool.

## Blocked by

- {% ref "WORK-504" /%}

## References

- {% ref "SPEC-035" /%} — Tooling section, Decisions D1/D3.

## Resolution

Completed: 2026-07-17

Branch: `claude/milestone-v0-29-0-stzywk`

### What was done
- `packages/transform/src/i18n-extract.ts`: `extractI18nKeys(config)` walks metaFields/structure labels (`{scope}.{block}.{ref}`), the `LAYOUT_STRINGS`/`COMPUTED_STRINGS` catalogs, and Zone-6 `i18nEnums`, emitting a sorted `key → English default` dict. `checkI18nBundle()` reports missing/orphaned keys + coverage.
- CLI `refrakt i18n extract` (`commands/i18n.ts` + `bin.ts`): `-o`, `--check --locale <path>` (per-locale coverage %, non-zero exit on drift), `--config`/`--site`.
- MCP `refrakt.i18n_extract` tool (`packages/mcp/src/tools/core.ts`).
- Added `RuneConfig.i18nEnums` (Zone-6 declaration; consumed by WORK-508) and `COMPUTED_STRINGS`.
- **Fixed scope stamping** in `assembleThemeConfig`: provenance is keyed by the plugin's own (kebab/lower) rune name while `config.runes` is PascalCase — added a casing-agnostic `normalizeRuneKey` and built the lookup from input provenance to avoid the spurious `core:` entries clobbering it. Plugin keys now correctly read `learning.recipe.prepTime`, `docs.symbol.since`, etc.

### Notes
- Tests: `i18n-extract.test.ts` (9). Verified end-to-end against the site (`--site main`): 71 keys with correct plugin scopes; `--check` reports coverage + missing/orphaned.

{% /work %}
