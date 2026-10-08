{% work id="WORK-632" status="done" priority="medium" complexity="simple" source="SPEC-145" tags="seo,schema,validation" milestone="v0.41.0" pr="refrakt-md/refrakt#689" %}

# A by-attribute schema table's rows must cover the attribute's matches

{% ref "SPEC-145" /%} D27 (c). `validateSchemaTable` (`packages/runes/src/lib/schema-table.ts`)
checks two things: that `by` names a declared attribute, and that a `fallback` exists. It never
compares `rows` keys with that attribute's `matches`. So a misspelt row (`podcasts:`) or a newly
added enum value silently selects the fallback, and `{% playlist type="podcast" %}` would publish
`MusicAlbum`.

D15 already requires an exact two-way correspondence for template variants. The schema `by` gets
the same check. It needs no composition, and it applies to every hand-written table today
(`playlist`, `track`, `organization` and others).

## Acceptance Criteria

- [x] A `rows` key that is not among the selecting attribute's `matches` is rejected, naming the table, the key and the declared values
- [x] A `matches` value with no row is reported, naming the value; whether that is an error or is allowed to fall through to `fallback` is decided and recorded with its reason
- [x] An attribute without `matches` used as `by` is reported, since its rows cannot be checked
- [x] Every shipped schema table passes, or each failure is fixed in the same change and listed in the resolution
- [x] `npm run seo:baseline:check` and `refrakt contracts --check` report no drift on either contract copy, unless a fixed table moves the baseline, in which case the diff is reviewed and explained

## Resolution

Completed: 2026-10-08

Branch: `claude/v041-schema-rows-coverage`
PR: refrakt-md/refrakt#689

### What was done
- `packages/runes/src/lib/schema-table.ts`: `validateSchemaTable` now accepts the attribute definitions as well as names. When it has definitions, `checkRowCoverage` compares a `by` table's `rows` with the attribute's `matches`, both ways. It rejects a row key the attribute doesn't accept, naming the key and the declared values. It rejects a declared value with no row, naming the value. It rejects a `by` attribute with no `matches` list.
- `packages/runes/src/lib/index.ts`: `createContentModelSchema` passes the full attribute definitions. The construction error now names the selecting attribute (`Invalid schema table (by: 'type')`). Composed runes keep their `Rune "<name>":` prefix.
- `packages/runes/test/schema-table.test.ts`: covers each rejection and the construction error.
- `packages/lumina/test/schema-table-coverage.test.ts`: a new sweep that runs the full check on every shipped table (core, the nine plugins, and composed definitions via `pluginRuneSchema`). It also asserts that exactly the three expected `by` tables were reached.
- `site/content/extend/plugin-authoring/authoring.md`: documents the new rule.
- Changeset: `@refrakt-md/runes` minor.

### Notes
- Decision: a declared value with no row is an **error**, not a fall-through to `fallback`. `fallback` covers an author who stated no value. A value the rune declares needs its own row from the table, or a newly added enum value would silently take the fallback's type, which is the failure this item exists to catch. A value that should share the fallback's type gets a one-line row of its own, so the choice is visible in `inspect`.
- Shipped tables: all 25 pass. The three `by` tables (`playlist`, `track`, `organization`) already matched their `matches` exactly, so nothing needed fixing. The SEO baseline and both contract copies are unchanged.

{% /work %}
