{% work id="WORK-612" status="ready" priority="medium" complexity="moderate" source="SPEC-144" milestone="v0.39.0" tags="storytelling,pipeline,registry,declarative" %}

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

- [ ] A registry snapshot over the storytelling fixtures is captured before the migration and asserted after it — types, ids, scopes, `sourceUrl`s, `data` bags and registration order
- [ ] `character`, `realm`, `faction`, `lore` and `plot` register through `registers.entity`
- [ ] `bond` registers through `registers.edge`, and `bond` edges resolve through `getRelated` identically to today
- [ ] `character` alias lookup resolves identically, including "first registration wins" for a duplicate alias
- [ ] The plugin's `register` and `aggregate` hooks are deleted, not merely unused, and `extractEntityName` / `extractEntityData` go with them
- [ ] The plugin's `postProcess` is untouched

## Blocked by

- {% ref "WORK-611" /%}

## References

- {% ref "SPEC-144" /%} — problem statement, D4
- {% ref "SPEC-147" /%} — the storytelling replacement this feeds

{% /work %}
