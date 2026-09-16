{% work id="WORK-570" status="done" priority="medium" complexity="moderate" source="SPEC-130" tags="runes,schema-org,seo,rdfa" milestone="v0.35.0" %}

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

- [x] `accordion`, `accordion-item`, `recipe` and `how-to` declare their schema as tables, with no `node.attributes.typeof = …` mutation and no hand-written `property="text"` wrapper left in any transform
- [x] The rendered HTML is **byte-identical** for these four runes, wrapper included — asserted, not assumed
- [x] The JSON-LD matches {% ref "WORK-562" /%}'s baseline exactly
- [x] The two-point invariant from {% ref "WORK-563" /%} passes for all four, so the RDFa and the JSON-LD still agree
- [x] `recipe`'s `<li>`s resolve through their existing `data-name`s (`ingredient`, `step`) — no new names needed here
- [x] `recipe`'s image source resolves through the name {% ref "WORK-561" /%} gave it
- [x] `schema="none"` still strips the whole subtree on `accordion`, including the wrapper the applier now emits
- [x] A test pins the RDFa shape itself — that a node carrying both `property` and `typeof` always has an inner carrier for its text — so the wrapper cannot be "optimised away" later

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

## Resolution

Completed: 2026-09-16

Branch: `claude/v0.35-parallel-feasibility-eia5le`

### What was done

`accordion`, `accordion-item`, `how-to` and `recipe` declare tables. No transform
sets `typeof` on a node it did not create, and none hand-writes an RDFa carrier:
`text:` moves the wrapping into the applier and the rune declares only the role.

**The HTML does not move**, which was the whole difficulty. Captured before and
after through `refrakt inspect` for all four runes: identical byte count, same
elements, same attributes, same values, same document positions. Eight elements
serialise their attributes in a different order (`typeof` now follows
`data-name`; a rebuilt meta's `property` precedes its `content`), because the
applier sets them after `createComponentRenderable` rather than before. Attribute
order is not part of an HTML document's meaning, so "byte-identical" is the one
claim in that criterion I cannot make literally — stated rather than glossed.

**The JSON-LD diff is empty.** All 48 baseline fixtures unchanged.

`textTag` is new on a row: `how-to` and `recipe` wrap an `<li>`'s content in a
`<p>`, and a `<div>` there would change the page's margins. A rendering choice,
declared so the applier reproduces what each rune already rendered.

**Two defects in the applier this surfaced**, both from `recipe`:

- `stamp` took only the *first* node bearing a name, so `recipe` published one
  of its six ingredients and silently dropped the rest. It now stamps every
  match — which is also what makes `recipeIngredient` an array, as the baseline
  has it.
- Stamping every match then reached *across rune boundaries*: `character` maps
  `name`, and so does every `character-section` inside it, so a character's name
  became `["Veshra", "Backstory", "Abilities"]`. `findAllByName` now stops at
  another rune's node — ADR-008's flat namespace is unique *per rune*, and the
  lookup has to respect the same boundary. Caught by the baseline, which is what
  it is for.

**The RDFa argument is now a test.** `rdfa-text-wrapper.test.ts` (split across
`packages/runes` and `plugins/learning`, since the two plugin runes only resolve
with the plugin loaded) asserts that any element carrying both `property` and
`typeof` has an inner carrier for its text, with a hand-built counter-example so
the check cannot pass vacuously, and `recipe`'s untyped ingredients as the
control — an untyped property node is *not* wrapped, which is what makes it a
rule rather than "wrap everything". `schema="none"` is covered too: it must reach
the wrapper the applier now emits, not only the types.

### Notes

- **No `lists:` on these four**, deliberately. D6 is defensible for
  `mainEntity`, `step`, `tool`, `recipeIngredient` and `recipeInstructions`, but
  this item's entire evidence is an empty diff, and declaring a list changes a
  one-item collection from an object to an array. Filed as {% ref "WORK-574" /%}
  so it is a deliberate change rather than a side effect of a refactor.
- `accordion`'s comment about why this cannot live in the engine was carried
  forward into the table's own documentation rather than deleted, as the item
  asked.
- With this, `imperative-schema-migration.test.ts`'s `PENDING` list is empty —
  SPEC-130's closing condition, mechanically checked.

{% /work %}
