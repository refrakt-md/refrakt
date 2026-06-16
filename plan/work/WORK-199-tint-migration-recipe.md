{% work id="WORK-199" status="done" priority="low" complexity="simple" tags="tint, docs, migration" source="SPEC-053" milestone="v0.14.0" %}

# Document the tint migration recipe

Write the v1.0 migration guide entry for SPEC-053's tint field renames. Per the SPEC-053 decision, this is a documented regex/`sed` recipe in the migration guide — *not* a `refrakt migrate tints` CLI command. The in-the-wild surface is small enough (lumina + plugins; no end-user tint configs in practice) that a permanent CLI command isn't worth the surface area.

## Acceptance Criteria

- [x] A "Tint shape changes" section exists at `site/content/docs/migration/v0.14.0.md` — the v0.14.0 migration guide that {% ref "WORK-210" /%} will also extend with palette and font notes
- [x] The section documents the five field renames (`background → bg`, `primary → text`, `secondary → muted`, `accent → primary`, plus `mode → lockMode` with the semantics change from three-value to present-or-absent) — both as a table and as before/after code samples
- [x] At least one before/after example showing a real tint migration — uses Lumina's `warm` tint as the canonical case, plus the `mode: 'dark'` lockMode example
- [x] A copy-pasteable `sed` recipe handles the renames, with an explicit note that `primary → text` must run before `accent → primary` to avoid overwriting the new `primary` field
- [x] The section explicitly notes that the `tint=""` rune attribute, `data-tint` HTML attribute, and `tint-mode` rune attribute all continue to work — only the authoring shape for new tint definitions has moved
- [x] A note that the deprecated top-level `tints` field in `refrakt.config.json` is removed; users on the flat-shape config need to migrate to `site.tints` (singular) or `sites.<name>.tints` (multi-site)
- [x] An `extends` section showing the new variant-derivation mechanism (the canonical override path per SPEC-053's "one preset" → "scoped overlay" design principle)
- [x] A small Shiki rename note for any custom CSS that still reads `--shiki-*` directly (cross-references Chunk 1's SPEC-048 rename)

## Approach

Single docs PR. The migration content already exists in prose form in SPEC-053; this work item adapts that into a user-facing migration guide entry.

The `sed` snippet only needs to handle the field renames inside `tints: { … }` blocks. Suggest a one-liner per rename rather than a complex multi-substitution — easier to read, easier to verify.

If the project doesn't have a v1.0 migration guide yet, create one as part of this work — but in that case, consider whether the broader migration guide structure is in scope (probably not; this work item only owns the tint section). Coordinate with {% ref "WORK-210" /%} which writes the SPEC-051 migration note — likely they share the same destination page.

## Dependencies

- {% ref "WORK-195" /%}, {% ref "WORK-196" /%}, {% ref "WORK-197" /%}, {% ref "WORK-198" /%} — the actual rename must be implemented and shipping before the migration guide describes it.

## References

- {% ref "SPEC-053" /%} — the rename table and before/after examples
- {% ref "WORK-210" /%} — sibling migration note for SPEC-051 (font + palette changes)

{% /work %}
