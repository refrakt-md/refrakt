{% work id="WORK-505" status="done" priority="high" complexity="simple" source="SPEC-035" milestone="v0.29.0" tags="i18n,transform,layouts" %}

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

- [x] All Zone 3 layout strings and aria-labels resolve through `resolveLocaleString` with `layout.*` keys.
- [x] All Zone 4 computed strings resolve with `core.*` keys.
- [x] Zero-config English output unchanged.

## Blocked by

- {% ref "WORK-502" /%}

## References

- {% ref "SPEC-035" /%} — Zones 3 & 4.

## Resolution

Completed: 2026-07-17

Branch: `claude/milestone-v0-29-0-stzywk`

### What was done
- **Zone 4 (computed.ts):** `buildToc`/`buildPrevNext`/`buildVersionSwitcher` take an optional `LocaleContext` and resolve `core.toc.title`, `core.prevNext.previous`/`.next`, `core.versionSwitcher.label`.
- **Zone 3 (layout.ts):** added a `LAYOUT_STRINGS` catalog (`layout.*` → English) + reverse index; `localizeChromeText` swaps any chrome attribute value or text node that exactly matches a known layout string. Threaded `locale` through `layoutTransform` → `resolveComputed`/`resolveSlot`/`resolveSource`/`buildLayoutChrome`, plus slot `attrs`.
- `renderPage` (adapter.ts) forwards an optional `locale` to `layoutTransform`.
- Exported `LAYOUT_STRINGS` for the extract tooling. Tests in `i18n-chrome.test.ts` (6).

### Notes
- `locale` is optional everywhere → English default is byte-identical (612 transform tests pass). Only exact matches to the catalog are localized, so author/page content is never touched. Passing the site locale into `renderPage` from each adapter is completed in WORK-511.

{% /work %}
