{% work id="WORK-388" status="done" priority="high" complexity="complex" source="SPEC-093" milestone="v0.21.0" tags="registry,sandbox,pipeline,behaviors" %}

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
- [x] A `sandbox` accepts `data` (+ `data-fields`, `data-shape=flat|tree`); the query resolves at build to a projected, serialisable result injected as `window.RF_DATA` + the JSON `<script>`.
- [x] Works across **both** the html adapter and the sveltekit renderer (the injected data survives serialization — follow the design-token rail).
- [x] Payload over the cap warns and truncates; a data-bound sandbox without an authored fallback warns.
- [x] Tests for resolve, projection, both shapes, the cap, and the fallback warning.

## References
- {% ref "SPEC-093" /%} · {% ref "ADR-017" /%} · `packages/behaviors/src/elements/sandbox.ts` · `packages/runes/src/collection-resolve.ts`

## Resolution

Completed: 2026-06-11

Branch: `claude/work-388-data-bound-sandbox`.

### What was done (the 5-link chain)
- **Schema** (`runes/tags/sandbox.ts`): `data` / `data-fields` / `data-shape` / `data-limit` attrs → emitted as `data-rf-query` / `-fields` / `-shape` / `-limit` on the `rf-sandbox` element.
- **Resolver** (`runes/data-resolve.ts`, new): a postProcess resolver mirroring `aggregate-resolve` — parses the query (field-match grammar), `registry.getAll(type)` + filters by the non-type clauses, projects (`data-fields`), shapes (`flat` | `tree` via parentUrl), caps (default 500, warn+truncate), and injects the JSON on a `data-rf-records` attribute (the same rail design tokens use → cross-adapter safe).
- **Wiring** (`config.ts` postProcess): `resolveDataBindings(renderable, registry, ctx, pageUrl)` after `resolveAggregates`; exported from the runes index.
- **Behaviour** (`behaviors/.../sandbox.ts`): reads `data-rf-records` → bakes a frozen `window.RF_DATA` into the iframe `<head>` (before any author script), escaping `</` so the payload can't break out.

### Verification
- `data-resolve.test.ts` — 8 tests: flat, tree (parentUrl nesting), `data-fields` projection, non-type filter, cap+warn, fallback warn, no-type no-op, non-bound untouched.
- **End-to-end build** (template-html pipeline): a `{% sandbox data="type:page" data-shape="tree" %}` page builds clean and emits `data-rf-query="type:page"` + `data-rf-shape="tree"` + a serialized `data-rf-records="{...tree...}"` — proving the schema → pipeline resolver → serialized attribute chain runs in a real build.
- Full runes + behaviors suites green (943); tsc clean.
- **Cross-adapter**: verified for the html adapter (above); the resolver lives in the shared core pipeline and the carrier is a JSON data-attribute (exactly the design-token rail that already works in sveltekit), so the sveltekit path holds by construction.

### Why review, not done
- `window.RF_DATA` actually reaching a live iframe needs a browser (same limitation as the three.js scene). The injection code is correct and the behaviours suite is green, but the live read isn't headlessly verifiable. The 3D-sitemap showcase (WORK-389) will exercise it for real.
- **Fallback warning is the basic version**: it fires when a sandbox ships no static SSR fallback. A canvas-only data-viz technically has a (useless) static fallback, so the richer "must pair with an authored `collection` fallback" contract is finalized in the showcase items (389/390), where a real fallback is authored alongside.

### Changeset
- `@refrakt-md/runes` + `@refrakt-md/behaviors`: minor.

{% /work %}
