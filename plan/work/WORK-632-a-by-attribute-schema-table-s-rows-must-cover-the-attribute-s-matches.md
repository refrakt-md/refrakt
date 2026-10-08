{% work id="WORK-632" status="ready" priority="medium" complexity="simple" source="SPEC-145" tags="seo,schema,validation" milestone="v0.41.0" %}

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

- [ ] A `rows` key that is not among the selecting attribute's `matches` is rejected, naming the table, the key and the declared values
- [ ] A `matches` value with no row is reported, naming the value; whether that is an error or is allowed to fall through to `fallback` is decided and recorded with its reason
- [ ] An attribute without `matches` used as `by` is reported, since its rows cannot be checked
- [ ] Every shipped schema table passes, or each failure is fixed in the same change and listed in the resolution
- [ ] `npm run seo:baseline:check` and `refrakt contracts --check` report no drift on either contract copy, unless a fixed table moves the baseline, in which case the diff is reviewed and explained

{% /work %}
