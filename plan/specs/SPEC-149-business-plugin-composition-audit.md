{% spec id="SPEC-149" status="draft" tags="runes, composition, business, plugins, feasibility, seo" %}

# Business plugin composition audit

## Summary

Third plugin audited against {% ref "SPEC-145" /%}, after {% ref "SPEC-147" /%}'s
storytelling and {% ref "SPEC-148" /%}'s places. Business is 602 lines across five
runes and is **the cleanest of the three by a wide margin**: no custom content models,
no `postTransform`, no pipeline hooks, no behaviors, no component overrides, no
`requiresParent`.

Four of its five runes compose **today**. One is gated on {% ref "SPEC-146" /%}, and only
for two of its properties. And it is the first plugin with **no misfiled capability** —
which is a useful negative result, because it shows the pattern the first two audits
found is "at most one", not "always one".

It also forces a refinement to SPEC-148's method, which changed three verdicts in this
audit alone.

## Method refinement — path B splits in two

{% ref "SPEC-148" /%} D1 established the five resolution paths and the per-property
unit. Applying it here showed path B ("`properties` from a node", the one composition
breaks) is not one thing:

**B-intrinsic** — the value exists *only* as authored content. There is no attribute
carrying it; the author wrote an H1 and the rune harvested it. `event`'s and
`organization`'s `headline` / `blurb` via `pageSectionProperties` are this. Only
SPEC-146 fixes them.

**B-by-choice** — the value originates in an **attribute**, and the rune's transform
chose to render it as a node which the schema then stamps. `cast-member`'s `name`,
`role` and `portrait` are built as `nameTag` / `roleTag` / `portraitTag` from
`attrs.name` / `attrs.role` / `attrs.image`; `timeline-entry`'s `label` and `date` the
same. **A composition declaring the same attributes can map them through the bag —
path A — and works today.**

The distinction matters because it is the difference between "blocked" and "free", and
three of business's five runes look blocked under the coarse reading and are not. Stated
as a rule: *a property is only genuinely blocked when its value has no attribute to fall
back to.*

## The audit

### `cast` — no schema at all

The parent declares `sections`, `attributes` (`layout`) and a content model, and **no
`schema`**. Nothing to resolve, nothing to break. Composes today.

### `cast-member` — `Person`, all three properties B-by-choice

| Property | schema.org | Origin | Today's path | Composed path | Status |
|---|---|---|---|---|---|
| `name` | `name` | `attrs.name` → `nameTag` ref | B | **A** (bag) | ✓ today |
| `role` | `jobTitle` | `attrs.role` → `roleTag` ref | B | **A** | ✓ today |
| `portrait` | `image` | `attrs.image` → `portraitTag` ref | B | **A** | ✓ today |

Every value is already an attribute the author writes; only the rendering is a node. A
composed `cast-member` maps them from the bag and publishes correctly with no SPEC-146.

One detail to carry over: `attrs.image` runs through `resolveImageScheme`, so
`placeholder:` / `icon:` sources resolve to inline `<svg>` (SPEC-106). A composition
placing `{% slot %}` or an `<img>` directly must keep that, or scheme sources silently
become broken image URLs.

### `timeline` — `ItemList`, children only

```ts
{ type: 'ItemList', lists: ['itemListElement'],
  children: { 'timeline-entry': { type: 'ListItem', property: 'itemListElement',
                                  generated: { position: 'index' } } } }
```

