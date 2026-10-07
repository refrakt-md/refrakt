{% work id="WORK-612" status="done" priority="medium" complexity="moderate" source="SPEC-144" milestone="v0.39.0" tags="storytelling,pipeline,registry,declarative" pr="refrakt-md/refrakt#669" %}

# Migrate storytelling's entity and bond registration onto `registers`

The motivating case for {% ref "SPEC-144" /%}. `plugins/storytelling/src/pipeline.ts`
registers `character`, `realm`, `faction`, `lore` and `plot` through a generic walk and
two field-list switch statements (`extractEntityName`, `extractEntityData`), expands
`character` aliases in `aggregate`, and registers `bond` as an edge. All of that becomes
a `registers` block on each rune.

`postProcess` stays exactly as it is. Declaring sentinel resolution is out of scope
for this milestone (see {% ref "WORK-611" /%}).

## The gate (SPEC-144 D4)

The registry must be **byte-identical** before and after: same types, ids, scopes,
`sourceUrl`s, `data` bags, **and registration order**, because order decides
last-write-wins on a site-scoped collision. Capture a snapshot of the registry over
the storytelling fixtures before touching anything, and assert against it.

## Sequencing note

{% ref "WORK-617" /%} removes the transforms of `character`, `realm` and `faction`
in the same plugin. The two are independent, but land them one after the other
rather than on parallel branches.

## Acceptance Criteria

- [x] A registry snapshot over the storytelling fixtures is captured before the migration and asserted after it — types, ids, scopes, `sourceUrl`s, `data` bags and registration order
- [x] `character`, `realm`, `faction`, `lore` and `plot` register through `registers.entity`
- [x] `bond` registers through `registers.edge`, and `bond` edges resolve through `getRelated` identically to today
- [x] `character` alias lookup resolves identically, including "first registration wins" for a duplicate alias
- [x] The plugin's `register` and `aggregate` hooks are deleted, not merely unused, and `extractEntityName` / `extractEntityData` go with them
- [x] The plugin's `postProcess` is untouched

## Blocked by

- {% ref "WORK-611" /%}

## References

- {% ref "SPEC-144" /%} — problem statement, D4
- {% ref "SPEC-147" /%} — the storytelling replacement this feeds

## Resolution

Completed: 2026-10-07

Branch: `claude/v039-registers`
PR: refrakt-md/refrakt#669

### What was done
- Snapshot first (commit `4867d2c`, against unchanged code): `plugins/storytelling/test/registry-snapshot.test.ts` loads `test/fixtures/registry-site` through `loadContent` and records every storytelling registration (type, id, scope, sourceUrl, data with key order, in call order), `getTypes()` order, the `entityByName` index `postProcess` reads, the cross-links `postProcess` produces, the plugin's warnings, and the old bond graph (`bond-relationships.json`). Fixtures cover a duplicate alias, an alias displaced by a later id, a last-write-wins id collision, the `npc` alias tag, a character nested in a realm, an alias-named bond endpoint, a one-way bond and an unknown endpoint.
- `registers` blocks on `character`, `realm`, `faction`, `lore`, `plot` (entity) and `bond` (edge: kind from `bondType`, bidirectional from `bidirectional`), added at the top of each schema options object only.
- `plugins/storytelling/src/pipeline.ts`: `register`, `aggregate`, `extractEntityName`, `extractEntityData`, `walkTags`, `readField`, `findByName`, `readRefText`, `BondRelationship` deleted; `StorytellingAggregatedData` is now `RegistersIndex`. `postProcess` byte-identical (diffed).
- After migration the snapshot file is unchanged and passes. The bond test now asserts `getRelated` returns exactly the recorded edges whose endpoints resolve (by id); it fails on the old code.
- `test/pipeline.test.ts` runs through `composeRegistersHooks`, as the loader does.

### Notes
- "Identically to today" for `getRelated`: before, bonds were never in the relationship graph — the bond graph was the plugin's private `relationships` map, keyed by the raw strings written. They are now relate()d edges keyed by entity id (alias endpoints canonicalised), kind = bond `type` (falls back to `bond`). Edges with an unknown endpoint warn as before and are left out. `relationships` / `orphanedBonds` are gone from the aggregated slot; nothing read them.
- Warnings: the bond warnings are word-for-word identical (`Bond missing from or to attribute`, `Bond references unknown entity "X"`); an entity with an empty name now reads `Character missing name: nothing registered` instead of `Storytelling character missing name/title`.
- WORK-617 (`claude/v039-slot-labelling`) edits the same three tag modules; the `registers` blocks sit at the top of the options object, so the merge should be mechanical.

{% /work %}
