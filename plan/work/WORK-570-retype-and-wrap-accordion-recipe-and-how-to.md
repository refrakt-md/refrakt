{% work id="WORK-570" status="ready" priority="medium" complexity="moderate" source="SPEC-130" tags="runes,schema-org,seo,rdfa" milestone="v0.35.0" %}

# Retype and wrap — accordion, recipe and how-to

`accordion`, `accordion-item`, `recipe` and `how-to` set `typeof` on nodes they
did not create and hand-write a `<div property="text">` wrapper to supply the
value. Replace both with a declaration.

The HTML must not change. That is the whole difficulty.

## The wrapper is conformant, not a workaround

The obvious cleanup is to delete the wrapper and teach `collectJsonLd` to take a
typed node's own text as a named property. **It would break the HTML.**

RDFa Core 1.1 §7.5 step 11 resolves a property's object as: `@content` →
literal; else `@typeof` present and `@about` absent → *the typed resource*; else
a plain literal from the text. So an element carrying both `property` and
`typeof` has its object fixed to the typed resource and its text is unreachable
as a literal. Today's output —

```html
<div typeof="Answer" property="acceptedAnswer"><div property="text">…</div></div>
```

— expresses `_:q acceptedAnswer _:a . _:a a Answer . _:a text "…"`. Without the
inner element the third triple is gone. Since {% ref "SPEC-082" /%} renders the
SEO carriers inline, refrakt publishes RDFa *and* JSON-LD on the same page, so
the two would assert different graphs on every accordion, recipe and how-to.

What is wrong is that runes hand-write it. {% ref "WORK-565" /%}'s `text:` moves
the wrapping into the applier, and the table declares only the role:

```ts
accordionItem: {
  type: 'Question',
  properties: { name: 'name' },
  entities: {
    body: { type: 'Answer', property: 'acceptedAnswer', text: 'text' },
  },
}
```

## Acceptance Criteria

- [ ] `accordion`, `accordion-item`, `recipe` and `how-to` declare their schema as tables, with no `node.attributes.typeof = …` mutation and no hand-written `property="text"` wrapper left in any transform
- [ ] The rendered HTML is **byte-identical** for these four runes, wrapper included — asserted, not assumed
- [ ] The JSON-LD matches {% ref "WORK-562" /%}'s baseline exactly
- [ ] The two-point invariant from {% ref "WORK-563" /%} passes for all four, so the RDFa and the JSON-LD still agree
- [ ] `recipe`'s `<li>`s resolve through their existing `data-name`s (`ingredient`, `step`) — no new names needed here
- [ ] `recipe`'s image source resolves through the name {% ref "WORK-561" /%} gave it
- [ ] `schema="none"` still strips the whole subtree on `accordion`, including the wrapper the applier now emits
- [ ] A test pins the RDFa shape itself — that a node carrying both `property` and `typeof` always has an inner carrier for its text — so the wrapper cannot be "optimised away" later

## Approach

**Write the byte-identical assertion first.** These four runes are where a
plausible-looking simplification silently changes what the page asserts, and the
reasoning that leads there is short enough that someone will re-derive it. The
test is the only durable form of the argument; the prose above is a comment that
will not run.

`accordion` is also the rune that motivated the whole spec, by way of
{% ref "WORK-548" /%} — rendering a list of universal attributes as accordion
items publishes roughly **970 fabricated `Question` entries** across 88 pages.
{% ref "WORK-552" /%} already shipped `schema="none"` as the author-side out.
What this item adds is that the suppression and the emission are now declared in
the same place, so the relationship between them is visible.

Note `accordion`'s comment at `packages/runes/src/tags/accordion.ts:111` —
"Done here rather than in a later pass because `extractSeo` reads the …" — is
the same constraint {% ref "WORK-565" /%} is built around. Update it rather than
deleting it; it is the only place in the source that records why this cannot
live in the engine.

## Blocked by

- {% ref "WORK-561" /%}
- {% ref "WORK-565" /%}

## References

- {% ref "SPEC-130" /%} — "What Group C actually costs", the RDFa analysis
- {% ref "SPEC-082" /%} — Option B, the inline SEO carriers
- {% ref "WORK-548" /%} — the ~970 fabricated `Question` entries
- {% ref "WORK-552" /%} — `schema="none"`, shipped
- `packages/runes/src/tags/accordion.ts:111` — the comment to carry forward

{% /work %}
