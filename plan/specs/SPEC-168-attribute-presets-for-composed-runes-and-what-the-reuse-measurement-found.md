{% spec id="SPEC-168" status="draft" tags="runes, composition, attributes, reuse, architecture" %}

# Attribute presets for composed runes, and what the reuse measurement found

## Summary

Several runes have near-identical content models, templates or attribute groups. Before
designing any reuse mechanism for compositions, every rune that is a composition candidate was
measured: its current native content model and output, its planned composition, its attribute
groups, and the imperative transforms it performs. This spec records the measurement and
decides on its evidence.

- **Attribute presets are justified, and are decided here** (D1–D5). The same attribute groups
  are declared over and over, and composition frontmatter has no way to share them.
- **A shared "shape" (content model plus template) is deferred** (D6). Only three clusters of
  runes are truly identical, all first-party, and a plugin can already share a template
  without a new mechanism.
- **The measurement found bigger blockers than reuse**: content-model types and config
  features that compositions cannot express. They are listed for a separate spec (D7).

## The measurement

About 45 runes across core and all nine plugins, each read from its current code
(`createContentModelSchema` and its config entry) and from its planned composition in
{% ref "SPEC-145" /%}, {% ref "SPEC-147" /%}–{% ref "SPEC-157" /%}, {% ref "SPEC-160" /%}–{% ref "SPEC-167" /%}.

### Whole shapes: content model and template together

| Cluster | Runes | How identical |
|---|---|---|
| Entity profile | `character`, `realm`, `faction`; `lore` is a subset | Templates byte-identical between `realm` and `faction` (`packages/content/test/fixtures/composed-storytelling/runes/`); content models identical apart from the image field's name (`portrait` vs `scene`) |
| Plan document | `spec`, `work`, `bug`, `decision`, `milestone` | One planned output tree (SPEC-152), varying only in the metadata field list. Two content models: `work`, `bug`, `decision` are `sections` at `##` with per-rune `knownSections` (`plugins/plan/src/tags/work.ts:94-131`); `spec` and `milestone` are `sequence`s (`spec.ts:49-56`, `milestone.ts:44-53`) |
| Page-section entity | `event`, `organization` | Content models byte-identical (`plugins/places/src/tags/event.ts:59-65`, `plugins/business/src/tags/organization.ts:74-80`) |
| Split hero | `hero`, `feature`, `step`; `cta` without media | One tree, `section[split] > media / --- / header + X`, where X is actions, an arranged `deflist` or a body |
| Header plus child list | `cast`, `timeline`, `itinerary` | One tree; extraction differs (list `itemModel` vs heading sections with `headingExtract`) |
| Each section as a titled region | `palette`, `ledger`, `comparison`, the storytelling fixtures | One pattern; the primitive placed per item differs every time |

Only the first three clusters are truly identical: about ten runes in three shapes. In the
other three, what varies is exactly what a template exists to vary, so a shared shape would
need parameters.

### Attribute groups

| Group | Declared by | Evidence |
|---|---|---|
| Split: `media-position`, `media-ratio`, `valign`, `collapse` | 8 native runes via `base: SplitLayoutModel` (`card`, `hero`, `feature`, `step`, `recipe`, `playlist`, `realm`, `faction`); partial inline copies in `bento` and `bento-cell` (`plugins/marketing/src/tags/bento.ts:54-72`, `:356-376`); both composed fixtures repeat all four in YAML | The default differs: `top` for `card`, `bottom` for `hero`, `feature` and `step` |
| Cover settings: `content-place`, `height`, `aspect` | `card` (`packages/runes/src/tags/card.ts:62-82`), `hero` (`plugins/marketing/src/tags/hero.ts:39-56`) | Declared identically twice |
| Taxonomy: `tags` | storytelling via `taxonomyAttributes` (`plugins/storytelling/src/tags/common.ts:20-31`); all five composed fixtures by hand; four plan runes | |
| Plan identity | all five plan runes: `id` (or `name`), `status`, `created`, `modified` | `status` has a different value set in each rune (`VALID_STATUS.work`, `.bug`, …) |
| Page-section chrome defaults | `hero`, `cta`, `feature`: density `full`, width `full`, elevation `flush`, content measure `anchored` | Universal attributes, not declared ones |

