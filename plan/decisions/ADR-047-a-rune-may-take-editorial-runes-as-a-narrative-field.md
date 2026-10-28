{% decision id="ADR-047" status="accepted" date="2026-10-23" source="SPEC-160" tags="runes, composition, content-model, content-boundaries, recipe, authoring" %}

# A rune may take editorial runes as a narrative field

> **Accepted on 2026-10-28**, with one amendment to decision 1: the narrative field is inferred
> from its match, and the "one field" and "never published" rules are checked when the definition
> loads ({% ref "WORK-674" /%}). The guide's rewrite does not wait for `recipe`
> ({% ref "WORK-675" /%}), because a site's own composed rune can declare the field today.

## Context

The rune authoring guide's "Content boundaries" section
(`site/content/extend/rune-authoring/patterns.md`) says a rune's content model includes exactly
what it reinterprets. Content that would render the same inside or outside the rune belongs on the
page. It gives three tests:

1. Does the rune give this content new meaning?
2. Does it map to a structured-data field?
3. Is the rune still portable without it?

For `recipe`, it puts "story, editorial, famous quotes" outside. A recipe is a semantic island in
surrounding page prose.

Composition changes the premise of test 1. When a rune's layout was fixed rune CSS, prose inside
it could only be appended, so including it bought coupling and nothing else. A composition's
template is a layout language. Prose inside the rune can be placed *between* its parts, which
prose outside it can never be. The common food-blog layout cannot be built today:

- the recipe's name, image and times on top;
- the story;
- a card with the ingredients and method.

The top belongs to the recipe, so the story has to sit between two parts of the rune.

Two constraints still hold, and one is new:

- **The grammar would collide.** Inside `{% recipe %}`, a list is ingredients, an ordered list is
  steps and a blockquote is a tip. A story that contains a list of grandma's favourite markets
  would have them read as ingredients. Loose prose cannot simply be allowed.
- **Structured data (test 2).** Unmapped visible content breaks neither schema.org nor search
  guidelines, as long as the published `Recipe` describes only the recipe.
- **Portability (test 3).** A recipe embedded elsewhere carries whatever it contains. Today
  nothing embeds a recipe: `@refrakt-md/learning` registers no entities, and only plan entities
  provide `sourceFile` + `extract`. The question becomes real once a composed rune can be
  embedded.

## Options Considered

### (a) Keep the rule as it is

The layout above stays impossible, or needs the name and image duplicated in a separate hero
above the story.

### (b) A dedicated pass-through tag, such as `{% story %}`

Solves the grammar collision with a tag that cannot be mistaken for anything else. Rejected in
favour of (c): it adds a rune whose only job is to be a boundary, and that brings no presentation
of its own.

### (c) Existing editorial runes as the boundary

`textblock` and `mediatext` already declare `contentModel: bodyOnly()`, so nothing inside them is
reinterpreted. They bring the presentation editorial prose wants: drop cap, lead paragraph and
columns, or an image beside the text.

## Decision

1. **A rune may declare one narrative field that accepts the editorial runes `textblock` and
   `mediatext`.** For example:

   ```yaml
   story: { match: "tag:textblock|tag:mediatext", optional: true, greedy: true }
   ```

   The resolver already supports this: `tag:NAME`, pipe-separated alternatives, and a greedy field
   that collects a run of mixed blocks in source order (`packages/runes/src/lib/resolver.ts`).

   *Amended 2026-10-28.* A field is the narrative field when its match names editorial runes and
   nothing else. That is inferred, so no new key is needed. Without it, "one narrative field"
   and decision 2 were guidance nothing could check: a definition could declare two, or map one
   in its schema table and publish the story. So a definition is rejected at load, naming the
   field, when it declares more than one such field, or when its schema row maps one.
2. **The narrative field is never mapped to structured data.** The rune's schema row describes the
   rune, not the editorial around it.
3. **Everything else the rune contains, it reinterprets.** Loose prose inside the rune remains
   outside its content model.
4. **It is opt-in per rune.** The default stays a semantic island. Runes with an editorial layout,
   such as `recipe`, `howto` and possibly `event`, declare the field when they become compositions.
5. **Its place in the source is fixed; its place on the page is the template's.** For `recipe`,
   the field sits after the blurb and before the ingredients. The blocks must be consecutive,
   because a `sequence` model matches in order.

## Rationale

- **It enables layouts that composition is meant to enable**, without weakening the grammar: an
  editorial rune is a self-contained island inside the rune.
- **No new rune and no parser change.** The boundary is a rune authors already know.
- **It is additive.** A `textblock` inside a recipe is a `content-unmatched` error today, so no
  page that builds now changes.

## Consequences

- The "Content boundaries" section of the authoring guide is rewritten: the three tests stay, and a
  fourth case is added, an editorial rune as a declared narrative field, with the recipe layout as
  its example. The "What goes where" table gains a column or note for it.
- A recipe composition (SPEC-160 D5) can declare `story`. Until then, nothing changes.
  *Amended 2026-10-28:* the guide's rewrite is not tied to `recipe`. A site's own composed rune
  can declare a narrative field today, so the guide says how ({% ref "WORK-675" /%}).

## Open questions

- **How a rune away from its own page shows its narrative.** {% ref "SPEC-178" /%} proposes an
  answer. In full (`expand`, a drawer preview), the rune renders through its canonical template,
  so the narrative appears where the template places it. As a summary (a popover, a hover card or
  a collection), it renders through a preview template that reads the registration and places no
  slots, so the narrative does not appear. This open question closes when SPEC-178 is accepted.

## References

- {% ref "SPEC-160" /%}: D5, `recipe` over `section`.
- {% ref "SPEC-177" /%}: D5 and D6, every slot placed and data shown.
- {% ref "SPEC-178" /%}: entity previews.
- {% ref "ADR-045" /%}: a theme may arrange a composed rune.

{% /decision %}
