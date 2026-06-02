{% work id="WORK-311" status="done" priority="medium" complexity="simple" source="SPEC-079" tags="media,plugin,runes,migration,metafields,zones,phase-2" milestone="v0.17.0" %}

# Media plugin migration to metaFields + zones

Phase 2 of {% ref "SPEC-079" /%}. Migrates the media plugin's
meta-bearing runes (Track, Audio) from the legacy `slots + structure`
config shape to the new `metaFields + zones + contentSlots` model.

## Acceptance Criteria

- [ ] **`plugins/media/src/config.ts` rewritten.**
  - **Track**: type (the single existing meta field). Eyebrow:
    type only (or fold into metadata — Track has so few fields
    that an eyebrow row of one chip may not be worth the visual
    weight). Decision deferred to implementer.
  - **Audio**: any meta fields it carries (audit during
    implementation). Same treatment.
  - **Playlist**: container rune for tracks — likely no meta
    projection, stays on existing path.

- [ ] **Per-rune CSS updated.** Selectors in
  `plugins/media/styles/{track,audio}.css` referencing
  `__header-primary` / `__header-secondary` rewritten if present.

- [ ] **Plugin tests updated.** Tests in `plugins/media/test/`
  reflect the new DOM shape.

- [ ] **Backwards-compat shim warning silent for media.**

- [ ] **Docs.** Media rune doc pages updated where output contracts
  appear.

## Approach

The smallest Phase 2 plugin (1-2 runes with limited meta). Quick
migration. Audit Audio's meta usage during implementation — if it
genuinely has no meta projection, it stays on the existing path.

## Dependencies

- {% ref "WORK-305" /%} — engine + layout primitives (done).
- {% ref "WORK-306" /%} — plan plugin migration reference (done).

## References

- {% ref "SPEC-079" /%} — the spec being implemented.

## Resolution

Completed: 2026-06-02

Superseded by WORK-319. Targeted the SPEC-079 zones model; media (Playlist) migrated straight to the SPEC-080 blocks/layout model instead on branch `claude/definitions-list-styling-9nOGL`.

{% /work %}