**Why compositions repeat them.** Composition frontmatter accepts only `tag`, `aliases`,
`description`, `attributes`, `content`, `schema`, `registers`, `metaFields`, `blocks` and
`provides` (`packages/runes/src/lib/composition.ts:1014-1025`). There is no `base` key, so
the composed `realm` and `faction` declare the four split attributes in full, and pass each
one through to `card` by hand.

### What already reuses itself

- **The page-section header** (eyebrow, headline, blurb) is the most repeated pattern:
  `pageSectionProperties` has 21 call sites, and 17 of those runes rebuild the header from
  rendered nodes. A composition placing `section` gets the header from `section`'s own
  content model (`packages/runes/src/tags/section.ts:35-43`). No shape is needed; what blocks
  it is structured data crossing the section boundary ({% ref "SPEC-146" /%}).
- **Small child runes** (`timeline-entry`, `itinerary-stop`, `cast-member`, the
  `*-section` runes) mostly disappear: in a composition they become `each` items placed into
  primitives.
- **Date prefixes split off headings** by `headingExtract` regexes in `timeline` and
  `itinerary-day` (`plugins/business/src/tags/timeline.ts:106`,
  `plugins/places/src/tags/itinerary.ts:106`), and by hand in `changelog`, are
  {% ref "SPEC-166" /%}'s date kind. `headingExtract` could name a value kind instead of a
  regex; that is SPEC-166's to decide.

## Decisions

### D1 — a preset is a registered, named group of attribute declarations

The registry exists: `registerAttributePreset(record, { name, description })` in
`packages/runes/src/attribute-presets.ts`, used by core's split preset
(`packages/runes/src/tags/common.ts:49`) and storytelling's taxonomy preset. It is keyed by
the record object, and `name` is display text ("split layout"). A preset gains a stable `id`
that a definition can name:

```ts
registerAttributePreset(splitLayoutAttributes, {
  id: 'split',
  name: 'split layout',
  description: 'Where the media zone sits and how the two zones share the row.',
});
```

- **Core and plugins define presets**, in TS, as today. A site's `runes/` directory can use
  them but not define them. A preset is a reviewed, shared declaration, not a local macro.
- **The initial set** is what the measurement supports: `split` (exists), `cover` (new:
  `content-place`, `height`, `aspect`, from `card` and `hero`), and `taxonomy` (exists in
  storytelling; it moves to core because the plan runes use `tags` too).
- **Plan presets are decided when the plan runes convert** ({% ref "SPEC-152" /%}), under D4's
  rule.

### D2 — a definition names its presets, and may override only a default

```yaml
presets: [split, taxonomy]
attributes:
  name:  { type: string, required: true }
  type:  { type: string }
  scale: { type: string }
```

A rune that needs a different default overrides only that, which the measurement shows is
needed (`hero`'s `bottom` against `card`'s `top`):

```yaml
presets:
  split: { media-position: bottom }
```

1. **Only `default` can be overridden.** Type, values, `required` and descriptions stay the
   preset's. A rune that needs different values needs its own attribute, not a modified
   preset. This is what keeps one preset meaning one thing.
2. **An override value must be one of the preset's values.** Overriding a default with a value
   the preset does not accept is an error at construction.
3. **Collisions are errors.** An attribute declared both by a preset and in `attributes`, or
   by two presets, is reported at construction, naming both sources.
4. `presets` is added to `DEFINITION_KEYS`. Native runes keep `base:` and are unaffected.

### D3 — a template forwards a preset to the rune it places

Today's `realm` template:

