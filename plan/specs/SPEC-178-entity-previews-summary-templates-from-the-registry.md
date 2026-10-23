{% spec id="SPEC-178" status="draft" tags="composition, template, preview, registry, embed, drawer, popover, structured-data, theme" %}

# Entity previews: summary templates from the registry

## Summary

A registered entity can be shown in two ways away from its own page:

- **in full**, by `expand` or a drawer preview, rendered through its canonical template;
- **as a summary**, in a popover, a hover card or a collection, rendered through a **preview
  template** whose input is the entity's registration, not its source.

This spec defines the preview template:

- a definition's `<rune>.preview.md` beside its `<rune>.md`;
- written in the composition template language, reading `$attrs` and `field` from the
  registration, and placing no slots;
- sharing fragments with the canonical template when they use only attributes and fields;
- layered by site, theme and definition like {% ref "SPEC-177" /%}'s replacements;
- publishing no structured data, by construction.

It also gives every composed rune an automatic `embed()`, so it can be shown in full without an
extractor of its own.

## Why two renderings, and not a context axis

An earlier draft of this spec gave the composition template a second selection axis, *context*
(`page`, `embed`, `popover`), with a rule that a non-canonical variant may omit slots. That was
dropped. Its input was still the author's AST, so every preview was an `expand` and carried
expand's costs:

- the source re-read;
- headings scoped to avoid id collisions;
- cycle detection;
- structured data that must be stripped ({% ref "BUG-045" /%}).

It also needed an exception to SPEC-177 D5's every-slot rule.

A summary needs none of this. The registry already holds what a summary shows. A template that
reads the registration has no slots to omit and no schema row to publish.

**Why the registration is not made the same as the AST input.** Storing slot ASTs in the
registry would make the two templates one, but:

- **The registry is a query index.** Collections filter and sort on it, and so do
  {% ref "SPEC-138" /%}'s `field:value` grammar, the MCP and plan tools, and editor autocomplete.
  They need small values that can be serialised.
- **An author's AST rendered on another page is an `expand`**, with relative URLs, heading ids,
  cycles and structured data to handle. That machinery exists, and drawers use it.
- **Slots are private input.** Slot and fragment names are private ({% ref "SPEC-168" /%} D8,
  {% ref "ADR-045" /%}). The registration is the entity's declared public contract. Making slots
  registry fields would turn every slot rename into a breaking change for every query.

So the two renderings share their **vocabulary**, not their storage.

## Prerequisites

| Needs | From | State on 2026-10-23 |
|---|---|---|
| fragments, `{% partial file="#…" %}` | {% ref "SPEC-168" /%} D8 | draft; not implemented |
| node-sourced registration values | {% ref "SPEC-145" /%} D10b | decided |
| site and theme template layering | {% ref "SPEC-177" /%} D4 | draft |
| a tag form of `image` | this spec, D6 | `link` has one; `image` does not |
| block `link` | {% ref "SPEC-160" /%} D8 | planned for v0.43.0 |
| popover | {% ref "SPEC-174" /%} | draft |

## What exists, measured

- **Per-entity templates exist, for collections.** A collection's body is captured as source
  before transform, then re-parsed and transformed once per entity in `postProcess`, with `$item`
  bound to the registration (`packages/runes/src/deferred-body.ts`, `collection-resolve.ts`).
  A preview template is the same mechanism, shipped by the rune instead of written by the site.
- **Full embedding is `expand`.** `ref preview="drawer"` resolves to a drawer whose body is
  `{% expand "X" /%}` (`packages/runes/src/xref-preview-resolve.ts`). Expand gets the entity's AST
  through `embed()` or `sourceFile` + `extract()` and re-transforms it
  (`packages/runes/src/expand-pipeline.ts`). Only plan entities provide either today.
- **Registration keys usually are the rune's own names.** The composed `lore` registers
  `[category, spoiler, tags, { name: title }]`; the composed `realm` renames one,
  `{ realmType: type }`.
- **Templates can build links from variables** (`{% link href=$item.url %}`), but not images:
  `image` is a node only.

## Decisions

### D1 — two renderings away from the entity's own page

