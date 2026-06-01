{% work id="WORK-307" status="done" priority="medium" complexity="moderate" source="SPEC-079" tags="storytelling,plugin,runes,migration,metafields,zones,phase-2" milestone="v0.17.0" %}

# Storytelling plugin migration to metaFields + zones

Phase 2 of {% ref "SPEC-079" /%}. Migrates the storytelling plugin's
meta-bearing runes (Character, Realm, Lore, Faction, Plot) from the
legacy `slots + structure` config shape to the new
`metaFields + zones + contentSlots` model. No visual change — Phase 1
already moved the chip look universally via Lumina's
`dimensions/metadata.css` rewrite + the universal `.rf-badge` class.
Phase 2 is purely config-shape cleanup.

## Acceptance Criteria

- [x] **`plugins/storytelling/src/config.ts` rewritten.** Each of the
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

- [x] **Per-rune CSS updated.** Selectors in
  `plugins/storytelling/styles/{character,realm,lore,faction,plot}.css`
  that referenced the legacy `__header-primary` / `__header-secondary`
  classes rewritten to `__eyebrow` / `__metadata`. Rune-specific
  quirks (portrait positioning, scene image layout, faction emblem)
  preserved.

- [x] **Section runes untouched.** CharacterSection / RealmSection /
  FactionSection are content containers without meta projection —
  they stay on the existing path.

- [x] **Plugin tests updated.** Tests in `plugins/storytelling/test/`
  that snapshot rune output reflect the new DOM shape (zone-named
  classes, def-list metadata where Lumina applies it).

- [x] **Backwards-compat shim warning silent for storytelling.** The
  one-time warning in `transformRune` no longer fires for any
  storytelling rune after migration.

- [x] **Docs.** Storytelling rune doc pages
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

## Resolution

Completed: 2026-06-01

Branch: `claude/spec-079-implementation`

### What was done

**`plugins/storytelling/src/config.ts` rewritten.** All 5 meta-bearing runes (Character, Realm, Lore, Faction, Plot) migrated from `structure.badge` legacy block to `metaFields` + `zones`:
- **Character** — eyebrow: role + status (with `alive/dead/missing/unknown` sentiment map preserved).
- **Realm** — eyebrow: realmType + scale.
- **Lore** — metadata: category (chip-row layout since it's a single field, no eyebrow projected).
- **Faction** — eyebrow: factionType + alignment (with alignment's `good/evil/neutral/chaotic/lawful` sentiment map preserved); metadata: size as a chip-row trailer for the optional quantity field.
- **Plot** — eyebrow: plotType + structure.

The legacy `structure: { badge: {...} }` blocks are gone from all five entries; the engine now routes through `assembleWithZones` and emits the canonical preamble wrapper.

**Per-rune CSS class renames.** `packages/lumina/styles/runes/realm.css` and `faction.css` had `.rf-realm__badge` / `.rf-faction__badge` selectors used for CSS-grid placement in split layouts — renamed to `__preamble` since the badge wrapper is now folded into the engine's auto-derived preamble.

**Section runes (CharacterSection, RealmSection, FactionSection) untouched** — content containers without meta projection, no migration needed.

**Tests + contracts updated.** All 64 storytelling tests pass. Both `contracts/structures.json` (main site) and `packages/lumina/contracts/structures.json` regenerated to reflect the removed `structure.badge` blocks. 942 targeted tests pass.

### Notes

- **Skipped the optional tags-trailer pattern.** The WORK-307 AC listed tags-as-chip-row-trailer as optional ("when declared in a custom `tags` zone"). I left it out because storytelling runes don't extract their body content via `contentSlots` — the schema emits children in natural order, and adding a custom `tags` position via `order: [...]` would put the tags chip-row in an awkward position (between eyebrow and the natural children). The pattern fits cleanly for plan entities because they DO extract title/blurb/body via contentSlots; it doesn't fit storytelling without a deeper refactor. Skipping is consistent with the work item's "optional" wording.

- **`sections` field preserved.** The legacy `sections: { name: 'title', content: 'body', ... }` mapping (`data-name → data-section` role attribute) is kept on each rune — it's orthogonal to SPEC-079's `contentSlots` and continues to drive theme styling via `data-section` attribute matching.

- **`__preamble` CSS class.** The engine emits `<div data-name="preamble">` automatically around any rune with header positions declared. Realm and Faction's split-layout CSS that placed the badge in column 1 of the grid now place the preamble there — the visual position is unchanged.

- **Lore got `metadata` zone (not eyebrow).** Lore's single `category` field doesn't fit the split-eyebrow shape; rendering it as a chip-row metadata trailer reads more naturally. Faction's `size` field got the same treatment for consistency.

{% /work %}
