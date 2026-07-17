{% work id="WORK-505" status="ready" priority="high" complexity="simple" source="SPEC-035" milestone="v0.29.0" tags="i18n,transform,layouts" %}

# Localize layout chrome (Zone 3) and computed transforms (Zone 4)

The two server-side chrome surfaces that are visible on every page: ~14 layout strings and the 4
computed-navigation strings. Both already receive config-derived data, so this is mostly wiring
`resolveLocaleString`.

## Scope

- **Zone 3 — layout chrome** (`packages/transform/src/layouts.ts`): resolve all visible text and aria-labels via `resolveLocaleString` with `layout.*` keys — `"Open menu"`, `"Close menu"`, `"Search"`, `"Menu"`, `"Toggle navigation"`, `"Navigation menu"`, `"Page navigation"`, `"Plan navigation"`, `"Toggle color theme"`, `"Jump to section"`, `"Plan"`.
- **Zone 4 — computed transforms** (`packages/transform/src/computed.ts`): `buildToc()` → `core.toc.title` (`"On this page"`); `buildPrevNext()` → `core.prevNext.previous` / `.next`; `buildVersionSwitcher()` → `core.versionSwitcher.label`.
- Pass the `LocaleContext` into the layout builders and computed functions.
- Tests: a German locale renders translated chrome; missing keys fall back to English.

## Acceptance Criteria

- [ ] All Zone 3 layout strings and aria-labels resolve through `resolveLocaleString` with `layout.*` keys.
- [ ] All Zone 4 computed strings resolve with `core.*` keys.
- [ ] Zero-config English output unchanged.

## Blocked by

- {% ref "WORK-502" /%}

## References

- {% ref "SPEC-035" /%} — Zones 3 & 4.

{% /work %}