```md
{% card media-position=$attrs["media-position"] media-ratio=$attrs["media-ratio"] valign=$attrs.valign collapse=$attrs.collapse %}
```

With forwarding:

```md
{% section forward="split" media="cover" %}
```

- **`forward` is resolved during expansion**, like {% ref "SPEC-145" /%} D30's conditionals.
  It becomes one attribute per member of the preset, valued from `$attrs`, and is removed. A
  member with no value (not set and no default) is left out, so the placed rune's own default
  applies.
- **`forward` may name several presets**, comma-separated.
- **Two checks at construction:** the definition must declare every preset it forwards, and the
  placed rune must accept every attribute of it. Forwarding `split` to `details` is an error
  naming both runes.
- An attribute written explicitly beside `forward` on the same tag takes precedence, so a
  template can still pin one member.

### D4 — a preset holds only attributes that are identical wherever it is used

The measurement found two groups that look like presets and are not:

- **Plan identity.** `status` is on every plan rune, but with a different value set in each.
  A plan preset may hold `id` and `tags`; `status` stays with each rune. **If it varies, it
  is not in the preset.** D2's default override is the only allowed variation.
- **Page-section chrome defaults.** The density, width, elevation and content-measure defaults
  shared by `hero`, `cta` and `feature` are universal attributes and describe appearance, not
  input. They belong to {% ref "SPEC-159" /%}'s composite intents and SPEC-145 D14's default
  mechanism. A preset never sets a universal attribute.

### D5 — the resolved schema is what every tool sees

- After construction, the rune's schema holds every preset attribute as if written by hand.
  Contracts, `inspect` and the schema-derived attribute tables are unchanged.
- **`refrakt reference` groups attributes by preset**, as it does for a native rune's `base`
  today (`packages/runes/src/reference.ts:672-679`). That code reads one base record per
  schema (`schemaBasePresets`); it becomes a list.
- An overridden default is shown with the preset's: "default: bottom (preset: top)".

### D6 — a shared shape is deferred

The three identical clusters cover about ten first-party runes. Two facts make a mechanism
unnecessary now:

- **A plugin can share a template already.** A definition can ship as a string in a TS module
  (SPEC-160 D3), so the plan plugin can build five definitions from one template string, and
  storytelling three. Each rune still gets its own contract.
- **Nobody outside the first-party plugins has asked for it.** A shape mechanism would serve
  site `runes/` directories, where there is no evidence of the need.

A shape would also need parameters for every cluster beyond the first three, which is the
template language ADR-036 warns against.

**Revisit when** a site author or third-party plugin needs to share a template between its own
runes, or a fourth fully identical cluster appears. The measurement above is the baseline.

### D7 — the blockers found on the way belong elsewhere

The measurement found that compositions are held back more by what the composition parser and
the generated config cannot express than by repetition:

| Gap | Where | Runes it blocks |
|---|---|---|
| No `delimited` content model (zones split by `---`) | `composition.ts:1349-1352` accepts only `sequence` and `sections` | `hero`, `feature`, `step`, `recipe`, `playlist` |
| No conditional (`when`) content model | rejected at `composition.ts:262-266` | `steps`, `itinerary`, `symbol` |
| No `implicitSection` | not in the sections keys (`composition.ts:1329-1339`) | `itinerary` |
| Generated config carries only `modifiers`, `metaFields`, `blocks`, `provides` | `composedRuneConfig`, `composition.ts:1428-1455` | `checklist` (`work`, `bug`), `sequence` (`timeline`, `itinerary`, `plot`), `mediaSlots`, chrome defaults |

These need their own spec. They are recorded here because the measurement found them, not
decided. *Examined in {% ref "SPEC-169" /%}: `delimited` and `implicitSection` are accepted,
`when` is not needed, `checklist` is not a gap, and each config feature has another home.*

### D8 — within one definition, reuse is a fragment