No `properties` on the parent at all. `children` is **path E**, which works across a
composition boundary (measured in SPEC-145's worked examples), `generated: index` rides
`items.forEach((item, i) => …)`, and `lists` is a root attribute untouched by nesting.
The rune's transform does build `pageSectionProperties` refs, but the schema table maps
none of them, so they carry no schema weight. **Composes today.**

Also already declarative where `plot` was not: `business/Timeline` was one of the six
runes using `sequence: 'connected'` in {% ref "SPEC-147" /%}'s count, so there is no
`postTransform` here to retire.

### `timeline-entry` — `ListItem`, both properties B-by-choice

| Property | schema.org | Origin | Today's path | Composed path | Status |
|---|---|---|---|---|---|
| `label` | `name` | `attrs.label` → `labelTag` ref | B | **A** | ✓ today |
| `date` | `description` | `attrs.date` → `dateTag` ref | B | **A** | ✓ today |

### `organization` — the only gated rune, and only partly

Its schema table is the **variant** form, `{ by: 'type', rows, fallback }`, selecting a
schema.org type from the `type` attribute. The source comment records why that form
exists: *"`organization` was already doing what this milestone proposes… `by: 'type'`
says the same thing where a reviewer can read it, and keys the rows off the one list that
also feeds `matches`, so the accepted values and the published types cannot drift."*

| Property | schema.org | Origin | Path | Status |
|---|---|---|---|---|
| *row selection* | the `@type` itself | `attrs.type` via `by` | attribute | ✓ today |
| `headline` | `name` | `pageSectionProperties(header)` | **B-intrinsic** | **gated** |
| `blurb` | `description` | `pageSectionProperties(header)` | **B-intrinsic** | **gated** |

So the part that looks hardest — a schema.org type that varies by attribute — is
composition-safe, because row selection reads `attrs`. What breaks is the same pair that
breaks in `event`: the name and description harvested from authored content.

## Verdict

| Rune | Composes |
|---|---|
| `cast`, `cast-member`, `timeline`, `timeline-entry` | **today** |
| `organization` | after {% ref "SPEC-146" /%}, for `headline` / `blurb` only |

**And there is no misfiled capability.** Nothing in business needs a client lifecycle, a
behavior, a custom content model or a pipeline hook. This is the first plugin that is
purely domain content, so unlike storytelling (which sheds `storyboard`) and places
(which dissolves around `map`), business **retires cleanly and completely**.

That is a useful negative result for the cross-audit finding: the pattern is *a domain
plugin is mostly domain content plus **at most one** misfiled capability* — not "always
one". Two of three had one; this one does not.

## Decisions

### D1 — path B is recorded as B-intrinsic or B-by-choice

Per {% ref "SPEC-148" /%} D1's per-property unit, with the split above. A bare "path B"
verdict overstates the blocker by counting values that merely *render* as nodes, and it
mis-stated three of this plugin's five runes before the distinction was drawn.

### D2 — a B-by-choice property is mapped from the attribute in its composed form

Not preserved as a ref for fidelity's sake. The attribute is the value's origin; stamping
a rendered span was the old transform's choice, and reproducing it would import a blocker
the composition does not need.

### D3 — business retires completely, staged as replace-not-delete

Same staging as {% ref "SPEC-147" /%} D1 and {% ref "SPEC-148" /%} D2: the composed
implementations ship alongside until an explicit later decision. Nothing relocates,
because nothing is misfiled.

### D4 — `resolveImageScheme` behaviour is part of the contract, not an implementation detail

`cast-member` resolves `placeholder:` / `icon:` sources to inline SVG (SPEC-106). A
composed replacement that drops it fails silently on exactly the sources that look most
like ordinary strings. Any composed rune taking an image attribute inherits this.

## Implementation notes, deliberately not yet work items

1. **Compose `cast` + `cast-member`** — unblocked, and the simplest schema-bearing
   composition available (one `Person`, three attributes). A better first proof than
   itinerary if a schema-emitting example is wanted.
2. **Compose `timeline` + `timeline-entry`** — unblocked; exercises path E and
   `generated: index` together, which nothing else audited does.
3. **Compose `organization`** — after SPEC-146; the variant schema form should be
   checked against a composed tree specifically, since `selectRow`'s attribute read has
   not been measured across a boundary.
4. **Carry `resolveImageScheme`** into any composed rune taking an image attribute (D4).

## Non-goals

- Deleting `plugins/business/` — same staging as the sibling audits
- Auditing the remaining plugins (`design`, `learning`, `media`, `docs`, `marketing`)
- Changing `organization`'s variant schema form; it is cited as already correct
- Resolving whether `cast`'s `carousel` layout needs behaviour — it is a CSS scroll-snap
  track today and stays one

## Acceptance Criteria

- [ ] `cast`, `cast-member`, `timeline` and `timeline-entry` exist as compositions with fixtures, publishing graphs identical to the plugin's recorded baseline
- [ ] Every B-by-choice property resolves through the bag in its composed form, asserted at path A rather than assumed (D2)
- [ ] `organization` composes after SPEC-146, with `headline` and `blurb` publishing and the `by: 'type'` row selection verified across a composition boundary
- [ ] `timeline`'s `generated: { position: 'index' }` numbers entries identically in composed form, asserted on a list of three or more
- [ ] A composed rune taking an image attribute resolves `placeholder:` and `icon:` schemes to inline SVG (D4)
- [ ] `plugins/business/` is unchanged and passing its own tests until an explicit removal decision (D3)
- [ ] Lumina's 150 lines of `cast` / `timeline` / `organization` CSS are re-keyed via `contextModifiers` with no unstyled regressions, or each accepted change is listed
- [ ] The rune authoring guide documents the B-intrinsic / B-by-choice distinction, since it decides whether a rune is blocked

## References

- {% ref "SPEC-148" /%} — the places audit; establishes the per-property method this refines
- {% ref "SPEC-147" /%} — the storytelling audit; the first data point for the misfiled-capability pattern this one qualifies
- {% ref "SPEC-145" /%} — composed runes; the mechanism audited
- {% ref "SPEC-146" /%} — name resolution across boundaries; what gates `organization`
- {% ref "SPEC-130" /%} — the schema table and its applier; the five paths and the `by` / `rows` variant form
- {% ref "SPEC-106" /%} — image src schemes; the `resolveImageScheme` behaviour D4 preserves

{% /spec %}