| | Summary | Full |
|---|---|---|
| Template | `<rune>.preview.md` | `<rune>.md`, the canonical template |
| Input | the registration | the rune's AST, through `embed()` (D5) |
| Used by | popovers, hover cards, a collection without a body of its own | `expand`, drawer previews |
| Structured data | never published | published only on the entity's own page ({% ref "BUG-045" /%}) |

A collection that writes its own body keeps it. The preview template is the default, not an
override.

### D2 — a preview template reads the registration through the template language

- `$attrs.<name>` and `{% field name="<name>" /%}` resolve from the registration's data, as they
  resolve from the instance in a composition template. No separate `$item` dialect.
- `$entity` holds what the registry adds: `$entity.id`, `$entity.type` and `$entity.url`, the
  canonical URL resolved by the same chain `xref` uses.
- **No slots.** A `{% slot %}` in a preview template reports `preview-slot`, naming the slot and
  suggesting the full rendering for content that needs it.
- `t`, `if` and `link` work as in a composition template.

### D3 — registration keys are the rune's own names

Each `registers.entity.data` key must name one of the rune's attributes or content-model fields.
An unknown key reports `register-unknown-name`. A rename (`{ realmType: type }`) is still allowed,
and the preview reads it by its registered name. `reference` lists what each rune registers, so
the preview's vocabulary is visible.

### D4 — fragments are shared when they use only attributes and fields

A preview file may use its definition's fragments with `{% partial file="#name" /%}`
(SPEC-168 D8). A fragment that places a slot reports `preview-slot` when the preview uses it,
naming the fragment. The canonical template and the preview then cannot drift on the parts they
share.

### D5 — every composed rune can be embedded

A composed rune's registration gets an automatic `embed()` that returns its invocation node, kept
by reference during registration, much as plan's `extract` finds its node in the re-parsed file. A
drawer preview of any composed entity works without the rune writing an extractor. Native runes
and plugin entities keep `embed` / `sourceFile` + `extract` as today.

### D6 — `image` gets a tag form

`{% image src=$attrs.photo alt=… /%}`, matching what `link` already has. A preview has no
author's Markdown image to place, only a registered source.

### D7 — files are found and layered like replacements

- `<rune>.preview.md` sits beside `<rune>.md` in a rune directory, or in a site's or theme's
  `templates/` directory, layered site, then theme, then definition (SPEC-177 D4).
- A preview carries no schema row and places no slots, so a theme may ship one for any rune
  without crossing {% ref "ADR-045" /%}'s boundary.
- A preview file declaring input (`attributes`, `contentModel`, `schema`, `registers`, …)
  reports `template-override-input`.
- A rune with no preview at any level gets a built-in fallback: the registered name linked to
  `$entity.url`.

### D8 — a preview links to its entity

A preview is a summary, so the reader must be able to reach the canonical page. The popover or
hover trigger is that link. Where a preview is rendered with no trigger, as in a collection, the
engine wraps it in `{% link href=$entity.url %}` unless the template already links to it.

## Example: a recipe and its preview

The canonical definition, abridged. The `story` field is {% ref "ADR-047" /%}'s.

```md
---
attributes:
  prepTime:   { type: string }
  cookTime:   { type: string }
  servings:   { type: number }
  difficulty: { type: string, matches: [easy, medium, hard] }
content:
  type: delimited
  delimiter: hr
  zones:
    - name: media
      fields:
        photo: { match: image, optional: true }
    - name: content
      primary: true
      fields:
        headline:    { match: heading }
        blurb:       { match: paragraph, optional: true }
        story:       { match: "tag:textblock|tag:mediatext", optional: true, greedy: true }
        ingredients: { match: "list:unordered", optional: true }
        steps:       { match: "list:ordered", optional: true }
        tips:        { match: blockquote, optional: true, greedy: true }
schema:
  type: Recipe
  properties: { headline: name, photo: image, prepTime: prepTime, cookTime: cookTime }
registers:
  entity:
    idFrom: headline
    data: [headline, blurb, photo, prepTime, cookTime, servings, difficulty]
---

{% fragment name="facts" %}
	{% deflist %}
		- **{% t key="prep-time" %}Prep{% /t %}:** {% field name="prepTime" /%}
		- **{% t key="cook-time" %}Cook{% /t %}:** {% field name="cookTime" /%}
		- **{% t key="servings" %}Serves{% /t %}:** {% field name="servings" /%}
	{% /deflist %}
{% /fragment %}

{% section media-position="top" media="cover" %}
	{% slot name="photo" /%}

	---

	{% slot name="headline" /%}
	{% slot name="blurb" /%}
	{% partial file="#facts" /%}
{% /section %}

{% slot name="story" /%}

{% card %}
	## {% t key="ingredients" %}Ingredients{% /t %}
	{% slot name="ingredients" /%}

	## {% t key="method" %}Method{% /t %}
	{% slot name="steps" /%}

	{% slot name="tips" /%}
{% /card %}
```

