{% work id="WORK-256" status="ready" priority="medium" complexity="simple" source="SPEC-060" tags="registry, types, pipeline" milestone="v0.15.0" %}

# `EntityRegistration.scope: 'page' | 'site'` field

Small registry interface evolution to support page-scoped entities (drawers from WORK-257, future page-local primitives). Page-scoped entries are namespaced internally by page URL so two pages can each declare the same ID without collision. Site-scoped entries (the existing behavior, the default for back-compat) continue to be globally addressable.

## Acceptance Criteria

- [ ] `EntityRegistration` interface gains an optional `scope?: 'page' | 'site'` field
- [ ] Default is `'site'` when omitted (back-compatible — existing registrations behave identically)
- [ ] `EntityRegistry` implementation namespaces page-scoped entries internally by page URL, so two pages can register the same ID with `scope: 'page'` without colliding
- [ ] Lookup of a page-scoped entity from a specific page resolves correctly to that page's entry
- [ ] Cross-page lookup of a page-scoped entity finds it (used by xref resolution for cross-page drawer triggers, though end-to-end UX is out of v1)
- [ ] Existing site-scoped registrations and lookups are unaffected (no regression)
- [ ] Tests cover the same-ID-different-pages case for page-scoped entries
- [ ] Documentation note in the registry interface explains the field and its consequences

## Approach

Per the spec: `EntityRegistration` interface in `packages/types/src/registry.ts` (or wherever the interface lives) gains the optional field. `EntityRegistryImpl` in `packages/content/src/registry.ts` adds internal page-qualified keying (something like `${pageUrl}::${id}` under the hood) for page-scoped entries. Site-scoped path stays as-is.

## Dependencies

- None within v0.15.0.

## References

- {% ref "SPEC-060" /%} — drawer-rune spec (the motivating consumer)
- `packages/types/src/registry.ts` — `EntityRegistration` interface
- `packages/content/src/registry.ts` — `EntityRegistryImpl`

{% /work %}
