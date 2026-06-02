{% work id="WORK-310" status="done" priority="medium" complexity="simple" source="SPEC-079" tags="places,plugin,runes,migration,metafields,zones,phase-2" milestone="v0.17.0" %}

# Places plugin migration to metaFields + zones

Phase 2 of {% ref "SPEC-079" /%}. Migrates the places plugin's
meta-bearing rune (Event) from the legacy `slots + structure` config
shape to the new `metaFields + zones + contentSlots` model.

## Acceptance Criteria

- [ ] **`plugins/places/src/config.ts` Event entry rewritten.**
  - **Event**: date, endDate, location. No eyebrow projected (or
    optional — depends on whether `date` reads more naturally as
    an eyebrow than as a metadata cell). Metadata: all three
    fields, with date and endDate using `tag: 'time'` for proper
    `<time datetime="…">` output.
  - The date-range pattern (`date — endDate` rendered as a single
    visual unit in the legacy structure) needs the same effect via
    the new model. Options: (a) declare both fields in metadata
    and let the def-list render two rows; (b) keep them as a custom
    `dateRange` zone using `chip-row` to render side-by-side; (c)
    project them as an eyebrow with `split` (left: date, right:
    endDate).
  - Decision deferred to the implementer — pick whichever reads
    best in the rendered site.

- [ ] **Itinerary / Map / MapPin untouched.** Either no meta
  projection or container runes — stay on the existing path.

- [ ] **Per-rune CSS updated.** Selectors in
  `plugins/places/styles/event.css` referencing
  `__header-primary` / `__header-secondary` rewritten.

- [ ] **Plugin tests updated.** Tests in `plugins/places/test/`
  reflect the new DOM shape.

- [ ] **Backwards-compat shim warning silent for places.**

- [ ] **Docs.** Event rune doc page
  (`site/content/runes/places/event.md`) — output-contract snippets
  updated.

## Approach

Single-rune migration. The date-range visual is the only place
that needs design judgement — try the simple two-row def-list first,
escalate to a custom zone if it reads worse than today's
side-by-side.

## Dependencies

- {% ref "WORK-305" /%} — engine + layout primitives (done).
- {% ref "WORK-306" /%} — plan plugin migration reference (done).

## References

- {% ref "SPEC-079" /%} — the spec being implemented.

## Resolution

Completed: 2026-06-02

Superseded by WORK-319. Targeted the SPEC-079 zones model; places (Event) migrated straight to the SPEC-080 blocks/layout model instead on branch `claude/definitions-list-styling-9nOGL`.

{% /work %}
