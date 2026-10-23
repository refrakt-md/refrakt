{% spec id="SPEC-178" status="draft" tags="composition, template, context, embed, drawer, popover, structured-data, theme" %}

# Context templates for composed runes

## Summary

A composed rune renders through one template today, wherever it appears. A recipe in a drawer
preview or a popover would have the same layout as on its own page, and every slot placed
({% ref "SPEC-177" /%} D5). This spec gives a composed rune templates for the **context** it is
rendered in:

- context is a second template axis, chosen by the system, not by the author;
- a variant can be its own file, `recipe.popover.md`, or a tag inside the definition;
- themes and sites layer variants the way SPEC-177 layers replacements;
- a non-canonical context may omit slots, because it publishes no structured data and links to
  the canonical page.

## Prerequisites

| Needs | From | State on 2026-10-23 |
|---|---|---|
| templates as tags, and multi-axis selection | {% ref "SPEC-168" /%} D9 | draft; not implemented |
| theme and site templates | {% ref "SPEC-177" /%} | draft |
| a composed rune that can be embedded | nothing yet: no composed rune sets `embed` or `extract` | not planned |
| embedded content that publishes no structured data | {% ref "BUG-045" /%} | reported |
| popover | {% ref "SPEC-174" /%} | draft |

## What exists, measured

- **Embedding is `expand`.** `ref preview="drawer"` resolves to a drawer whose body is
  `{% expand "X" /%}` (`packages/runes/src/xref-preview-resolve.ts`). Expand looks the entity up
  in the registry, gets its AST through `embed()` or `sourceFile` + `extract()`, and re-transforms
  it with the site config (`packages/runes/src/expand-pipeline.ts`). Only plan entities are
  embeddable today.
- **A collection does not render a rune's body.** It renders each item through a body template
  the site writes, from the entity's registered data (`packages/runes/src/collection-resolve.ts`).
  Collections are not a context in this spec.
- **Templates are selected by one attribute** (SPEC-168 D9), with multi-axis selection shaped
  (`templates: { by: [layout, density] }`) and deferred until "a rune in which two attributes each
  change which slots are placed where". A context variant is that case.
- **JSON-LD is harvested after `postProcess`** (`packages/content/src/site.ts`), so embedded
  content is part of the host page's harvest ({% ref "BUG-045" /%}).

## Decisions

### D1 — context is a template axis the system chooses

| | `layout` | context |
|---|---|---|
| Chosen by | the author | where the rune is being rendered |
| Is it input? | yes, so a theme cannot add values ({% ref "ADR-045" /%}) | no; it is never authored |
| Coverage | exact: every value has exactly one template | fallback: a missing variant uses the `page` template |

A template is keyed by (layout, context). The context is not an attribute and cannot be written
on the rune.

### D2 — a small, closed vocabulary

- `page`: the rune on its own page. The default, and the only canonical context.
- `embed`: the rune inlined into another page by `expand`, including a drawer preview.
- `popover`: the rune in a small anchored surface ({% ref "SPEC-174" /%}).

The pipeline sets the context when it renders a rune somewhere other than its own page. Expand
passes it into the transform of the embedded subtree. A rune placed inside another rune on its
own page is still `page`; nesting is the density cascade's concern, not this spec's.

Adding a context is a spec change, not configuration, so tooling can list every context there is.

### D3 — a variant is a file or a tag, and both fill the same table

- **A file beside the definition:** `recipe.popover.md` next to `recipe.md`. It has SPEC-177 D1's
  shape: a body and optionally `defaults`, with no input. A variant file declaring `attributes`,
  `contentModel`, `schema`, `registers`, `provides`, `presets`, `tag` or `aliases` reports
  `template-override-input`.
- **A tag inside the definition:** `{% template context="popover" %}…{% /template %}`, combinable
  with the layout selector (`{% template layout="cover" context="embed" %}`).
- **Choosing between them.** A tag can use the definition's private fragments
  ({% ref "SPEC-168" /%} D8); a file cannot. A file is the natural unit when the variant is owned
  separately, as a theme's is.

### D4 — themes and sites layer variants per (rune, context)

`templates/recipe.popover.md` in a site, or in a theme's `templates` directory, layers by
SPEC-177 D4: site, then theme, then definition, for each (layout, context) pair. A theme can ship
a recipe popover without shipping a page template.

### D5 — a non-canonical context may omit slots

SPEC-177 D5 requires every slot to be placed, because leaving content out changes what the rune
publishes and contains. That reason holds for the canonical rendering. A preview is not one.

**In a non-canonical context (`embed`, `popover`), a template may omit slots, provided that:**

1. the rendering publishes no structured data ({% ref "BUG-045" /%}'s fix applies to every
   non-canonical context), and
2. it carries a link to the entity's canonical page.

The checks of SPEC-177 D5 still run on the `page` template, and on every variant for unknown
slots, fields and runes. `template-override-unplaced` is not reported for a non-canonical variant.

### D6 — tooling shows each context

- `refrakt inspect recipe --context popover` renders through the variant, and says which level
  supplied it, or that it fell back to `page`.
- `refrakt contracts` records each declared variant as its own expansion.
- `refrakt reference` lists the contexts a rune has variants for.

## Open questions

- **Whether `embed` and drawer previews need different variants.** A drawer has more room than an
  inline expand. One context covers both until a rune needs them apart.
- **A narrative field in an embedded rune** ({% ref "ADR-047" /%}). With D5, an `embed` variant
  can leave the story out or place it in a disclosure. Which is the better default for `recipe` is
  a question for its composition.
- **Collections.** If a collection ever renders a rune itself rather than a site-written body
  template, it would be a fourth context.

## Acceptance Criteria

- [ ] A composed rune's templates are keyed by (layout, context); a missing context variant falls back to the `page` template
- [ ] The context vocabulary is `page`, `embed` and `popover`; it cannot be written as an attribute
- [ ] `expand` and drawer previews render an embedded composed rune with context `embed`
- [ ] A variant can be a file (`<rune>.<context>.md`) or a `{% template context="…" %}` tag; a variant file declaring input reports `template-override-input`
- [ ] Site and theme `templates/` directories layer variants per (rune, layout, context)
- [ ] A non-canonical variant may omit slots, publishes no structured data and links to the canonical page; the `page` template keeps SPEC-177 D5's checks
- [ ] `inspect --context`, `contracts` and `reference` show the variants and where each comes from
- [ ] A fixture recipe has a `popover` variant that places the name, image and times only, with a link to its page and no JSON-LD

## References

- {% ref "SPEC-168" /%}: D8 fragments, D9 templates and multi-axis selection.
- {% ref "SPEC-177" /%}: replacements, layering and the every-slot rule.
- {% ref "ADR-045" /%}: what a theme may change.
- {% ref "ADR-047" /%}: a narrative field, whose embedded rendering this spec decides.
- {% ref "SPEC-066" /%}: expand.
- {% ref "SPEC-174" /%}: popover.
- {% ref "BUG-045" /%}: structured data in embedded content.

{% /spec %}
