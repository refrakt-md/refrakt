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
- varying by the context the consumer requests (`popover`, `card`), never by a name in content;
- able to show lists, such as a recipe's ingredients, which a registration can now hold as plain
  text;
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

Context comes back in D9, as the selector between preview variants. There it needs no exception
to anything, because a preview has no every-slot rule.

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
- A list value (D10) renders through `field`, in the field's shape: list items, or chips for a
  field such as `tags`. `limit=n` shows the first *n* and adds a translatable "and *m* more".

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

### D9 — previews vary by context, not by name

A hover card and a collection card may want different summaries. They are selected by the
**context** the preview is rendered in, never by a name written in content.

**Why not names.** A name such as `ref preview="popover" template="compact"` is a word in content,
so it becomes a contract between a site's content and whichever theme is installed:

- after a theme switch, the name may not exist, and the content falls back without a word;
- two themes may give one name different meanings;
- a theme author cannot know which names sites use, so cannot write previews for every rune.

That is the reason {% ref "ADR-045" /%} keeps `layout` values on the definition's side: authored
values are input, and a theme cannot extend input.

**The vocabulary is closed, and refrakt owns it:**

| Context | Requested by |
|---|---|
| *(none)*: the default | any consumer with no variant of its own |
| `popover` | hover cards and `ref preview="popover"` ({% ref "SPEC-174" /%}) |
| `card` | collection and aggregate items without a body of their own |

The consumer sets the context; content cannot. A new context is a spec change, as a new universal
axis is.

**Variants are `{% template %}` blocks in the one preview file**, using SPEC-168 D9's tag:

- A block with no `context` is the default. A preview file with no blocks at all is the default.
- `{% template context="popover" %}` covers that context. A context with no block uses the
  default.
- A `context` value outside the vocabulary reports `preview-unknown-context`.
- All blocks share the definition's fragments (D4).

**Layering is per context, and the more specific template wins.** For a preview requested in
context C, the lookup is:

1. (rune, C) at the site, then the theme, then the definition;
2. if none has C, (rune, default) at the site, then the theme, then the definition;
3. if none has a default, the built-in fallback (D7).

A theme's `recipe.preview.md` containing only a `popover` block therefore replaces the popover and
inherits the rest. A definition's `popover` block survives a theme that ships only a default.
That is the order SPEC-177 D4 uses for template values. Level first, where the theme's default
would win over the definition's popover, was considered. It gives a theme complete control from
one file, but discards a rune author's tailored popover under every theme that ships a default.

**Most differences need no variant.** The engine stamps `data-preview-context` on every rendered
preview (`popover`, `card`, or `default`). A theme can make one template compact in a popover and
roomier in a card with CSS alone, including restyling every rune's popover at once. A context
block is for a different structure, meaning other fields or another arrangement, not a different
look.

### D10 — a registration can hold a list

**What exists.** The `registers` vocabulary already allows a list of strings
(`packages/runes/src/lib/registers.ts`), and the `field:value` matcher already treats an array as
membership (`packages/runes/src/field-match.ts`). But no declarative source produces one.
`readRegistersSource` reads the *first* node named after the source, as text, or else a field-bag
string. The only way to a list is the `{ json }` escape hatch. The schema table reads the same
names differently: `recipe`'s `ingredient → recipeIngredient` uses `findAllByName`, so every item
becomes one entry of the published array, while registration would keep only the first.

**The list form:**

```yaml
data:
  - headline
  - { ingredients: { list: ingredients } }
  - { tags: { list: tags, separator: "," } }
```

1. **`{ key: { list: source } }` reads every node with the source's name**, by the schema table's
   rule (`findAllByName`, bounded at nested runes), and registers each node's text. In a
   composition, a source naming a list field reads that field's items from the copy taken at
   transform time ({% ref "SPEC-145" /%} D10b).
2. **`separator` splits one string into a list**, for an attribute such as `tags`. The comma split
   that the matcher applies to any string today becomes a declared one for registered lists.
3. **It is explicit, never inferred from the count.** One ingredient registers a one-item list and
   none an empty one, so previews and filters always see the same type.
4. **Items are plain text.** No links or emphasis: the registry stays a small query index that can
   be serialised. Rich content is the full rendering's.
5. **The whole list is registered; a limit belongs to the display.** A popover may show three
   ingredients and a card five, and a registration-time limit would make `ingredients:*pancetta*`
   miss what was cut. A rune author keeps the registry small by choosing what to register, such as
   ingredients but not steps. A registration `limit` is not added until a rune needs one.
6. **The name check (D3) applies.** A key must be an attribute or field of the rune, or a declared
   rename, as with a native rune's `{ ingredients: { list: ingredient } }`. `reference` shows
   `ingredients ← every "ingredient" (list)`.

