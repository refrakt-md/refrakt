{% work id="WORK-671" status="done" priority="medium" complexity="moderate" source="ADR-043" tags="engine, theme, skeleton, lumina, metadata, vocabulary" milestone="v0.46.0" pr="refrakt-md/refrakt#752" %}

# The engine stops adding rf-badge to field values

`CHIP_METATYPES` (`packages/transform/src/engine.ts`) gives `status`, `category` and `tag`
values the `rf-badge` class, so the engine decides that those values look like pills. Under
{% ref "ADR-043" /%} decision 3 the engine emits meaning, not shape: the pill comes from the base
stylesheet, keyed on `data-meta-type`, and a theme restyles it like any other rule.

## Acceptance Criteria

- [x] The engine no longer adds `rf-badge` to field values; `CHIP_METATYPES` is removed
- [x] Skeleton keys pill geometry on `[data-meta-type="status"]`, `"category"` and `"tag"`, and Lumina's skin follows, in the same change, so no value loses its pill
- [x] `{% badge %}` keeps `rf-badge`, and the base rule covers it through its default `data-meta-type="tag"`
- [x] Every page in the gallery renders its chips unchanged, light and dark
- [x] Contracts are regenerated on both copies and the diff reviewed; the CSS coverage test passes
- [x] SPEC-145 D28's open question on which values are chips gets a pointer to ADR-043

## References

- {% ref "ADR-043" /%}: decision 3.
- {% ref "SPEC-145" /%}: D28.

## Resolution

Completed: 2026-11-02

Branch: `claude/milestone-v0-44-0-ism7ni`

### What was done
- `packages/transform/src/engine.ts`: `CHIP_METATYPES`, `fieldRendersAsChip`, `buildChip` and `buildPlainValue` are replaced by `buildValue` (`data-meta-type` plus mapped sentiment, no class). `renderBlockValue` and the definition-list use it, so a `<dd>` always holds the value element. `types.ts` docs updated.
- Skeleton `dimensions/metadata.css`: the pill's `white-space: nowrap` is keyed on `.rf-badge` and `[data-meta-type=status|category|tag]`.
- Lumina:
  - `runes/badge.css`: the pill rule takes the same selector list.
  - `dimensions/metadata.css`: a non-pill def-list value inherits its row's size, and an id/code row sets monospace.
  - `runes/work.css`, `bug.css`: the assignee prefix is retargeted to `dd > [data-meta-type]`, and the complexity dots set in tabular numerals.
- proof-skin `skin.css`: the pill selector list.
- Tests: `engine-blocks.test.ts` is rewritten for classless values, and the composed snapshots (character, lore, realm, faction, section header grammar) are updated.
- Docs: theme-authoring `dimensions.md` and `blocks-and-layout.md`; SPEC-145 D28's open question and attribute table.
- `.changeset/engine-no-rf-badge.md`.

### Visual review
- Every page whose build had an `rf-badge` (36: rune pages, plan, storytelling, theme showcase pages, docs) was full-page screenshotted before and after, light and dark. All 72 are pixel-identical after the def-list size and font follow-ups.

### Notes
- Contracts are unchanged; they do not describe the class.
- No `StructureEntry` in a first-party config has a pill type, so none newly became a pill.

{% /work %}
