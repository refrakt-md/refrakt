{% work id="WORK-561" status="ready" priority="high" complexity="simple" source="SPEC-130" tags="runes,schema-org,seo" milestone="v0.35.0" %}

# Make every schema.org source addressable

Roughly ten schema sources are in **neither `properties` nor `refs`**, so they
are reachable by neither route the applier has: not in the field bag, and
carrying no `data-name`. Give each one a name or a bag entry before its rune
migrates.

Purely additive, no schema knowledge required, and it can land in parallel with
{% ref "WORK-565" /%}. It is a prerequisite for the runes that carry these
sources, not for the mechanism itself.

## Scope

Found by {% ref "SPEC-130" /%}'s prototype, and invisible until the applier was
built:

| Kind | Rune | Sources |
|------|------|---------|
| Metas built only for SEO | `embed` | `titleMeta`, `urlMeta`, `embedUrlMeta` (`packages/runes/src/tags/embed.ts:109-111`) |
| | `tier` | `parsedPriceMeta`, `resolvedCurrencyMeta` (`plugins/marketing/src/tags/pricing.ts:134-135`) |
| Image nodes | `figure`, `recipe`, `playlist`, `realm`, `faction` | `imgs[0]`, `seoImage`, `sceneImgTag` — the node is anonymous; only its wrapper is named |

The two kinds take opposite fixes, and {% ref "WORK-560" /%}'s rule is what
says which:

- **The SEO-only metas are values.** They exist to carry a string and disappear.
  They belong in `properties`, which puts them in `data-rune-fields` where the
  applier's rebuild strategy can find them.
- **The image nodes survive and are rendered.** They belong in `refs`, which
  gives them a `data-name` the applier can stamp in place.

## Acceptance Criteria

- [ ] Each of the ~10 sources is reachable by name — a `refs` entry for nodes that survive, a `properties` entry for value-only carriers
- [ ] The choice for each follows {% ref "WORK-560" /%}'s rule, and any node where the rule is awkward is called out rather than quietly resolved
- [ ] A test enumerates the schema sources named by each migrating rune and asserts every one resolves, so a later rune cannot declare a source it does not emit
- [ ] The image nodes gain a `data-name` distinct from their wrapper's, so `.rf-figure__image` and its container are separately addressable
- [ ] `refrakt contracts -o contracts/structures.json` is regenerated — new `data-name`s are new BEM element selectors
- [ ] CSS coverage passes, with any genuinely new selector either styled or added to the documented gap sets with a reason
- [ ] No JSON-LD changes: this item adds addressability, not emission — asserted against {% ref "WORK-562" /%}'s baseline

## Approach

Do this **after** {% ref "WORK-562" /%} even though it looks independent. Adding
a `properties` entry for a meta that is currently hand-passed to `schema:`
changes what `createComponentRenderable` does with it — a property meta not
named in `schema:` gets `data-field` and is dropped from the children. Getting
that wrong silently deletes a schema carrier, and the baseline is what catches
it.

The `tier` metas are the case to watch: `parsedPriceMeta` is passed to
`schema:` today and therefore survives. Once it is *also* a `properties` entry,
the `isSeoMeta` check still protects it — but that protection disappears in
{% ref "WORK-565" /%}, when runes stop declaring `schema:` at all and the
applier rebuilds from the bag instead. The bag entry added here is what makes
that safe, which is why this lands first and not alongside.

Note `tier`'s price is also where {% ref "WORK-564" /%} is working —
`.rf-tier p[property="price"]` is a dead rule pointing at a `<meta>`. The two
items touch the same rune for unrelated reasons; neither blocks the other.

## Blocked by

- {% ref "WORK-560" /%}
- {% ref "WORK-562" /%}

## Blocks

- {% ref "WORK-568" /%}
- {% ref "WORK-569" /%}
- {% ref "WORK-570" /%}

## References

- {% ref "SPEC-130" /%} — "What the prototype found: unaddressable sources"
- {% ref "WORK-560" /%} — the rule that decides which map each source goes in
- {% ref "ADR-008" /%} — uniqueness across the flat namespace is enforced, so a new name can collide

{% /work %}
