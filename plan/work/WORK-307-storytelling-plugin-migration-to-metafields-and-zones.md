{% work id="WORK-307" status="ready" priority="medium" complexity="moderate" source="SPEC-079" tags="storytelling,plugin,runes,migration,metafields,zones,phase-2" milestone="v0.17.0" %}

# Storytelling plugin migration to metaFields + zones

Phase 2 of {% ref "SPEC-079" /%}. Migrates the storytelling plugin's
meta-bearing runes (Character, Realm, Lore, Faction, Plot) from the
legacy `slots + structure` config shape to the new
`metaFields + zones + contentSlots` model. No visual change — Phase 1
already moved the chip look universally via Lumina's
`dimensions/metadata.css` rewrite + the universal `.rf-badge` class.
Phase 2 is purely config-shape cleanup.

## Acceptance Criteria

- [ ] **`plugins/storytelling/src/config.ts` rewritten.** Each of the
  five meta-bearing runes replaces its `slots: […]` / `structure: {
  … }` block with `metaFields` + `zones` + `contentSlots`:
  - **Character**: role, status, age, faction, realm. Eyebrow:
    role + status. Metadata: the rest.
  - **Realm**: realmType, scale, climate, ruler. Eyebrow:
    realmType + status. Metadata: the rest.
  - **Lore**: category, era, source. No eyebrow projected (user
    can author one via `{% eyebrow %}`). Metadata: the lot.
  - **Faction**: factionType, alignment, size, leader. Eyebrow:
    factionType + alignment. Metadata: the rest.
  - **Plot**: plotType, structure, status. Eyebrow:
    plotType + status. Metadata: the rest.
  - `sentimentMap` values preserved verbatim from today's config
    (alive/dead/missing on character status, alignment values on
    faction, etc.).
  - Optional multi-value fields (tags, related-characters, related-
    realms) use `splitOn: ','` to fan into per-item chips when
    declared in a custom `tags` zone.

- [ ] **Per-rune CSS updated.** Selectors in
  `plugins/storytelling/styles/{character,realm,lore,faction,plot}.css`
  that referenced the legacy `__header-primary` / `__header-secondary`
  classes rewritten to `__eyebrow` / `__metadata`. Rune-specific
  quirks (portrait positioning, scene image layout, faction emblem)
  preserved.

- [ ] **Section runes untouched.** CharacterSection / RealmSection /
  FactionSection are content containers without meta projection —
  they stay on the existing path.

- [ ] **Plugin tests updated.** Tests in `plugins/storytelling/test/`
  that snapshot rune output reflect the new DOM shape (zone-named
  classes, def-list metadata where Lumina applies it).

- [ ] **Backwards-compat shim warning silent for storytelling.** The
  one-time warning in `transformRune` no longer fires for any
  storytelling rune after migration.

- [ ] **Docs.** Storytelling rune doc pages
  (`site/content/runes/storytelling/{character,realm,lore,faction,
  plot}.md`) — any output-contract snippets referencing the legacy
  class names updated to the new zone-named selectors.

## Approach

Per-rune config rewrite following the WORK-306 plan-plugin pattern.
Each migration is small (one rune's `metaFields` + `zones` block) and
can land as a separate commit on the same branch:

1. **Character** first — most fields, validates the shape.
2. **Faction** — similar pattern (eyebrow + def-list metadata),
   with the alignment sentiment map.
3. **Realm** — simpler.
4. **Plot** — simpler.
5. **Lore** — simplest, no eyebrow projected.

CSS class-rename sweep follows the config migration. Snapshot tests
regenerated last.

## Dependencies

- {% ref "WORK-305" /%} — engine + layout primitives (done).
- {% ref "WORK-306" /%} — plan plugin migration reference (done).

## References

- {% ref "SPEC-079" /%} — the spec being implemented.

{% /work %}
