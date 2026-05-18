{% work id="WORK-199" status="ready" priority="low" complexity="small" tags="tint, docs, migration" source="SPEC-053" milestone="v0.14.0" %}

# Document the tint migration recipe

Write the v1.0 migration guide entry for SPEC-053's tint field renames. Per the SPEC-053 decision, this is a documented regex/`sed` recipe in the migration guide — *not* a `refrakt migrate tints` CLI command. The in-the-wild surface is small enough (lumina + plugins; no end-user tint configs in practice) that a permanent CLI command isn't worth the surface area.

## Acceptance Criteria

- [ ] A "Tint shape changes" section exists in the v1.0 migration guide (location: wherever the migration guide lives — `site/content/docs/migration/` or `MIGRATION.md` at the repo root; check during implementation)
- [ ] The section documents the five field renames (`background → bg`, `primary → text`, `secondary → muted`, `accent → primary`, plus `mode → lockMode` with the semantics change from three-value to present-or-absent)
- [ ] At least one before/after example showing a real tint migration (use Lumina's `warm` tint as the canonical example)
- [ ] A copy-pasteable `sed` (or equivalent regex) snippet that handles the renames for users who have written their own tint configs
- [ ] The section explicitly notes that the user-facing `tint=""` rune attribute and `data-tint` HTML attribute are *unchanged* — only the *authoring* surface for new tint definitions moves
- [ ] A note that the deprecated top-level `tints` field in `refrakt.config.json` is removed; users on the flat-shape config need to migrate to `sites.<name>.tints`

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
