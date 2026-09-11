{% work id="WORK-552" status="ready" priority="medium" complexity="moderate" tags="runes,seo,schema-org" %}

# Make a rune's schema.org emission optional

`{% accordion %}` always emits `typeof="FAQPage"`, with each item a `Question`
and its body an `Answer`. That is right for a FAQ and wrong for every other use
of a disclosure list — and there is currently no way to say so.

## Why this surfaced

{% ref "WORK-548" /%} renders each rune's universal axes as accordion items. An
axis is not a frequently asked question. Across 88 rune pages that is roughly
**970 fabricated `Question` entries** in the site's own structured data —
plausible-looking markup asserting something untrue, which is the shape of thing
search engines penalise.

The first fix was to swap in `{% details %}`, which emits no schema. That was
rejected on presentation grounds: an accordion is the right *component* for this,
and the structured data is the part that should bend.

## Proposal

An attribute that suppresses (or overrides) the schema.org vocabulary a rune
emits, without touching its markup or styling.

```markdoc
{% accordion schema=false %}
```

Shape to settle during design:

- **`schema=false` as a universal** — every rune that emits a `typeof` gains it,
  since accordion is unlikely to be the only rune used outside its semantic home.
- **`schema="ItemList"`** — naming a different vocabulary rather than only
  opting out. More expressive, more surface, and the mapping from a rune's
  internal roles (`Question` → ?) is not obvious for an arbitrary type.

Prefer the smaller one unless the design shows the larger is nearly free.

## Acceptance Criteria
- [ ] A rune that emits schema.org markup can be told not to
- [ ] Markup, classes and behaviour are otherwise identical with and without it
- [ ] The rune's own `schemaOrgType` stays the default — this is opt-out, not opt-in
- [ ] Nested items stop emitting their part too (an `accordion-item` inside a suppressed `accordion` emits no `Question`)
- [ ] {% ref "WORK-548" /%}'s universal-attribute accordion uses it, so the rune pages stop claiming ~970 FAQ entries
- [ ] A test asserts the suppressed output contains no `typeof` / `property` attributes
- [ ] Documented where an author choosing a component would look, not only in the rune's attribute table

## Approach

**`createComponentRenderable` is the choke point.** Both `schemaOrgType` and the
`schema` / `property` wiring flow through it, so suppression can be one check
there rather than a change per rune.

**The child case is the subtle one.** `accordion-item` emits its own `Question`
independently; suppressing only the parent would leave orphan `Question` nodes
with no `FAQPage`, which is worse than either consistent state. The parent's
decision has to reach its children — via the transform config, or by stripping on
the way out.

## References

- {% ref "WORK-548" /%} — the rune attribute tables, where this surfaced
- {% ref "SPEC-128" /%} — the universal-attribute presentation

{% /work %}
