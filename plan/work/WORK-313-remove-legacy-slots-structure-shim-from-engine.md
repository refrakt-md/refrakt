{% work id="WORK-313" status="done" priority="low" complexity="simple" source="SPEC-079" tags="engine,cleanup,shim-removal,phase-3,breaking-change" milestone="v0.18.0" %}

# Remove legacy slots + structure shim from engine

Phase 3 of {% ref "SPEC-079" /%}. Removes the backwards-compat path
in `packages/transform/src/engine.ts` that lets legacy
`slots: [...]` + `structure: {...}` configs continue to render.
Lands once all first-party plugins have migrated (WORK-306 through
WORK-312 done) and the deprecation warning has been visible across
at least one minor release.

## Acceptance Criteria

- [x] **All first-party plugins migrated.** Verify no plugin config
  declares the legacy `slots: [...]` array — `git grep "slots: \["`
  in `plugins/` and `packages/runes/src/config.ts` returns no
  matches.

- [x] **Legacy shim code removed from `packages/transform/src/engine.ts`.**
  Delete the `else if (config.slots && config.structure)` branch in
  `transformRune`, the `hasLegacySlotNames` helper, the
  `warnLegacySlots` helper, the `LEGACY_SLOT_WARNED` set, and the
  `LEGACY_SLOT_NAMES` constant.

- [x] **Engine's structural-assembly path simplified.** The legacy
  before/after assembly (`else if (config.structure)` branch) stays
  — it's used by non-meta-projecting runes that just inject icons or
  badges. Only the slot-based assembly tied to the legacy slot-name
  vocabulary is removed.

- [x] **`RuneConfig.slots` field removed from types.** With no
  remaining consumers, the type-level field comes out of
  `packages/transform/src/types.ts`. Comment updates in adjacent
  fields removed.

- [x] **Universal `.rf-badge` class on legacy meta-typed structure
  entries removed.** The shim path that added `class="rf-badge"` to
  every meta-typed `StructureEntry` (added in WORK-305) is no longer
  needed — runes that emit meta-typed structure entries directly are
  responsible for picking their own class. Most won't need it
  because all meta-projection went through `metaFields`.

- [x] **Tests.** Engine tests touching the legacy shim path
  (`packages/transform/test/slots.test.ts` etc.) updated or removed.
  CSS coverage tests in Lumina pass against the simplified surface.

- [x] **Changeset.** Marked as a minor version bump — the API change
  (removing `RuneConfig.slots`) is breaking for any third-party
  plugin that hasn't migrated. Changeset notes call this out and
  link to the SPEC-079 migration guide.

- [x] **Docs.** Theme-authoring docs that still describe the legacy
  `slots + structure` pattern updated. The `dimensions.md` "legacy
  StructureEntry fields" subsection trimmed or removed.

## Approach

Pure cleanup work — wait until all first-party plugins are on the
new path (WORK-307 through WORK-312 done), let one minor release ship
with the deprecation warning visible to third-party plugin authors,
then strip the shim.

The strip itself is mechanical: delete the slot-based assembly
branch + helpers, drop `RuneConfig.slots` from the types, delete the
legacy `data-section` / `class="rf-badge"` injections that exist
only for the shim path.

Version bump: minor (breaking for any third-party plugin still on the
legacy path; first-party plugins all migrated).

## Dependencies

- {% ref "WORK-306" /%} — plan plugin migration (done).
- {% ref "WORK-307" /%} — storytelling migration.
- {% ref "WORK-308" /%} — learning migration.
- {% ref "WORK-309" /%} — docs migration.
- {% ref "WORK-310" /%} — places migration.
- {% ref "WORK-311" /%} — media migration.
- {% ref "WORK-312" /%} — core Budget migration.

## References

- {% ref "SPEC-079" /%} — the spec being implemented.

## Resolution

Completed: 2026-06-03

Branch: `claude/rune-contract-hardening`

### What was done
- `packages/transform/src/engine.ts` — removed the `else if (config.slots && config.structure)` assembly branch, the `assembleWithSlots()` function, and the `LEGACY_SLOT_WARNED` / `LEGACY_SLOT_NAMES` / `hasLegacySlotNames()` / `warnLegacySlots()` migration-warning machinery. Dropped the now-unused `runeName` param on `transformRune` (and its call-site arg). The `structure`-only before/after branch survives unchanged.
- Removed the automatic universal `.rf-badge` class on meta-typed `StructureEntry` children (was added in WORK-305 for the shim); `data-meta-type`/`data-meta-sentiment` still emitted.
- `packages/transform/src/types.ts` — removed `RuneConfig.slots`, `StructureEntry.slot`, and `StructureEntry.order` (the latter two were only meaningful under slot assembly).
- `packages/transform/src/contracts.ts` — removed the slot-based `computeChildOrder` branch, the `contract.slots` emission + field, and the `isSlotTarget` carve-out in `projection.relocate` validation.
- `packages/cli/src/lib/format.ts` — dropped the `slots:` inspect line, the `slot:` structure annotation, and the `slots` JSON passthrough.
- Tests: deleted `packages/transform/test/slots.test.ts`; added `packages/transform/test/structure.test.ts` (covers the surviving before/after path + asserts no auto `.rf-badge`); trimmed the `contracts: slots` block and the relocate-into-slot test from `contracts.test.ts`.
- Docs: corrected `dimensions.md` (legacy `StructureEntry` subsection + removal callout) and `config-api.md` (dropped the `### slots` section and `StructureEntry.slot`/`order` fields).
- Added changeset `remove-slots-structure-shim.md` (minor bump, breaking-change + migration notes).
- Regenerated both `contracts/structures.json` files — byte-identical (no first-party rune used slots).

### Notes
- Full suite green (3067 tests). AC1 verified: `git grep "slots: ["` returns no matches in `plugins/` or `packages/runes/src/config.ts`.
- This is the headline breaking change for v0.18.0 — bundled with the SPEC-081/082 contract hardening so third-party themes adopt against the final shape once.

{% /work %}
