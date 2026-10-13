{% spec id="SPEC-169" status="draft" tags="runes, composition, content-model, architecture" %}

# What the composition parser must accept, and what belongs elsewhere

## Summary

{% ref "SPEC-168" /%} D7 recorded four gaps between what native runes declare and what a
composition can express. They block more runes than any reuse mechanism would unlock. Each was
examined against the runes it blocks:

| Gap | Runes | Outcome |
|---|---|---|
| No `delimited` content model | `hero`, `feature`, `step`, `recipe`, `playlist` | **Real.** Accepted, with fixed zones only (D1) |
| No conditional (`when`) content model | `steps`, `itinerary`, `symbol` | **Not needed.** Each has a declarative alternative (D2–D5), so the existing rejection stands |
| No `implicitSection` | `itinerary` | **Real, and small.** Accepted (D3) |
| Generated config lacks `checklist`, `sequence`, `mediaSlots`, chrome defaults | plan runes, `timeline`, `itinerary`, `plot`, … | **Not a parser gap.** `checklist` is not a gap at all; each other feature has a home in another spec (D6) |

Two parser additions, two small template additions, and a routing table. No new content-model
type is invented.

## What the parser accepts today

- `content.type` must be `sequence` or `sections` (`packages/runes/src/lib/composition.ts:1340-1352`).
  The sections keys are `type`, `sectionHeading`, `fields`, `preamble`, `sectionModel`,
  `emitTag`, `emitAttributes`, `headingExtract` and `knownSections` (`:1329-1339`).
- A conditional model is rejected with a stated reason: *"the template, not the model, is where
  an assembly varies"* (`:262-266`).
- `composedRuneConfig` produces only `modifiers`, `metaFields`, `blocks` and `provides`
  (`:1428-1455`).
- `each` iterates a greedy field, a field with an `itemModel` and an `emitTag`, or `sections`
  (`site/content/extend/rune-authoring/composed-runes.md`, "`each` and `$each`").

## Decisions

### D1 — compositions accept a `delimited` model with fixed zones

The `DelimitedModel` type exists (`packages/types/src/content-model.ts:169-188`): a delimiter
node, named `zones` each with a `sequence` of fields, an optional `primary` zone for input with
no delimiter, and `dynamicZones`.

```yaml
content:
  type: delimited
  delimiter: hr
  zones:
    - name: media
      fields:
        media: { match: any, optional: true, greedy: true }
    - name: content
      primary: true
      fields:
        eyebrow:  { match: paragraph, optional: true }
        headline: { match: heading }
        blurb:    { match: paragraph, optional: true }
        actions:  { match: list, optional: true, greedy: true }
```

```md
{% section forward="split" %}
{% slot name="media" /%}

---

{% slot name="eyebrow" /%}
{% slot name="headline" /%}
{% slot name="blurb" /%}

{% actions %}{% slot name="actions" /%}{% /actions %}
{% /section %}
```

1. **The slots are the union of the zones' fields.** A field name used in two zones is an error
   at construction.
2. **Only `hr` is accepted as the delimiter**, which is all five runes use.
3. **`dynamicZones` is rejected.** Its zones have no fixed names, so a template has nothing to
   place. No measured rune uses it.
4. **The composition consumes the delimiters; the template re-emits them** where a placed
   primitive should split, as the composed `realm` already does with `card`. The `---` in the
   template is unconditional, per {% ref "SPEC-145" /%} D17.

**Why not let `section` split the content itself?** It can: {% ref "SPEC-160" /%} D2 gives
`section` `---` zones. A composition that only needs the zones passes everything through one
slot. A delimited model is for compositions that must **address a field inside a zone**:
`hero` wraps its trailing list in `{% actions %}`, `recipe` places its ingredient and step
lists, `playlist` extracts tracks. Those are the five measured runes.

**This corrects SPEC-145 D18**, which said recipe's "`delimited`/zoned model … [is] declarable
in frontmatter". It was not: the parser rejected it. This decision makes the statement true.

### D2 — `when` stays rejected; each conditional rune has a declarative form

The rejection's reason holds up. In all three runes that use a conditional model, the condition
either can be absorbed into one model or is really a choice of assembly:

