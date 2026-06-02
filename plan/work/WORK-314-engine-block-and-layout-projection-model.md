{% work id="WORK-314" status="done" priority="high" complexity="complex" source="SPEC-080" tags="engine,transform,runes,blocks,layout,infrastructure" milestone="v0.17.0" %}

# Engine: block-and-layout projection model

Infrastructure for {% ref "SPEC-080" /%}. Adds `blocks` and `layout` to
`RuneConfig` and the engine projection that composes a rune's transform
tree with projected metadata blocks, placed explicitly into named
containers. Built behind the new fields so the SPEC-079 path
(`zones` / `zoneLayouts` / `contentSlots` / `order` / `zoneHost` /
`zoneHostPlacement`) and the legacy `slots` / `structure` shim keep
working untouched during the migration.

## Acceptance Criteria

- [x] **`RuneConfig` gains `blocks`** — named metadata blocks, each a flat
  `fields` list + `layout` primitive (+ `bar` `wrap`). Theme-overridable
  via the existing merge chain.
- [x] **`RuneConfig` gains `layout`** — ordered child block names per
  container (`Record<containerName, string[]>`). A key is either a
  container's `data-name` or the reserved `root` key, which addresses the
  rune's own top-level children so **flat runes** (no content/media
  wrapper) can place projected blocks. `data-name="root"` is disallowed.
- [x] **Engine projection.** Build projected blocks from `blocks`; compose
  the final tree per `layout` with the resolved semantics: explicit
  placement only (no canonical default); projected blocks appear only
  where named; transform-built blocks the theme didn't name append in
  transform order (never dropped); omitting `layout` renders the transform
  tree verbatim with no projection.
- [x] **Legacy paths intact.** A rune opts in by declaring `blocks`/`layout`
  and *not* `zones`; the SPEC-079 and `slots`/`structure` paths are
  unchanged and their tests still pass.
- [ ] **Contracts.** Block names surface in `contracts/structures.json` as
  the stable addressing API.
- [x] **Tests.** Extend `packages/transform/test/engine-zones.test.ts`
  (or a new `engine-blocks.test.ts`) covering container placement, the
  `root` (flat-rune) case, append-unlisted, omit-layout, and media-overlay.

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

## Resolution

Completed: 2026-06-02

Branch: `claude/spec-079-implementation`

### What was done
- Added `blocks` (`Record<string, BlockDef>`) and `layout` (`Record<string, string[]>`) to `RuneConfig`.
- Engine: `assembleWithBlocks` + `composeContainer` + `updateContainerByName`. Dispatch order in step 5 is now blocks/layout → SPEC-079 zones → legacy slots/structure, so a rune opts in by declaring `blocks`/`layout`; all legacy paths are untouched and their tests pass.
- Placement semantics: explicit only (no canonical default); projected blocks appear only where named; transform children the list didn't name append in transform order (never dropped); omitting `layout` renders the transform tree verbatim. The reserved `root` key targets the rune's own top-level children (flat runes); other keys address a container by `data-name`.
- Tests: `packages/transform/test/engine-blocks.test.ts` (10) — intrinsic shape, align, conditional fields, flat-root placement, append-unlisted, omit-verbatim, nested-container, media-overlay, def-list block.

### Notes
- One acceptance criterion deferred: "block names surfaced in the generated structure contracts." The contract generator doesn't model projected zones/blocks today, and there is no consuming rune yet — this lands with the first migration (WORK-318, api), where it becomes testable.

{% /work %}