Writing out a full `recipe` with two {% ref "SPEC-145" /%} D15 templates (`standard` and
`cover`) showed the cost D15 accepted: the metadata list and the ingredients, method and tips
blocks were written twice, about twenty lines each time. D6 defers sharing across runes; this
is sharing **within one file**, which raises none of D6's questions.

```md
---
# …frontmatter as before, with templates: { by: layout }…
---

{% fragment name="photo-and-header" %}
	{% slot name="photo" /%}

	---

	{% slot name="eyebrow" /%}
	{% slot name="headline" /%}
	{% slot name="blurb" /%}
{% /fragment %}

{% fragment name="body" %}
	{% deflist %}
		- **{% t key="prep-time" %}Prep time{% /t %}:** {% field name="prepTime" /%}
		- **{% t key="servings" %}Servings{% /t %}:** {% field name="servings" /%}
	{% /deflist %}

	{% if $slots.ingredients %}
		## {% t key="ingredients" %}Ingredients{% /t %}

		{% slot name="ingredients" /%}
	{% /if %}

	…method and tips…
{% /fragment %}

## standard

{% section forward="split" media="cover" %}
	{% partial file="#photo-and-header" /%}
	{% partial file="#body" /%}
{% /section %}

## cover

{% section forward="split" media-position="cover" media="cover" %}
	{% partial file="#photo-and-header" /%}
{% /section %}

{% section %}
	{% partial file="#body" /%}
{% /section %}
```

The templates now say only what differs between them: one section, or a cover band followed by
a body section.

1. **Declared with `{% fragment name="…" %}`**, before the first template heading, outside any
   template. In a single-template file, fragments come first and the rest is the template.
2. **Used with Markdoc's own `{% partial %}`, with `#` before the name**, read as "in this
   file". Authors already know `{% partial file="cta.md" /%}` from `_partials/`
   (`site/content/docs/authoring/partials.md`), so using a fragment needs no new tag.
3. **Resolved during expansion**, like D3's `forward` and SPEC-145 D30's conditionals. The
   fragment's content replaces the `partial` tag before any placed rune reads its content, so
   `section` sees the `---` and the header paragraphs as if written inline. Slots, `$attrs`,
   `$each`, `$slots`, `t` and `field` inside a fragment behave as in the template, and D30
   conditionals inside it are resolved after the splice.
4. **Placement is checked per template, after expansion.** Using `#body` in both templates is
   fine; using it twice in one template places its slots twice, which is SPEC-145 D11's
   existing error, now naming the fragment.
5. **Construction errors:** an unknown fragment, a fragment named twice, and a fragment that
   uses itself directly or through another. An unused fragment is a warning.
6. **Tools show expanded templates only.** `inspect`, `contracts` and the reference never show
   fragments, which are an authoring convenience, not output. An error inside a fragment
   reports the fragment's line.

**Deliberately left out:**

- **Parameters.** Markdoc's `partial` takes `variables={…}`. Allowing it would make a fragment
  a function, which is the template language ADR-036 warns against. A fragment sees exactly the
  bindings of the template that uses it. Two places that need different content use two
  fragments, or the template's own conditionals.
- **Fragments from other files.** `file="shapes/profile.md#body"` is D6's deferred shared
  shape. Keeping fragments file-local means a definition stays readable on its own, and the
  syntax leaves room to extend later.
- **Template inheritance** ("`cover` is `standard` with the header replaced"). That would define
  a template's output partly somewhere else, implicitly, which is the problem ADR-042 removed
  at the theme level. A fragment is explicit: every template lists what it places.

**Why not one template with a conditional?** SPEC-145 D30 resolves
`{% if equals($attrs.layout, "cover") %}` at expansion, so it would work. But D15 rejected
conditional branches as template selection because tools would see one assembly where there
are two, and D30 rule 3 counts a slot placed in both branches as placed twice. Fragments keep
D15's separate, inspectable templates and remove the repetition.

**Open:** the declaration tag's name. `fragment` reads well. A block form of `partial`
(`{% partial name="…" %}…{% /partial %}`) would use one tag for both, but overloads a
Markdoc built-in.

