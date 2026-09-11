{% spec id="SPEC-130" status="draft" tags="runes, schema-org, seo, config" %}

# Declarative schema.org mapping

Move the schema.org channel from 29 imperative call sites into rune config,
keyed by `data-name` — the same way BEM, modifiers and `editHints` already work.

```ts
Accordion: {
  block: 'accordion',
  schema: {
    FAQPage: {
      properties: { items: 'mainEntity' },
      children: { 'accordion-item': { type: 'Question', properties: { name: 'name', body: 'acceptedAnswer' } } },
    },
  },
}
```

## Problem

A rune's structured data is written by hand inside its transform:

```ts
createComponentRenderable({ rune: 'accordion', schemaOrgType: 'FAQPage',
  schema: { mainEntity: items },
  …
});
```

Three consequences:

**It cannot be overridden.** An accordion is a `FAQPage` on every site, in every
context, forever. Rendering a list of universal attributes as accordion items
({% ref "WORK-548" /%}) therefore publishes roughly **970 fabricated `Question`
entries** across 88 pages — plausible-looking structured data asserting
something untrue.

**It cannot be changed coherently even in principle**, because the type appears
at two levels. `accordion` declares `FAQPage` with `mainEntity`; each
`accordion-item` independently declares `Question` with `name` /
`acceptedAnswer`. Switching to `ItemList` means renaming the parent's property
*and* changing the child's type and both of its properties. An attribute on the
parent cannot reach the child's transform, so the change is not expressible
without the rune carrying a per-type table — which is what this spec proposes
making it.

**It is invisible to tooling.** `refrakt contracts` claims to describe the
complete output of the identity transform and says nothing about schema.org;
`refrakt reference` likewise. Nobody can answer "what structured data does this
page emit?" without reading transforms.

## Constraint: this cannot live in the engine

The obvious home is the identity transform engine, which already walks the tree
reading config. **It does not work**, and the reason is worth stating plainly
because it is not obvious from the architecture diagram.

`packages/content/src/site.ts` never applies the identity transform. It runs
`Markdoc.transform` and then, at line 393, `extractSeo` — and `collectJsonLd`
*derives* the JSON-LD by walking that tree for `typeof` attributes. The engine
runs later, at render time. So schema emitted by the engine would reach the HTML
and never reach the JSON-LD.

The mapping is therefore **config data consulted at transform time**, not engine
behaviour. `createComponentRenderable` needs the theme config, threaded the way
`__backgrounds` and `__securityPolicy` already are.

Relocating `extractSeo` to after the engine is the alternative. It is a larger
change — content loading is framework-agnostic and has no theme config today —
and it is not obviously better, so it is recorded as rejected rather than
unconsidered.

## What the config has to express

Surveyed across all 21 `schema:` maps in the codebase, the values split two ways:

| Kind | Examples | Declarative? |
|------|----------|--------------|
| Named refs | `nameTag`, `titleTag`, `tiers`, `trackItems` | Yes — already carry `data-name` / `data-field` |
| Computed metas | `parsedPriceMeta`, `resolvedCurrencyMeta`, `estimatedTimeMeta` | Yes, by reference — the tag carries `data-field`; only its *value* is computed |

So the split is clean: **the transform computes values, config names their schema
roles.** No case requires config to compute anything, which is what makes this
tractable.

## What it unlocks

**A safe type override.** The per-type table makes `schema="ItemList"` express
the parent rename and the child's type change together — the thing that is not
expressible today.

**Site and theme overrides.** Rune config merges (`mergeThemeConfig`), so a site
can restate a rune's schema without forking the rune.

**Contextual schema.** A child rune could declare what it means inside a given
parent, mirroring the existing `contextModifiers: { 'parent-rune': 'suffix' }`:

```ts
Accordion: { schema: { …, contextProperties: { recipe: 'recipeInstructions' } } }
```

Worth noting this case is *already* expressible imperatively — a parent can map
a child's tags into its own `schema` map with a cursor. What config adds is
letting the child declare it, so the parent needs no knowledge of every rune
that might appear inside it.

**Tooling.** `contracts` and `reference` can describe the structured data, which
closes a real gap in what `contracts` claims to cover.

## Open questions

- **Is `none` a type or a mode?** `schema="none"` suppresses; every other value
  names a type. Reads fine, but it makes the attribute's vocabulary a union of
  two kinds of thing.
- **Validation.** Narrowing to a subtype is always safe (schema.org properties
  are inherited); switching branches is not. With a per-type table the rune only
  offers types it has mappings for, so the unsafe case stops being expressible —
  which may make validation unnecessary rather than deferred. Confirm.
- **Migration shape.** 29 call sites. Whether the imperative form stays
  supported alongside config, or is removed in one pass, decides whether this is
  one work item or several.

## Acceptance Criteria
- [ ] A rune's schema.org type and property mapping are expressible in config, keyed by `data-name` / `data-field`
- [ ] The mapping is applied at transform time, so `extractSeo` still sees it — a test asserts the JSON-LD, not just the HTML attributes
- [ ] A rune can offer more than one type, with per-type property names *and* per-type child mappings
- [ ] Suppressing schema entirely is expressible, and strips the whole subtree rather than just the root
- [ ] Config merging lets a site override a rune's schema without forking the rune
- [ ] `refrakt contracts` describes the schema.org output it currently omits
- [ ] Every one of the 21 existing `schema:` maps is expressible, including the computed-meta cases
- [ ] The imperative form either still works or is fully migrated — not half of each

## References

- {% ref "WORK-552" /%} — `schema="none"` on accordion, shipping ahead of this
- {% ref "WORK-548" /%} — the ~970 fabricated `Question` entries that surfaced it
- {% ref "SPEC-082" /%} — the schema.org channel this reworks

{% /spec %}