`recipe.preview.md`, beside it:

```md
{% section media-position="start" media="thumbnail" %}
	{% image src=$attrs.photo alt="" /%}

	---

	# {% field name="headline" /%}

	{% field name="blurb" /%}

	{% partial file="#facts" /%}

	{% link href=$entity.url %}{% t key="view-recipe" %}View recipe{% /t %}{% /link %}
{% /section %}
```

What each part shows:

- **Shared vocabulary.** `headline`, `photo` and `prepTime` are the same names in both files: the
  rune's attributes and fields, registered under their own names (D3).
- **Shared fragment.** `#facts` uses only fields, so the page and the preview render the same
  facts from the same source (D4).
- **No slots.** The preview cannot place `story`, `ingredients` or `steps`. Writing
  `{% slot name="ingredients" /%}` reports `preview-slot` (D2). The full recipe is a drawer away.
- **Nothing published.** The preview has no schema row. The `Recipe` is published once, from the
  recipe's own page.
- **`photo` is node-sourced.** The registration reads the image's source from the photo slot at
  transform time (SPEC-145 D10b), so the preview has a URL to place with `{% image %}` (D6).

## Open questions

- **Named variants.** One preview per rune may be enough. If a rune needs a hover card and a
  collection card that differ, consumers could select by name (`ref preview="popover"`, a
  collection's `template="card"`). Not designed until a rune needs two.
- **Registered content beyond scalars.** A preview cannot show the ingredients unless they are
  registered. Registering a short list (the first five ingredients, say) would need a list-valued
  registration source. Not designed until a preview needs it.

## Acceptance Criteria

- [ ] A `<rune>.preview.md` is loaded beside its definition and from site and theme `templates/` directories, layered site, then theme, then definition
- [ ] In a preview template, `$attrs` and `field` resolve from the registration's data and `$entity` holds `id`, `type` and `url`; a `{% slot %}` reports `preview-slot`
- [ ] Each `registers.entity.data` key names an attribute or field of the rune, or is a declared rename; anything else reports `register-unknown-name`
- [ ] A preview may use the definition's fragments; one that places a slot reports `preview-slot`, naming the fragment
- [ ] Popovers, hover cards and collections without a body render the preview; a rune with none renders its name linked to its page
- [ ] A preview publishes no structured data and always links to its entity's canonical page
- [ ] Every composed rune's registration has `embed()`, and a drawer preview of a composed entity renders its canonical template
- [ ] `{% image %}` exists as a tag, with `src` and `alt`
- [ ] The recipe example above is a fixture: its page publishes one `Recipe`, its preview shows the photo, headline, blurb and facts with no JSON-LD, and placing a slot in the preview fails

## References

- {% ref "SPEC-168" /%}: D8 fragments.
- {% ref "SPEC-177" /%}: replacements and layering.
- {% ref "SPEC-145" /%}: D10b node-sourced registration.
- {% ref "ADR-045" /%}: what a theme may change.
- {% ref "ADR-047" /%}: a narrative field, which the full rendering places and the preview does not.
- {% ref "SPEC-066" /%}: expand.
- {% ref "SPEC-160" /%}: D8 block `link`.
- {% ref "SPEC-174" /%}: popover.
- {% ref "BUG-045" /%}: structured data in embedded content.

{% /spec %}
