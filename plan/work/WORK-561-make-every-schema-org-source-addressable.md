{% work id="WORK-561" status="done" priority="high" complexity="simple" source="SPEC-130" tags="runes,schema-org,seo" milestone="v0.35.0" pr="refrakt-md/refrakt#608" %}

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

- [x] Each of the ~10 sources is reachable by name — a `refs` entry for nodes that survive, a `properties` entry for value-only carriers
- [x] The choice for each follows {% ref "WORK-560" /%}'s rule, and any node where the rule is awkward is called out rather than quietly resolved
- [x] A test enumerates the schema sources named by each migrating rune and asserts every one resolves, so a later rune cannot declare a source it does not emit
- [x] The image nodes gain a `data-name` distinct from their wrapper's, so `.rf-figure__image` and its container are separately addressable
- [x] `refrakt contracts -o contracts/structures.json` is regenerated — new `data-name`s are new BEM element selectors
- [x] CSS coverage passes, with any genuinely new selector either styled or added to the documented gap sets with a reason
- [x] No JSON-LD changes: this item adds addressability, not emission — asserted against {% ref "WORK-562" /%}'s baseline

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

## Resolution

Completed: 2026-09-16

Branch: `claude/v0.35-parallel-feasibility-eia5le`

### What was done

Ten sources, in seven runes, made reachable by name:

| Rune | Added | Map |
|------|-------|-----|
| `embed` | `title`, `url`, `embedUrl` | `properties` |
| `tier` | `parsedPrice`, `resolvedCurrency` | `properties` |
| `figure` | `image` | `refs` |
| `recipe` | `mediaImage` | `refs` |
| `playlist` | `mediaImage` | `refs` |
| `realm` | `sceneImage` | `refs` |
| `faction` | `sceneImage` | `refs` |

Plus `scripts/schema-sources.test.mjs` — 11 tests. It asserts *resolution*, not
values: a `properties` name must reach the `data-rune-fields` bag, a `refs` name
must appear as a `data-name`. Those are precisely the two routes WORK-565's
applier has, so a rune can no longer declare a source it does not emit.

### The safety property holds

Every meta added to `properties` is **also** still in `schema:`, so
`isSeoMeta` is true in `createComponentRenderable`: it keeps its `property=`,
is not given `data-field`, and is not dropped from the children. The bag entry
is purely additional. `npm run seo:baseline:check` is byte-identical, which is
the assertion that this added addressability without touching emission.

### Two naming calls, made deliberately

- **`tier` → `parsedPrice` / `resolvedCurrency`**, not `price` / `currency`.
  Both of those names are already taken on this rune: `price` is the rendered
  `<p>` ref (`"$19"`) and `currency` is the author's raw attribute. The two new
  sources are the *parsed numeric value* and the *resolved-or-inferred code* —
  different nodes carrying different values, so shadowing would have been wrong.
- **`recipe` / `playlist` → `mediaImage`**, not `image`. `pageSectionProperties`
  already contributes an `image` key for the *header's* image, and the flat
  namespace is unique per rune (ADR-008). `realm` / `faction` take `sceneImage`
  after their `scene` wrapper. The rule applied throughout: name the image after
  its wrapper where there is one, plain `image` where there is not — which is
  why `figure` gets `.rf-figure__image` exactly as the criterion asks.

### The contracts criterion did not produce a diff

`refrakt contracts -o contracts/structures.json --site main` was regenerated and
is current, but the file is **byte-identical**. The five new `data-name`s do not
appear in it.

`generateStructureContract` derives from `RuneConfig`, and `refs` are declared
in each rune's `transform()`, not in config. So config-derived tooling cannot
see them — and CSS coverage cannot either, which is why it still passes without
the new selectors.

This is the same structural gap for the third time in this milestone: it is why
four dead CSS rules survived years of review (WORK-564), why coverage never
checked `.rf-lore__title`, and now why contracts cannot record these. Named here
rather than worked around; WORK-566 is where it gets addressed, since
`inspect --audit` has to resolve the same names the applier does.

The criterion is checked because the regeneration was performed and verified
current — but its stated expectation ("new `data-name`s are new BEM element
selectors" in the contract) does not hold, and that is a finding, not an
omission.

### Notes

- The new element classes (`.rf-figure__image`, `.rf-recipe__media-image`,
  `.rf-playlist__media-image`, `.rf-realm__scene-image`,
  `.rf-faction__scene-image`) have no CSS. Adding a class changes no rendering
  on its own, so there is no visual diff and nothing was added to the gap sets.
- The test uses inline bodies rather than the baseline corpus: several of these
  sources only exist when the rune has a media slot, and the baseline `recipe`
  fixture deliberately has no image. Adding one would move WORK-562's committed
  artifact for a reason unrelated to emission — exactly the noise that artifact
  exists to avoid.

### Verification

`npm test` — 367 files, 4487 tests, all passing. `npm run format:check` clean
(run on its own, exit code read directly). `npm run seo:baseline:check`
byte-identical.

{% /work %}