## Incidental findings

Recorded so they are not lost, for separate handling:

- **`howto`'s `sentimentMap` never matches.** Its keys are `beginner`, `intermediate` and
  `advanced` (`plugins/learning/src/config.ts:40`), while the `difficulty` attribute accepts
  only `easy`, `medium` and `hard` (`plugins/learning/src/tags/howto.ts:14`, `:67`). No
  difficulty value gets a sentiment. `recipe`'s map uses the right keys. This is a bug.
- **SPEC-152's "byte-identical four ways" is wrong.** `work`, `bug` and `decision` place an
  `intro` slot that `spec` and `milestone` do not (`plugins/plan/src/config.ts:80`, `:154`,
  `:214`, `:259`, `:290`), and `milestone` renders a `<section>` where the others render an
  `<article>`. The planned template in SPEC-152 also places only `body`, but `work`'s body
  comes from `sections`.
- **`align` has two value sets.** `section` uses `start | center | end` (default `start`),
  while `hero`, `feature` and `pull-quote` use `left | center | right` (default `center`).
  Compositions over `section` change the vocabulary for those runes.
- **Config modifiers with no attribute:** `map`'s `apiKey` (`plugins/places/src/config.ts:115`)
  and `testimonial`'s `ratingTotal`.

## Acceptance Criteria

- [ ] A registered preset has a stable `id`; `split` and `taxonomy` carry one, `taxonomy` moves to core, and a `cover` preset (`content-place`, `height`, `aspect`) exists and is used by `card` and `hero`
- [ ] A composition definition accepts `presets` as a list or as a map of default overrides, and the resolved schema holds every preset attribute
- [ ] Overriding anything but `default`, overriding with a value the preset does not accept, and declaring an attribute twice (preset and `attributes`, or two presets) are each construction errors naming the sources
- [ ] `forward="<preset>[,<preset>]"` in a template expands at expansion time to the preset's attributes valued from `$attrs`, omits members with no value, lets an explicit attribute win, and is an error when the definition lacks the preset or the placed rune does not accept its attributes
- [ ] The composed `realm` and `faction` fixtures use `presets: [split, taxonomy]` and `forward="split"`, and render byte-identically to before
- [ ] `refrakt reference` groups a rune's attributes under each preset it uses, including several presets per rune, and shows overridden defaults beside the preset's
- [ ] No preset declares a universal attribute
- [ ] Site `runes/` definitions can use presets and cannot register them
- [ ] A definition may declare `{% fragment name="…" %}` blocks before its first template, and `{% partial file="#name" /%}` splices one in during expansion, before any placed rune reads its content
- [ ] Slot placement is counted per template after fragments expand; a fragment used twice in one template reports a double placement naming the fragment
- [ ] An unknown fragment, a duplicate fragment name and a fragment cycle are construction errors; an unused fragment is a warning; an error inside a fragment reports the fragment's line
- [ ] A `partial` with `variables`, or a `#` reference to another file, inside a definition is a construction error
- [ ] `inspect`, `contracts` and the reference show expanded templates only
- [ ] A two-template `recipe` fixture using fragments renders identically to the same definition written without them

## References

- {% ref "SPEC-145" /%}: D14 chrome defaults, D26 slots, D30 expansion-time resolution.
- {% ref "SPEC-146" /%}: structured data across a placed primitive, which blocks the header.
- {% ref "SPEC-152" /%}: the plan runes' composition, corrected above.
- {% ref "SPEC-159" /%}: composite intents, the home for chrome defaults.
- {% ref "SPEC-160" /%}: `section` as the base, and definitions as strings in TS modules (D3).
- {% ref "SPEC-166" /%}: the date kind that `headingExtract` regexes duplicate.
- {% ref "ADR-036" /%}: why a parameterised shape is not proposed.
- {% ref "ADR-042" /%}: the list of composition candidates measured.

{% /spec %}