A preview shows a list through `field` with `limit` (D2). A general loop over values
(`{% each items=$attrs.ingredients %}`) would allow per-item markup, but it would be a second
iteration construct beside composition's slot-bound `each`. It is not added until a preview needs
per-item structure.

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
    data:
      - headline
      - blurb
      - photo
      - prepTime
      - cookTime
      - servings
      - difficulty
      - { ingredients: { list: ingredients } }
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

`recipe.preview.md`, beside it, with a default and a `popover` variant (D9):

```md
{% template %}
	{% section media-position="start" media="thumbnail" %}
		{% image src=$attrs.photo alt="" /%}

		---

		# {% field name="headline" /%}

		{% field name="blurb" /%}

		{% partial file="#facts" /%}

		{% link href=$entity.url %}{% t key="view-recipe" %}View recipe{% /t %}{% /link %}
	{% /section %}
{% /template %}

{% template context="popover" %}
	{% section media-position="top" media="cover" header="headline" %}
		{% image src=$attrs.photo alt="" /%}

		---

		# {% field name="headline" /%}

		{% field name="prepTime" /%} · {% field name="cookTime" /%}

		{% field name="ingredients" limit=3 /%}
	{% /section %}
{% /template %}
```

The popover's trigger is already the link to the recipe (D8), so it drops the link, the blurb and
the full facts. It keeps a photo, the name, the times and the first three ingredients, with
"and *n* more" after them (D10). `header="headline"` is
{% ref "ADR-046" /%}'s: the times line stays body, not a blurb. A collection card has no `card`
block, so it renders the default.

What each part shows:

- **Shared vocabulary.** `headline`, `photo` and `prepTime` are the same names in both files: the
  rune's attributes and fields, registered under their own names (D3).
- **Shared fragment.** `#facts` uses only fields, so the page and the preview render the same
  facts from the same source (D4).
- **No slots.** The preview cannot place `story`, `ingredients` or `steps`. Writing
  `{% slot name="ingredients" /%}` reports `preview-slot` (D2). It shows the *registered*
  ingredients, as plain text, through `field`. The full recipe is a drawer away.
- **Nothing published.** The preview has no schema row. The `Recipe` is published once, from the
  recipe's own page.
- **`photo` is node-sourced.** The registration reads the image's source from the photo slot at
  transform time (SPEC-145 D10b), so the preview has a URL to place with `{% image %}` (D6).

## Open questions

- **More contexts.** Search results and inline chips are candidates. Each is added by a spec
  change when a consumer exists to request it.
- **The matcher's comma split (follow-up).** `field-match.ts` splits any string containing a
  comma, so a scalar such as `"Salt, to taste"` matches as two values. Once registered lists are
  declared (D10), the implicit split should stop applying to them, and arguably to every string.
  Changing it can change existing `filter` results, so it is a separate item with its own
  measurement.

## Acceptance Criteria

- [ ] A `<rune>.preview.md` is loaded beside its definition and from site and theme `templates/` directories, layered site, then theme, then definition
- [ ] In a preview template, `$attrs` and `field` resolve from the registration's data and `$entity` holds `id`, `type` and `url`; a `{% slot %}` reports `preview-slot`
- [ ] Each `registers.entity.data` key names an attribute or field of the rune, or is a declared rename; anything else reports `register-unknown-name`
- [ ] A preview may use the definition's fragments; one that places a slot reports `preview-slot`, naming the fragment
- [ ] Popovers, hover cards and collections without a body render the preview; a rune with none renders its name linked to its page
- [ ] A preview file may hold a default and `{% template context="popover|card" %}` blocks; an unknown context reports `preview-unknown-context`; a context with no block uses the default
- [ ] For a context, (rune, context) is looked up at site, theme and definition before (rune, default) is; a theme file with only a `popover` block replaces that context and inherits the rest
- [ ] Every rendered preview carries `data-preview-context`, and content has no way to set the context
- [ ] A preview publishes no structured data and always links to its entity's canonical page
- [ ] Every composed rune's registration has `embed()`, and a drawer preview of a composed entity renders its canonical template
- [ ] `{% image %}` exists as a tag, with `src` and `alt`
- [ ] A `registers.entity.data` entry `{ key: { list: source } }` registers the text of every node with that name, or a list field's items in a composition, as a list; one match gives a one-item list and none an empty one
- [ ] `{ key: { list: source, separator: "," } }` splits a string source into a list
- [ ] A registered list matches in `field:value` filters by membership, and `reference` shows the list form
- [ ] `{% field name="…" limit=n /%}` renders a list value in the field's shape, the first *n* items and a translatable "and *m* more"
- [ ] The recipe example above is a fixture: its page publishes one `Recipe`; its default preview shows the photo, headline, blurb and facts, its popover the photo, headline, times and first three ingredients, both with no JSON-LD; placing a slot in the preview fails

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
