{% work id="WORK-568" status="done" priority="medium" complexity="moderate" source="SPEC-130" tags="runes,schema-org,seo,plugins" milestone="v0.35.0" %}

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

- [x] All fourteen runes declare their schema as a table and stop passing `schemaOrgType` and `schema:` to `createComponentRenderable`
- [x] Each reproduces its baseline JSON-LD exactly, except where a change is deliberate and named
- [x] `organization` becomes a `by: 'type'` table over its six rows, replacing the imperative derivation
- [x] `NonProfit` is corrected to `NGO`, with a note in the changeset that sites using the old value are affected
- [x] The corrected enum value is reflected in the rune's `matches` list and its documentation, not only in the schema table
- [x] `embed` and `tier`'s sources resolve through the names {% ref "WORK-561" /%} gave them, with no rune re-declaring `schema:` to keep a meta alive
- [x] `figure`, `realm` and `faction`'s image nodes resolve by name rather than by position
- [x] D6 lands visibly here: any of these runes emitting a single-item list changes shape from scalar to array, reviewed as a diff
- [x] Plugin runes in this group (`cast-member`, `character`, `realm`, `faction`, `plot`, `lore`, `organization`, `pricing`, `tier`, `timeline-entry`, `track`) go through the same public contract as core runes (D7)

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

## Resolution

Completed: 2026-09-16

Branch: `claude/v0.35-parallel-feasibility-eia5le`

### What was done

Thirteen of the fourteen converted here; `breadcrumb-item` landed one commit
later with its parent, in WORK-571, because a child entity is never declared
without the property that holds it and its position needs the parent's index.

**Core** — `figure` (`image → contentUrl`, `caption → caption`, both refs
stamped in place) and `embed` (`title → name`, `url → contentUrl`,
`embedUrl → embedUrl`, all three rebuilt from the field bag: they are
`properties` metas, so they lose the `isSeoMeta` protection and are dropped as
pure data once `schema:` goes).

**business** — `cast-member` (its portrait gained a `portrait` name; the schema
had been reaching it through a local variable), `organization`, `timeline-entry`.

**storytelling** — `character`, `realm`, `faction`, `plot`, `lore`. `realm` and
`faction` resolve `image` through WORK-561's `sceneImage` rather than positionally.

**marketing** — `pricing` and `tier`, the pair the work item flagged. `tier`'s
`parsedPrice` and `resolvedCurrency` survived only because the rune declared
them in `schema:`; with that gone the applier rebuilds them from the bag, which
works only because WORK-561 put them there. `pricing` retypes the tiers from its
own `children` row (D9) and declares `offers` a list (D6).

**media** — `track`, flat mapping only; `MusicRecording` stays wrong for
`type="episode"` (BUG-013), which is WORK-569's, so that fix shows as its own
one-line baseline diff.

**`NonProfit` → `NGO`** in the enum, the table, `site/content/_data/rune-attributes.json`
(regenerated) and the `organization.nonprofit` fixture. `organization` becomes a
`by: 'type'` table whose rows are keyed off the same list that feeds `matches`.

`lists?: string[]` became `readonly string[]` so a table written as a single
`as const` literal — the way every other one is written — type-checks.

### Notes

- **Baseline diff is exactly three things**: `NonProfit → NGO`, `pricing`'s
  `offers` becoming an array, and `embed`'s rebuilt RDFa carriers moving to the
  end of the markup. The other eleven runes reproduce byte-for-byte, which is
  the evidence the applier is faithful.
- `timeline-entry` maps `date → description`. That is a stretch — `ListItem` has
  no date property — but it is what shipped, and changing the claim was not this
  item's job.
- The corrected enum fails loudly: `type="NonProfit"` no longer passes Markdoc
  validation rather than silently publishing an unresolvable type.

{% /work %}