| Rune | Condition today | Declarative form |
|---|---|---|
| `itinerary` | has an `h2` child (`plugins/places/src/tags/itinerary.ts:171-201`) | Both branches are already `sections` at `heading:2`; the default only adds `implicitSection`. One model with `implicitSection` covers both (D3) |
| `steps` | has a heading child (`plugins/marketing/src/tags/steps.ts:109-131`) | One `sections` model with an optional ordered list in the preamble; the template places both lists, and one is empty (D4) |
| `symbol` | `kind` is `class`, `interface` or `module` (`plugins/docs/src/tags/symbol.ts:153-179`; a function-form model, not `when`) | One `sections` model at `heading:3`; the assembly varies by `kind`, which is a {% ref "SPEC-145" /%} D15 template choice (D5) |

A function-form content model (`contentModel: (attrs) => …`) is evaluated with no attributes
when a composition reads it (`composition.ts:261`), so it silently takes one branch. A
composition definition cannot declare one, but the rule should be stated: **a composition's
content model does not depend on attribute values.**

### D3 — compositions accept `implicitSection`

`implicitSection` already exists on the sections model
(`packages/types/src/content-model.ts:160-166`): when no section heading is found, all
children become one section with the given attributes instead of preamble.

In a composition there is no `emitTag`, so the implicit section is an ordinary item of the
`sections` slot, and its `attributes` supply the `$each` values:

```yaml
content:
  type: sections
  sectionHeading: heading:2
  emitAttributes: { label: $heading }
  implicitSection: { attributes: { label: "" } }
```

The keys in `implicitSection.attributes` must be exactly the keys of `emitAttributes`, so
`$each` is bound the same way for a real and an implicit section. This replaces `itinerary`'s
conditional model.

### D4 — `each` iterates the items of a list field

Today `each` needs an `itemModel` with an `emitTag` to iterate a list's items. A list whose
items need no extraction, where each item's content is placed as it is, has no way in.

```yaml
content:
  type: sections
  sectionHeading: heading
  emitAttributes: { heading: $heading }
  preamble:
    header: { match: paragraph, optional: true, greedy: true }
    items:  { match: "list:ordered", optional: true }
```

```md
{% group name="steps" layout="ladder" %}
{% slot name="items" each %}
{% section %}{% slot /%}{% /section %}
{% /slot %}
{% slot name="sections" each %}
{% section %}
### {% $each.heading %}

{% slot /%}
{% /section %}
{% /slot %}
{% /group %}
```

- **A non-greedy field matching one `list` node may be placed with `each`.** Each list item is
  one item. The bare `{% slot /%}` is the item's content, and `$each` exposes nothing. Naming
  `$each.x` on such a slot is the existing `each-field-not-emitted` error.
- **`steps` then needs no conditional.** An author writes either headings or an ordered list,
  and the template places both slots. The one not written is empty and renders nothing.
- An author who writes an ordered list *and* headings gets both, in source order. That is what
  they wrote, and `steps` today would have read only the headings.

### D5 — a D15 template may cover several values

{% ref "SPEC-145" /%} D15 constraint 2 required templates and the selecting attribute's
`matches` values to correspond one to one. `symbol`'s `kind` has eight values and two
assemblies. A template may therefore list several values:

```md
{% template kind="class, interface, module" %}
	…groups and members…
{% /template %}

{% template kind="function, enum, type, hook, component" %}
	…a flat symbol…
{% /template %}
```

The constraint becomes: **every value is covered by exactly one template**, and every listed
value is in `matches`. A value covered twice, or not at all, is the same error as before.

`symbol` then has one `sections` model at `heading:3`. In the grouped template each section is
a group, and its members are a nested `each` at `heading:4` ({% ref "SPEC-165" /%} D6). In the
flat template the sections render as ordinary titled sections.

### D6 — the generated config stays narrow; each missing feature has another home

`composedRuneConfig` emitting little is consistent with {% ref "ADR-042" /%} and
{% ref "ADR-043" /%}: a composed rune's output is primitives and vocabulary, so behaviour
belongs to what it places. Each feature the measurement listed:

| Feature | Native runes | Home for a composition |
|---|---|---|
| `checklist` | `work`, `bug` | **Not a gap.** Checkbox markers are detected on every `<li>` in the engine (`packages/transform/src/engine.ts:173-175`, `detectCheckboxMarker`). The flag only documents intent (`packages/transform/src/types.ts:464-469`) |
| `sequence`, `sequenceDirection` | `steps`, `timeline`, `itinerary`, `plot`, `howto`, `recipe` | {% ref "SPEC-156" /%}'s ladder: `{% group layout="ladder" %}` with its marker, placed by the template |
| `mediaSlots` | storytelling, `recipe`, `playlist` | {% ref "SPEC-160" /%} D2: `section`'s `media` attribute |
| Chrome defaults (`defaultDensity`, width, elevation) | `hero`, `cta`, `feature`, `hint` | SPEC-145 D14 (the chrome carrier and its defaults) and {% ref "SPEC-159" /%}'s composite intents |
| `staggerItems` | `bento`, `feature`, `steps`, `pricing`, `playlist` | The placed container's own `staggerItems`, once the universal `stagger` attribute lands on it (SPEC-145 D14) |
| `editHints` | many | The placed primitives' own hints. A composition adds none |

Nothing is added to `composedRuneConfig` by this spec.

## Runes this unblocks, and what each still waits on

| Rune | Unblocked by | Still waits on |
|---|---|---|
| `hero` | D1 | SPEC-160 D6 (`actions`), SPEC-145 D14 |
| `feature` | D1 | SPEC-161 D3 (`deflist` term shapes), SPEC-156 arrangements |
| `step`, `steps` | D1, D4 | SPEC-160 D2, SPEC-156 ladder |
| `recipe` | D1 | {% ref "SPEC-146" /%} (structured data across `section`) |
| `playlist` | D1 | SPEC-145 D27 (per-variant item defaults), SPEC-146 |
| `itinerary` | D3 | SPEC-156 ladder; requiresParent children become `each` items |
| `symbol` | D5 | SPEC-165 D6 (nested `each`), SPEC-146; byte compatibility with `refrakt docs extract` |

## Not in scope

- **`custom` content models** (`map`, `bento`, `storyboard`, today's `comparison`). They stay
  native or move to primitives, as their own specs decide ({% ref "SPEC-147" /%} D3,
  {% ref "SPEC-167" /%}).
- **Structured data crossing a placed primitive** ({% ref "SPEC-146" /%}).
- **Attribute presets and `forward`** ({% ref "SPEC-168" /%}).

## Open questions

- **D4's list-and-headings case.** Rendering both is faithful to the source, but it is a change
  for an author who relied on `steps` ignoring the list. Whether to report it as a warning is
  open.
- **Function-form models in native runes.** D2's rule could also be a warning on native runes
  whose model depends on attributes, since such a rune cannot later become a composition. That
  is a policy question for {% ref "ADR-044" /%}'s tiers, not decided here.

## Acceptance Criteria

- [ ] A composition accepts `type: delimited` with `delimiter: hr` and fixed `zones`, honours `primary` for input with no delimiter, and places each zone field as a slot
- [ ] A field name in two zones, a delimiter other than `hr`, and `dynamicZones` are each construction errors with their own message
- [ ] A composed `hero` over `section` with a delimited model renders its media and content zones and wraps its actions list, asserted against a fixture
- [ ] A composition accepts `implicitSection` on a sections model; its attribute keys must equal `emitAttributes`' keys; with no section heading, all content becomes one item of the `sections` slot
- [ ] `each` on a non-greedy field matching one `list` iterates its items, with the bare slot as each item's content and no `$each` bindings
- [ ] A composed `steps` renders the same steps from headings and from an ordered list, with one model and no conditional
- [ ] A D15 `{% template %}` may list several values; every value is covered exactly once, reported both ways as before
- [ ] The error for a conditional content model names this spec's alternatives (implicit sections, list `each`, D15 templates)
- [ ] SPEC-145 D18's statement about recipe's delimited model and SPEC-145 D15's constraint 2 carry notes pointing here

## References

- {% ref "SPEC-168" /%} D7: where these gaps were found.
- {% ref "SPEC-145" /%}: D15 templates, D17 conditionals and delimiters, D18 recipe, D26 `each`, D27 item defaults.
- {% ref "SPEC-156" /%}: the ladder, the home for `sequence`.
- {% ref "SPEC-160" /%}: `section` zones (D2) and `actions` (D6).
- {% ref "SPEC-165" /%} D6: nested `each`, which `symbol`'s members need.
- {% ref "ADR-042" /%}, {% ref "ADR-043" /%}: why the generated config stays narrow.

{% /spec %}
