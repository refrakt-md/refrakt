{% work id="WORK-568" status="ready" priority="medium" complexity="moderate" source="SPEC-130" tags="runes,schema-org,seo,plugins" milestone="v0.35.0" %}

# Group B — fourteen flat mappings, and the type that does not exist

`figure`, `embed`, `cast-member`, `character`, `realm`, `faction`, `plot`,
`lore`, `organization`, `pricing`, `tier`, `timeline-entry`, `track` and
`breadcrumb-item` convert to declarative tables. These are the clean case: the
transform already computes the values, and the table only names their schema
roles.

Mechanical, with one exception that is not.

## The exception: `organization`

```ts
const orgType = ['Organization', 'LocalBusiness', 'Corporation',
                 'EducationalOrganization', 'GovernmentOrganization', 'NonProfit'] as const;
```

A curated six-value enum, enforced by Markdoc — so `organization` is *already*
doing what this milestone proposes, deriving a schema.org type from a content
attribute, just written imperatively. It converts to a `by: 'type'` table
directly, and its rows are the simplest kind: a type and nothing else, since all
six share `Organization`'s properties.

**And the list contains a type that does not exist.** schema.org has `NGO`;
there is no `NonProfit`. The enum validates against itself, so `matches` is
satisfied and nothing notices the value is not in the vocabulary it claims to
speak. Any site using `type="NonProfit"` is publishing a `@type` no consumer
resolves.

Correcting it belongs with this conversion. It is also the argument for the
whole milestone in miniature — the mapping was already a curated table, it was
already wrong, and it was wrong somewhere no tool could look.

## Acceptance Criteria

- [ ] All fourteen runes declare their schema as a table and stop passing `schemaOrgType` and `schema:` to `createComponentRenderable`
- [ ] Each reproduces its baseline JSON-LD exactly, except where a change is deliberate and named
- [ ] `organization` becomes a `by: 'type'` table over its six rows, replacing the imperative derivation
- [ ] `NonProfit` is corrected to `NGO`, with a note in the changeset that sites using the old value are affected
- [ ] The corrected enum value is reflected in the rune's `matches` list and its documentation, not only in the schema table
- [ ] `embed` and `tier`'s sources resolve through the names {% ref "WORK-561" /%} gave them, with no rune re-declaring `schema:` to keep a meta alive
- [ ] `figure`, `realm` and `faction`'s image nodes resolve by name rather than by position
- [ ] D6 lands visibly here: any of these runes emitting a single-item list changes shape from scalar to array, reviewed as a diff
- [ ] Plugin runes in this group (`cast-member`, `character`, `realm`, `faction`, `plot`, `lore`, `organization`, `pricing`, `tier`, `timeline-entry`, `track`) go through the same public contract as core runes (D7)

## Approach

Batch by package rather than all at once, regenerating
`contracts/structures.json` per batch. The runes are independent and the review
is easier in five small diffs than one large one.

**`tier` and `pricing` are the pair to do carefully.** `tier`'s
`parsedPriceMeta` and `resolvedCurrencyMeta` survive today *because* the rune
declares them in `schema:` — that is the `isSeoMeta` check in
`createComponentRenderable`. Once the rune stops declaring `schema:`, the check
no longer protects them and they are dropped as pure data. The applier then
rebuilds them from the bag, which only works because {% ref "WORK-561" /%} put
them there. If `tier` migrates before that lands, its price silently disappears
from the structured data and the HTML looks identical.

`.rf-tier h1[property="name"]` and `.rf-plot > span[property="name"]` are live
CSS rules keyed on this channel — {% ref "WORK-564" /%} moves them, and this
item must not land before it or renaming a property unstyles a rune.

`breadcrumb-item` sits in this group but its parent does not: `breadcrumb`
builds positions from a loop index and is {% ref "WORK-571" /%}'s. Keep the two
in step, since the parent's property and the child's type are one declaration
(a child entity is never declared without the property that holds it).

## Blocked by

- {% ref "WORK-561" /%}
- {% ref "WORK-565" /%}
- {% ref "WORK-566" /%}

## References

- {% ref "SPEC-130" /%} — "Group B", D2, D6, D7
- {% ref "WORK-561" /%} — the names `embed`, `tier` and the image nodes depend on
- {% ref "WORK-564" /%} — the CSS that must move first
- `plugins/business/src/tags/organization.ts` — the six-value enum and `NonProfit`

{% /work %}
