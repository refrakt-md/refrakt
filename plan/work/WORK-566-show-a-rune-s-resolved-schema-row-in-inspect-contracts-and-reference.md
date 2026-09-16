{% work id="WORK-566" status="done" priority="high" complexity="moderate" source="SPEC-130" tags="cli,tooling,schema-org,contracts" milestone="v0.35.0" %}

# Show a rune's resolved schema row in inspect, contracts and reference

Make the table reviewable. `refrakt inspect` shows a rune's resolved schema row,
`refrakt contracts` describes the structured data it currently omits, and
`refrakt reference` documents it.

## Why this lands before the migrations, not with them

{% ref "SPEC-130" /%} puts tooling on items 4–7, riding each migration. **That is
one step too late**, and D5 is why.

D5 dispenses with a validation mechanism on the grounds that a rune only ever
emits a type it has a row for. But it says plainly that "no mechanism" is not
"no risk": nothing checks a table against schema.org, because refrakt ships no
ontology. What replaces validation is *visibility* — "a wrong row is
reviewable".

If the review surface arrives with the last migration, then Groups A, B and C
were curated with no review surface at all. Thirty hand-written tables asserting
schema.org types on users' pages, reviewed by reading transforms — which is the
condition this milestone exists to end.

D2 is the proof it is not hypothetical. `organization` carries a curated
six-value enum, enforced by Markdoc, containing `NonProfit` — a type schema.org
does not have. The enum validates against itself, so nothing noticed. That is
first-party code that had been reviewed.

## Acceptance Criteria

- [x] `refrakt inspect <rune>` shows the resolved schema row — type, property mapping, nested entities, child mappings — the way it already shows BEM classes and data attributes
- [x] `--json` carries the same, so it is machine-readable
- [x] `inspect --audit` reports a table naming a source the rune does not emit, alongside the CSS coverage it already audits
- [x] The audit covers plugin runes, not just core (D7)
- [x] `refrakt contracts` describes each rune's schema.org output, closing the gap between what `contracts` claims to cover and what it does
- [x] `contracts --check` catches config-to-contract drift on the schema channel, as it does for structure
- [x] `refrakt reference` documents a rune's structured data, and can order the resolved table by schema property regardless of authoring order — the review view need not match the authoring view
- [x] `defineRune({ schemaOrgType })` is deleted or fed from the table, so the type is declared once
- [x] Documentation says explicitly that these views are the review mechanism, and that no validation against schema.org exists (D5)

## Approach

**`inspect` matters most.** It is the per-rune tool an author actually reaches
for, and every claim in {% ref "SPEC-130" /%} was verified with it. Today it
shows RDFa only incidentally, as raw HTML in the rendered output.

**Delete `Rune.schemaOrgType` rather than leaving it.** It is assigned in
`packages/runes/src/rune.ts:59` and consumed by nothing — not `reference`, not
`contracts`, not the language server. It has already drifted: nine catalog
entries against thirty emitting runes, and `Accordion: 'FAQPage'` stopped being
unconditional when {% ref "WORK-552" /%} shipped. Leaving it in place means the
second stale declaration outlives the first, which is how this milestone's
problems started.

The audit is the piece with teeth. A table naming a `data-name` the rune does not
emit is the failure mode {% ref "WORK-561" /%} exists to prevent and that every
later migration can reintroduce — and unlike a wrong schema.org type, it is
mechanically checkable. Ship it here, so Groups A–C land against it.

## Blocked by

- {% ref "WORK-565" /%}

## Blocks

- {% ref "WORK-567" /%}
- {% ref "WORK-568" /%}
- {% ref "WORK-569" /%}

## References

- {% ref "SPEC-130" /%} — "What it unlocks", D2, D5, D7
- {% ref "WORK-552" /%} — why `Accordion: 'FAQPage'` is already stale
- `packages/runes/src/rune.ts:59` — the write-only `schemaOrgType`
- `packages/cli/src/commands/` — `inspect`, `contracts`, `reference`

## Resolution

Completed: 2026-09-16

