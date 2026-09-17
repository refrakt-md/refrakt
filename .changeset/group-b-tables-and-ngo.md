---
"@refrakt-md/business": minor
"@refrakt-md/marketing": minor
"@refrakt-md/storytelling": minor
"@refrakt-md/media": minor
"@refrakt-md/runes": minor
---

Thirteen flat schema tables, and `NonProfit` becomes `NGO` (WORK-568, SPEC-130)

`figure`, `embed`, `cast-member`, `character`, `realm`, `faction`, `plot`,
`lore`, `organization`, `pricing`, `tier`, `timeline-entry` and `track` now
declare their schema.org mapping as a table instead of building it inside their
transform. Each reproduces its previous JSON-LD exactly, except where a change
is named below. (`breadcrumb-item` is the fourteenth of the group and moves with
its parent, since the property that holds a child and the child's type are one
declaration.)

**`organization type="NonProfit"` is now `type="NGO"`.** schema.org has `NGO`
and has never had `NonProfit`. The rune's curated six-value enum validated
against itself, so `matches` was satisfied and nothing noticed the value was not
in the vocabulary it claimed to speak — every site writing `NonProfit` published
a `@type` no consumer resolves. The enum, the schema table and the generated
attribute reference all say `NGO` now.

**This is breaking for content.** `{% organization type="NonProfit" %}` no
longer passes validation; change it to `type="NGO"`. Failing loudly is the
point — the old value silently published an unresolvable type.

`organization` also becomes a `by: 'type'` table over its six rows, which is
what its `typeof: attrs.type` was already doing, now written where a reviewer
can read it and keyed off the same list that feeds `matches`, so the accepted
values and the published types cannot drift apart.

**`pricing` declares `offers` a list.** A single-tier pricing block serialises
`"offers": [{…}]` instead of the bare object it used to emit, so the shape no
longer varies with how much content an author wrote.

Two smaller shape notes: `embed`'s three RDFa carriers are rebuilt from the
field bag and therefore appended last, so their order in the markup changes
(the JSON-LD is identical); and `cast-member`'s portrait image gains a
`portrait` name, and with it an `rf-cast-member__portrait` class, so the schema
reaches it by name rather than through a local variable.
