{% work id="WORK-507" status="ready" priority="medium" complexity="moderate" source="SPEC-035" milestone="v0.29.0" tags="i18n,behaviors,transform,svelte" %}

# Localize behavior strings (Zone 5) — inline delivery

The ~45 client-side strings across `packages/behaviors/src/behaviors/` and `.../elements/`.
Behaviors have no server config, so translations are delivered **inline** (Decision D4): no fetched
endpoint.

## Scope

- **`data-i18n-*` attributes**: the identity transform emits `data-i18n-{key}={translated}` on rune root elements for behavior strings that attach to an element it already renders. Prefer this path wherever a string has an anchor element.
- **Inline JSON block**: `ThemeShell` (and each adapter's page shell) emits `<meta name="rf-locale">` + `<script type="application/json" id="rf-strings">` carrying **only runtime-created** strings (e.g. `"No results found."`, `"Copied"`, dynamically-built gallery labels) — ~15–20 strings, active locale only.
- Each behavior reads: element attribute → `getGlobalString(key)` → hardcoded English default.
- Cover the new files the spec inventory added: `behaviors/carousel.ts`, `behaviors/mobile-menu.ts`, `behaviors/section-nav.ts`/`scrollspy.ts`, plus `elements/*` (audio/map/sandbox; scan chart/diagram/nav/context).
- Tests: attribute + block resolution, and SSR-only (no-JS) fallback to English.

## Acceptance Criteria

- [ ] Element-attached behavior strings resolve from `data-i18n-*`; runtime-created strings resolve from the inline JSON block; both fall back to English.
- [ ] Only the active locale is emitted; no `/rf-strings.json` fetch is introduced.
- [ ] Strings are available synchronously at behavior init (no flash-of-English); no-JS pages render English.
- [ ] All Zone 5 files, including the new ones, are covered.

## Blocked by

- {% ref "WORK-502" /%}

## References

- {% ref "SPEC-035" /%} — Zone 5, Client-side Resolution, Decision D4.

{% /work %}