Branch: `claude/v0.35-parallel-feasibility-eia5le`

### What was done

- `packages/runes/src/schema-row.ts` — `describeSchemaRow`, `bySchemaProperty`,
  `collectSchemaRows`, `tableFor`. Lives beside the tables because three
  consumers need the same answer.
- `packages/runes/src/lib/index.ts` — `schemaTables`, a `WeakMap` keyed on the
  Markdoc schema, alongside `schemaContentModels` and `schemaRuneStructures`.
- `packages/cli/src/lib/schema-row.ts` — `auditSchemaSources`, the half that
  needs a rendered tree.
- `packages/cli/src/commands/inspect.ts` — a `Structured Data` section, text and
  `--json`.
- `packages/transform/src/contracts.ts` — `schemaOrg` on `RuneContract`, and
  `generateStructureContract(config, { schemaRows })`.
- `packages/runes/src/reference.ts` — `schemaOrg`, ordered by schema.org
  property rather than authoring order.
- `packages/runes/src/rune.ts` + `index.ts` — `defineRune({ schemaOrgType })`
  deleted, with its nine stale catalog entries.
- `packages/cli/test/schema-row.test.ts` — 11 tests.
- `CLAUDE.md` — the review mechanism, and D5 stated plainly.

### The gap this closes

`schemaTables` is the point. Config-derived tooling could not see anything a
rune declares in its `transform()` — the same gap that let four dead CSS rules
survive years of review (WORK-564), that kept `.rf-lore__title` out of the CSS
coverage set, and that made regenerating the structure contract show none of
WORK-561's new `data-name`s. Recording the table where tooling can reach it is
what makes D5's "visibility replaces validation" possible at all.

### Three bugs, each of which would have defeated the item

- **The contracts join silently covered no plugin rune.** My first version keyed
  on `rune.typeName ?? rune.name`; `loadPlugin` never sets `typeName`, and the
  contract is keyed PascalCase, so the lowercase fallback matched nothing. It
  reported **0 runes with a schema row** while both tables were correctly
  recorded — skipping exactly the 67-of-95 population D7 is about. Now joined on
  `dataRune`, the rune's own name on both sides.
- **The audit's first version was a false positive.** It flagged
  `testimonial`'s `ratingValue <- rating` as not emitted, when `rating` is a
  declared attribute the canonical fixture simply does not set. Calling a correct
  table broken because the input was minimal is worse than not checking. A source
  now resolves against an emitted node, a field-bag entry **or** a declared
  attribute, which leaves the failure actually worth catching: a typo'd or
  renamed source that resolves to nothing ever. Verified both directions by
  renaming `headline` to `headlinee` in `event`'s table and watching it fire.
- **Enriching the contract after generation forked the implementation.**
  `packages/lumina/test/contracts.test.ts` regenerates and compares byte-for-byte,
  and it was right to fail: the CLI's output and the test's regeneration came
  from different paths. The rows now go *into* `generateStructureContract`, so
  the artifact and its guard are one call with one input. That is also what
  forced the describing half out of the CLI and into `runes`, where it belonged.

### Notes

- The contract is committed in **two** places that must stay in lock-step —
  `contracts/structures.json` and `packages/lumina/contracts/structures.json`.
  Both regenerated; a test guards both.
- `schemaOrg` is declared on `RuneContract` rather than cast in: it is genuinely
  part of the contract's shape now. Typed loosely on purpose — the row's shape is
  owned by `@refrakt-md/runes`, and restating it in `transform` would be a second
  definition to drift.
- The rows are passed *into* the generator rather than read there, because
  `runes` depends on `transform` and reaching the tables would invert that.
- Deleting `defineRune({ schemaOrgType })` broke no build, confirming the item's
  claim that it was write-only — nine entries against thirty emitting runes.

### Verification

`npm test` — 370 files, 4538 tests, all passing. `npm run format:check` clean
(run on its own, exit code read directly). `npm run seo:baseline:check`
byte-identical — this item changes no emission.

{% /work %}
