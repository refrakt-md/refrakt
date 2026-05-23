{% work id="WORK-256" status="done" priority="medium" complexity="simple" source="SPEC-060" tags="registry, types, pipeline" milestone="v0.15.0" %}

# `EntityRegistration.scope: 'page' | 'site'` field

Small registry interface evolution to support page-scoped entities (drawers from WORK-257, future page-local primitives). Page-scoped entries are namespaced internally by page URL so two pages can each declare the same ID without collision. Site-scoped entries (the existing behavior, the default for back-compat) continue to be globally addressable.

## Acceptance Criteria

- [x] `EntityRegistration` interface gains an optional `scope?: 'page' | 'site'` field
- [x] Default is `'site'` when omitted (back-compatible — existing registrations behave identically)
- [x] `EntityRegistry` implementation namespaces page-scoped entries internally by page URL, so two pages can register the same ID with `scope: 'page'` without colliding
- [x] Lookup of a page-scoped entity from a specific page resolves correctly to that page's entry
- [x] Cross-page lookup of a page-scoped entity finds it (used by xref resolution for cross-page drawer triggers, though end-to-end UX is out of v1)
- [x] Existing site-scoped registrations and lookups are unaffected (no regression)
- [x] Tests cover the same-ID-different-pages case for page-scoped entries
- [x] Documentation note in the registry interface explains the field and its consequences

## Approach

Per the spec: `EntityRegistration` interface in `packages/types/src/registry.ts` (or wherever the interface lives) gains the optional field. `EntityRegistryImpl` in `packages/content/src/registry.ts` adds internal page-qualified keying (something like `${pageUrl}::${id}` under the hood) for page-scoped entries. Site-scoped path stays as-is.

## Dependencies

- None within v0.15.0.

## References

- {% ref "SPEC-060" /%} — drawer-rune spec (the motivating consumer)
- `packages/types/src/registry.ts` — `EntityRegistration` interface
- `packages/content/src/registry.ts` — `EntityRegistryImpl`

## Resolution

Completed: 2026-05-23

Branch: `claude/v0.15.0`

### What was done
- `packages/types/src/pipeline.ts` — added `scope?: 'page' | 'site'` to `EntityRegistration` (default `'site'`); extended `EntityRegistry.getById` with an optional `pageUrl` parameter so callers can resolve page-scoped entries without colliding across pages.
- `packages/content/src/registry.ts` — keyed page-scoped entries internally by `${sourceUrl}::${id}` while site-scoped entries keep using the bare `id` (preserving pre-WORK-256 collision semantics). `getById(type, id, pageUrl)` checks the page-scoped key first and falls back to the site-scoped key; `getByUrl` and `getAll` naturally surface page-scoped entries because they're in the same maps.
- `packages/runes/src/xref-resolve.ts` — threaded the resolving page's URL through `findEntityById` to `registry.getById(type, id, pageUrl)`, so the xref resolver finds page-scoped drawers from the same page (and falls back to site-scoped entries when none).
- `packages/content/test/registry.test.ts` — four new tests covering: same-id-on-different-pages doesn't collide; page-scoped takes precedence over site-scoped with `pageUrl`; `getByUrl` surfaces page-scoped entries from that page; re-registering the same `(type, id, sourceUrl)` page-scoped entry overwrites the prior one.

### Notes
- `getById(type, id)` (no `pageUrl`) intentionally returns `undefined` for entries that exist only at page scope — there's no globally-meaningful answer for a page-local id. Callers that need to enumerate page-scoped entries iterate via `getAll(type)` or `getByUrl(type, url)`.
- Page-scoped entries without a `sourceUrl` fall back to the site-scoped key, which is a degenerate configuration; the drawer rune (WORK-257) will always supply `sourceUrl = "${pageUrl}#drawer-${id}"`.
- 2763/2763 tests pass after the change.

{% /work %}
