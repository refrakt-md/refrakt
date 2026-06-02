{% work id="WORK-320" status="ready" priority="medium" complexity="moderate" source="SPEC-080" tags="engine,cleanup,contracts,docs,blocks,layout" milestone="v0.17.0" %}

# Remove legacy placement fields; finalize contract + docs

Once every rune is on blocks/layout (`WORK-319`), remove the superseded
SPEC-079 placement surface from `RuneConfig` + engine and finalize the
contract. Coordinate with `WORK-313` (remove the legacy `slots` /
`structure` shim) so only blocks/layout plus the `projection` /
`postTransform` escape hatches remain.

## Acceptance Criteria

- [ ] **Remove** `zones`, `zoneLayouts`, `contentSlots`, `order`,
  `zoneHost`, `zoneHostPlacement` from `RuneConfig` and the engine
  dispatcher.
- [ ] **Coordinate with `WORK-313`** — `slots` / `structure` removal lands
  together or in sequence.
- [ ] **`split` / `chip-row`** layout aliases removed; only `bar` and
  `definition-list` remain.
- [ ] **Contracts** regenerated.
- [ ] **Docs.** Theme-authoring + plugin-authoring docs rewritten to the
  block / layout / `bar` / `code` vocabulary; zone-era documentation removed.
- [ ] Full build + tests green.

## Approach

Pure deletion + doc rewrite once nothing consumes the legacy fields.
`projection` (hide/group/relocate) is retained as the deep-surgery escape
hatch per {% ref "SPEC-080" /%} — do not remove it.

## Dependencies

- {% ref "WORK-319" /%} — all runes migrated.

## References

- {% ref "SPEC-080" /%} — Resolved decisions (projection stays).
- Coordinate with `WORK-313` (legacy `slots` / `structure` removal).

{% /work %}
