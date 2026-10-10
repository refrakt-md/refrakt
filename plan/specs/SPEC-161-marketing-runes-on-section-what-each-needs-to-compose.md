{% spec id="SPEC-161" status="draft" tags="runes, composition, marketing, primitives, section, seo" %}

# Marketing runes on section: what each needs to compose

{% ref "SPEC-151" /%} audited the marketing plugin against composition when the base primitive
was `card`. {% ref "ADR-041" /%} moves the base to `section`, and {% ref "SPEC-160" /%} gives
`section` the split and adds `actions`. This spec re-reads the remaining marketing runes on
that base: `testimonial`, `feature`, `pricing` with `tier`, and `steps`. For each, it says what
the composition is built from, what is missing, and what an author gives up.
It also settles one question for the business plugin's `cast-member` (D7), because its
name-over-role shape is the same as `testimonial`'s byline.

Two questions were checked by experiment rather than assumed, and the results change the plan
(see Measurements).

`hero` and `cta` are SPEC-160 D7's, and wait on its theme-class question. `bento` and
`comparison` stay plugin runes for the reasons SPEC-151 gives.

## Measurements

Both were run against `main` after v0.41.0's changes, with a throwaway composed definition
loaded through the same harness as the storytelling compositions
(`packages/content/test/composed-storytelling.ts`). Neither probe was committed.

### A composition can already publish a rating

A composed `quote-card` declared `rating` and `rating-total` attributes, a `metaFields` entry
`{ metaType: rating, rating: { total: rating-total }, condition: rating }`, a `blocks` entry
placing it, and placed it with `{% metablock name="stars" /%}` inside `{% section %}`. It
rendered the engine's shared rating widget: `<span data-meta-type="rating">` with four marks
`data-filled="true"` and one `false` for `rating=4`. With no `rating`, the block was omitted.

The same definition declared testimonial's schema table in frontmatter, with its two nested
entities: an `author` `Person` (`author → name`, `role → jobTitle`) and a `rating` `Rating`
(`rating → ratingValue`). The JSON-LD came out as
`{ "@type": "Review", "reviewBody": …, "author": { "@type": "Person", "name": "Ada" },
"reviewRating": { "@type": "Rating", "ratingValue": 4 } }`, identical at both harvest points:
the pre-engine harvest `site.ts` publishes, and after the identity transform.

