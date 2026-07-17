{% work id="WORK-506" status="ready" priority="high" complexity="moderate" source="SPEC-035" milestone="v0.29.0" tags="i18n,cli,mcp,tooling" %}

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

- [ ] `refrakt i18n extract` emits a complete `key → English default` JSON dictionary covering core + all loaded plugins.
- [ ] `--check` fails on missing/orphaned keys and prints per-locale coverage.
- [ ] Extract output shape matches the translation-file format consumed by `ThemeConfig.strings` / `Plugin.translations`.
- [ ] The command is registered as an MCP tool.

## Blocked by

- {% ref "WORK-504" /%}

## References

- {% ref "SPEC-035" /%} — Tooling section, Decisions D1/D3.

{% /work %}
