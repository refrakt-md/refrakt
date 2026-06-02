{% work id="WORK-314" status="ready" priority="high" complexity="complex" source="SPEC-080" tags="engine,transform,runes,blocks,layout,infrastructure" milestone="v0.17.0" %}

# Engine: block-and-layout projection model

Infrastructure for {% ref "SPEC-080" /%}. Adds `blocks` and `layout` to
`RuneConfig` and the engine projection that composes a rune's transform
tree with projected metadata blocks, placed explicitly into named
containers. Built behind the new fields so the SPEC-079 path
(`zones` / `zoneLayouts` / `contentSlots` / `order` / `zoneHost` /
`zoneHostPlacement`) and the legacy `slots` / `structure` shim keep
working untouched during the migration.

## Acceptance Criteria

- [ ] **`RuneConfig` gains `blocks`** — named metadata blocks, each a flat
  `fields` list + `layout` primitive (+ `bar` `wrap`). Theme-overridable
  via the existing merge chain.
- [ ] **`RuneConfig` gains `layout`** — ordered child block names per
  container (`Record<containerName, string[]>`).
- [ ] **Engine projection.** Build projected blocks from `blocks`; compose
  the final tree per `layout` with the resolved semantics: explicit
  placement only (no canonical default); projected blocks appear only
  where named; transform-built blocks the theme didn't name append in
  transform order (never dropped); omitting `layout` renders the transform
  tree verbatim with no projection.
- [ ] **Legacy paths intact.** A rune opts in by declaring `blocks`/`layout`
  and *not* `zones`; the SPEC-079 and `slots`/`structure` paths are
  unchanged and their tests still pass.
- [ ] **Contracts.** Block names surface in `contracts/structures.json` as
  the stable addressing API.
- [ ] **Tests.** Extend `packages/transform/test/engine-zones.test.ts`
  (or a new `engine-blocks.test.ts`) covering placement, append-unlisted,
  omit-layout, and the media-overlay case.

## Approach

Build the projection alongside the SPEC-079 dispatcher rather than
replacing it. The two models coexist until every rune migrates; removal of
the legacy placement surface is a later cleanup (`WORK-320`). Field-shape
and the `bar` layout primitive land in `WORK-315`.

## Dependencies

- {% ref "WORK-305" /%} — SPEC-079 engine + layout primitives (done).

## References

- {% ref "SPEC-080" /%} — the spec being implemented.
- {% ref "SPEC-079" /%} — the model this refines.

{% /work %}