**So a rating needs no new primitive.** The metadata machinery a composition already has
(SPEC-145 D7, WORK-630's `metablock`) renders it, and the schema table publishes it.

### `deflist` cannot take `definition`'s split as it stands

`deflist` reads one shape: a list item whose first inline is `**Term:**`, with a colon
(`packages/runes/src/tags/deflist.ts`, `extractTermPrefix`). A probe rendered three
feature-style items through it:

| Item | Result |
|---|---|
| `- **Fast**` then an indented description paragraph | empty `<dt>`, everything in `<dd>`, a build warning |
| `- **Typed:** Every rune is checked.` | `<dt>Typed</dt><dd>Every rune is checked.</dd>` |
| `- {% icon %} **Light**` then two description paragraphs | empty `<dt>`, everything in `<dd>`, a build warning |

`feature`'s `definition` reads all three. Its term is any leading heading, or paragraph holding
an image, an `{% icon %}` or `**strong**` text; its description is every paragraph after the
first plain one (`plugins/marketing/src/tags/feature.ts`, `isTermParagraph`). And `deflist`
renders the `definition-list` zone layout, a label/value table, where `feature` renders a grid
of items.

## Decisions

### D1 — `testimonial` composes once `section` has a portrait zone, with its author as attributes

**Built from:** `section` with a split and `media="portrait"` ({% ref "SPEC-160" /%} D2), the
rating `metablock`, and a byline `metablock` in the `stack` layout (D6).

**Its only missing prerequisite is SPEC-160 D2.** Measured part by part:

| Part | Built from | Today |
|---|---|---|
| The quote | a blockquote placed through a slot | available |
| Stars | the `rating` field shape and `{% metablock %}` | available, measured |
| `Review` / `Person` / `Rating` | a frontmatter schema table, author from attributes | available, measured at both harvest points |
| Author name and role | `metaFields` from attributes, in a byline block | available as `bar`; the stacked look needs D6 |
| `variant` | `{% if %}` around a whole `{% card %}` or `{% section %}` | available (SPEC-145 D17) |
| Round avatar | a media zone marked `data-media="portrait"` | **missing**: `section` has no media zone yet, and `card`'s cannot be marked as a portrait |

`stack` (D6) is what makes the byline look as it does today, name emphasised and role beneath;
without it the byline renders in a `bar`, which is correct but reads as one line. `pull-quote`'s
attribution (D2) is not on this path.

```md
---
tag: article
attributes:
  author:       { type: string, description: "The person quoted." }
  role:         { type: string, description: "Their role or organisation." }
  rating:       { type: number, description: "Rating out of rating-total." }
  rating-total: { type: number, default: 5 }
  variant:      { type: string, matches: [card, inline, quote], default: card }
content:
  type: sequence
  fields:
    avatar:       { match: image, optional: true }
    quote:        { match: blockquote }
    avatar-after: { match: image, optional: true }
metaFields:
  rating: { metaType: rating, rating: { total: rating-total }, condition: rating }
  author: { tag: cite, condition: author }
  role:   { condition: role }
blocks:
  rating: { fields: [rating], layout: bar }
  byline: { fields: [author, role], layout: stack }
schema:
  type: Review
  properties: { quote: reviewBody }
  entities:
    author: { type: Person, property: author, properties: { author: name, role: jobTitle } }
    rating: { type: Rating, property: reviewRating, properties: { rating: ratingValue } }
---

{% section media-position="start" media="portrait" %}
{% slot name="avatar" /%}
{% slot name="avatar-after" /%}

---

{% metablock name="rating" /%}
{% slot name="quote" /%}
{% metablock name="byline" /%}
{% /section %}
```

The two image fields are because the plugin accepts the avatar before or after the quote; both
are placed in the media zone, and an empty one renders nothing. `rating` becomes
`marks` with `metaType: rating` when {% ref "WORK-639" /%} lands.

**The author moves from content to attributes.** Today the name is the `**strong**` text of
the first paragraph and the role is what follows a dash (`testimonial.ts:81-101`), which is
why SPEC-151 found testimonial gated on {% ref "SPEC-146" /%}: a value read from content placed
inside a primitive is not reachable by the schema harvest. As attributes they ride the field
bag, and the measurement above shows them publishing. This also fixes a loss the plugin has
today: only string children of the name and role survive, so a linked company name loses its
link.

**What authors give up:** the `**Ada Lovelace** — Analyst` paragraph. The sketch above has no
catch-all field, so on a page written that way the paragraph matches nothing and
`content-unmatched` reports it, at error severity since {% ref "WORK-638" /%}. That keeps the
migration loud, and it must stay so: adding a `body` field would quietly render the paragraph
and publish no author. The fix is a codemod, since the plugin's own parser already knows the
shape and can rewrite the paragraph into `author` and `role` attributes once.

**`variant` is SPEC-159's `materiality`.** `card` is an object; `inline` and `quote` are regions.
Until `materiality` exists, the definition places `{% card %}` for `variant="card"` and
`{% section %}` otherwise, with `{% if %}` around the whole invocation, which SPEC-145 D17
allows. The duplication goes away with `materiality`.

### D2 — `pull-quote` gains an attribution

`pull-quote` takes a blockquote and has no attribution. HTML's pattern for a quote with a
source is `<figure><blockquote/><figcaption/></figure>`. `pull-quote` gains an optional
`figcaption` part, filled from a trailing paragraph inside the rune (or a `cite` attribute),
and renders as a `figure` when it has one. Without one, its output is unchanged.

**This is no longer on `testimonial`'s path.** An earlier draft had `testimonial` place its author
through `pull-quote`. The byline `metablock` (D1, D6) does that job with machinery compositions
already have, and keeps the author as structured fields the schema table reads. The attribution
stays worth doing for quotes in general: a pull-quote in an article that names its source.

**Open question:** whether the attribution should be `cite` (an attribute, structured) or a
trailing paragraph (content, free-form). An attribute is the default because it is reachable;
the paragraph form can be added if authors ask for inline links in it.

### D3 — `feature` needs `deflist` to learn the feature term, not a new content-model form

{% ref "SPEC-151" /%} recorded `feature` as needing "`definition`'s split model" and linked it to
{% ref "SPEC-147" /%}'s proposed `segmented` content model. The measurement above narrows it:
the split is a **primitive's** job, not the composition's. A core primitive may own imperative
code; only a composition must be declarative. So:

- `deflist` gains `definition`'s term shapes: a leading heading, or a paragraph holding an
  image, an icon or a bold lead with no colon, as the term; every following block as the
  description. The `**Term:**` form keeps working, and an item that matches no shape keeps
  today's empty-`<dt>` fallback and warning.
- The arrangement (grid, list, carousel) is not `deflist`'s. It comes from
  {% ref "SPEC-156" /%}'s row and ladder arrangements, placed around it.
- `feature` is then `section` with a split (`media-position` defaulting to `bottom`, as today),
  its header, and the arranged `deflist` over a `definitions` slot.

This does not replace the `segmented` model. `plot` and `storyboard` still need a content model
that splits on a boundary predicate, because their panels are the rune's own structure. It
removes `feature` from that model's critical path.

**Open question:** whether `deflist` is the right home, given that its default rendering is a
label/value table. The alternative is a separate `items` primitive sharing `deflist`'s term
detection. The deciding question is whether a feature list *is* a definition list in the HTML
sense (term and description), which it is, so `deflist` with an arrangement is the default.

### D4 — `tier` is a legitimate `card`; `pricing` waits on authored prices

A pricing tier is a discrete object, so `tier` composes over `card`, not `section`: the one
marketing rune where ADR-041's rule points the other way, and the reason `card` stays.

- **Featured** is emphasis on the card (SPEC-159's elevation or a future `prominence` value),
  replacing the `featured-tier` rune name.
- **The sign-up link** becomes `actions` (SPEC-160 D6). Today `url` is harvested from the first
  `<a>` in the tier body.
- **The feature list** stays a plain list, styled as a checklist by Lumina as it is now.
- **The price** is the blocker, as SPEC-151 D2 recorded: `parsedPrice` and `resolvedCurrency` are
  computed from the authored string. The fix is to make them authored: `price="19"
  currency="USD" period="month"`, published directly as `price` and `priceCurrency`, and a
  small `{% price %}` display rune that formats them with `Intl.NumberFormat`. Formatting at
  render is presentation, not derived data, because the schema reads the attributes. This
  also fixes a defect in the plugin: `inferCurrency` matches currency symbols only as a
  prefix, so `29 kr` publishes `USD`.

`pricing` itself is a `section` header and an arranged list of tiers. Its `Product` `name` and
`description` come from the headline and blurb, which is SPEC-151 D3's `pageSectionProperties`
case and still gated on {% ref "SPEC-146" /%} Problem 2.

**What authors give up:** the `## Pro — $19` heading shorthand, which the plugin parses into a
tier. It cannot be expressed declaratively, and keeping it means keeping the plugin rune. That
regression is the main reason `pricing` is last.

### D5 — `steps` composes as SPEC-151 found

`steps` is a `section` with a numbered sequence of `step`s, and `step` is a `section` with a
split. It has no schema table (only the `Step` typeof) and no imperative residue beyond its
conditional content model, which a definition can declare. It is the cheapest marketing
composition after SPEC-160's own `hero` and `cta`.

### D6 — a `stack` layout for blocks: a lead value with secondary values beneath

A `blocks` entry renders its fields through a layout primitive, and there are two
(`LayoutPrimitive = 'definition-list' | 'bar'`, `packages/transform/src/types.ts`): `bar`, a row,
and `definition-list`, a label/value grid. Neither draws a byline, the shape two runes already
hand-roll in their own CSS:

- `testimonial.css`: `__author-name` bold, `__author-role` small and muted, `0.125rem` below it;
- `cast.css`: `__name` semibold, `__role` small and muted, `0.125rem` below it.

`stack` is a third layout: the block's fields in a column, the first marked `data-lead`. The
skin emphasises the lead and makes the rest secondary (smaller, muted). Its contract is statable
without naming a rune ("a primary value with secondary values beneath it"), and it fits more
than people: a title over a date, a product over a price.

The engine change is one layout branch beside `bar`; the CSS is a few lines in
`skeleton/styles/dimensions/metadata.css` and Lumina's. `testimonial`'s author rules and
`cast`'s name and role rules are deleted when those runes compose.

### D7 — `cast-member` puts its name in `section`'s header, not a byline

`cast-member` could use the D6 byline too, and nothing blocks that. But in a team grid the
member is the subject of their own region, so their name is that region's heading, which is
what `section`'s header already models:

```md
{% section media-position="top" media="portrait" prominence="quiet" %}
{% slot name="portrait" /%}

---

# {% $attrs.name %}

{% $attrs.role %}
{% slot name="body" /%}
{% /section %}
```

The name becomes the headline and the role the blurb, emphasised and muted by the header styles
that exist, and `prominence="quiet"` scales it for a grid. The composed `character` already
writes its heading as `# {% $attrs.name %}`. `Person` maps `name` and `role` from attributes, as
{% ref "SPEC-149" /%} found. The portrait is SPEC-160 D2's, and an `image` attribute rendered there
still needs SPEC-149 D4's scheme resolution.

In `testimonial` the subject is the quote and the person is its source, so a heading would be
wrong there; that is the byline's case. If the two should look identical regardless, `cast-member`
can use the byline instead; the choice is presentational.

## What is new, and what it unlocks

| Capability | Kind | Unlocks |
|---|---|---|
| Rating | none needed: `metaFields` + `metablock` | `testimonial`; any rated thing |
| `pull-quote` attribution (D2) | extends a core rune | any attributed quote |
| `stack` block layout (D6) | a third layout primitive | the `testimonial` byline; any lead-over-secondary pair |
| `section` portrait zone | SPEC-160 D2 | `testimonial`, `cast-member`, `character` |
| `deflist` feature terms (D3) | extends a core rune | `feature` |
| `actions` | SPEC-160 D6 | `hero`, `cta`, `tier` |
| Authored price + `{% price %}` (D4) | new core rune | `tier`, `pricing` |
| `segmented` content model | SPEC-147 | `plot`, `storyboard` (no longer `feature`) |

## Order

1. `steps` (D5): nothing new needed once SPEC-160 D2 lands.
2. `testimonial` (D1, D6): needs SPEC-160 D2, `stack`, and the codemod.
3. `feature` (D3): needs `deflist`'s terms and SPEC-156's arrangements.
4. `pricing` and `tier` (D4): needs `actions`, `price`, and SPEC-146 for the `Product` header.

Each composition is compared with the plugin's output before it replaces anything, as
{% ref "SPEC-147" /%} D2 set: JSON-LD against the SEO baseline, rendered HTML, and every
difference explained. The plugin runes stay until that comparison is reviewed.

## Acceptance Criteria

- [ ] `testimonial` exists as a composition whose JSON-LD matches the plugin's `Review` graph (reviewBody, Person author, Rating) with the author given as attributes
- [ ] A codemod rewrites `**Name** — Role` testimonial paragraphs into `author` / `role` attributes, and is run over this repo's content
- [ ] `pull-quote` renders an attribution as `figcaption` inside a `figure`, and is unchanged without one
- [ ] `blocks` accept a `stack` layout with the first field marked `data-lead`; `testimonial`'s byline renders through it and the hand-rolled author and cast name/role CSS is deleted
- [ ] `cast-member` composes over `section` with its name as the header and its role as the blurb, publishing the plugin's `Person` graph
- [ ] `deflist` reads `definition`'s term shapes, keeps the `**Term:**` form, and `feature` composes over it with matching output
- [ ] `tier` composes over `card` with authored `price` / `currency`, publishes `Offer` price and priceCurrency, and `29 kr` publishes `SEK` (or the stated currency)
- [ ] `steps` exists as a composition matching the plugin's output
- [ ] SPEC-151's open question on `testimonial`'s author sources is closed with a pointer to this spec

## References

- {% ref "ADR-041" /%} and {% ref "SPEC-160" /%}: section as the base, `actions`.
- {% ref "SPEC-151" /%}: the marketing audit this re-reads.
- {% ref "SPEC-146" /%}: reachability, which `pricing`'s header still waits on.
- {% ref "SPEC-147" /%}: the `segmented` model, and the comparison discipline.
- {% ref "SPEC-156" /%}: the arrangements `feature` and `pricing` place their items in.
- {% ref "SPEC-159" /%}: `materiality`, which retires testimonial's `variant` switch.

{% /spec %}
