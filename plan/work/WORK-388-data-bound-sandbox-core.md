{% work id="WORK-388" status="ready" priority="high" complexity="complex" source="SPEC-093" milestone="v0.21.0" tags="registry,sandbox,pipeline,behaviors" %}

# Data-bound sandbox core

SPEC-093 core — the build-time data channel from the registry into a sandbox. The
registry's third render target (HTML via `collection`, SVG via `aggregate`,
arbitrary client-side here). Independent of the SPEC-092 track: `flat`/`tree`
shapes work over the `page`/`pageTree` data that exists today.

## Decisions (locked)
- **Binding:** a `data` attribute carrying a SPEC-070 field-match query (+ optional
  `data-fields` projection, `data-shape`). Resolved at build by a step sibling to
  `collection-resolve`.
- **Injection:** an inline `<script type="application/json">` is the canonical
  transport (handles large payloads; data-attributes don't), exposed to the iframe
  as a frozen global `window.RF_DATA`, alongside the existing design-token/theme
  globals. Reuses the proven token-injection rail in `behaviors/.../sandbox.ts`.
- **Shapes (this item):** `flat` (entity array) and `tree` (nest by `parentUrl`).
  `graph` is WORK-390.
- **Fallback is mandatory and authored** for v0.21.0 (auto-fallback deferred): a
  data-bound sandbox with no authored `collection`/`aggregate` fallback **warns**.
- **Bounded payload:** a configurable cap (records/bytes) — exceed → warn + truncate.

## Acceptance Criteria
- [ ] A `sandbox` accepts `data` (+ `data-fields`, `data-shape=flat|tree`); the query resolves at build to a projected, serialisable result injected as `window.RF_DATA` + the JSON `<script>`.
- [ ] Works across **both** the html adapter and the sveltekit renderer (the injected data survives serialization — follow the design-token rail).
- [ ] Payload over the cap warns and truncates; a data-bound sandbox without an authored fallback warns.
- [ ] Tests for resolve, projection, both shapes, the cap, and the fallback warning.

## References
- {% ref "SPEC-093" /%} · {% ref "ADR-017" /%} · `packages/behaviors/src/elements/sandbox.ts` · `packages/runes/src/collection-resolve.ts`

{% /work %}
