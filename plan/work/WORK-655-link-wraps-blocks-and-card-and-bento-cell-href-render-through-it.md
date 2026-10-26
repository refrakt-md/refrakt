{% work id="WORK-655" status="ready" priority="medium" complexity="complex" source="SPEC-160" tags="runes, primitives, link, accessibility, card, bento, engine" milestone="v0.43.0" %}

# link wraps blocks, and card and bento-cell href render through it

Only `card` and `bento-cell` can make a whole region a link, each through its own `href`.
Both stretched overlays are `aria-hidden="true" tabindex="-1"`, so keyboard and screen-reader
users cannot reach them. {% ref "SPEC-160" /%} D8 extends the existing `link` tag to wrap blocks,
and both `href` attributes become shorthand that renders through it.

## Acceptance Criteria

- [ ] `{% link %}` accepts block content and renders a real `<a>` around it when it holds no links, buttons or form controls
- [ ] The choice between wrap and stretch is made in the identity transform, so links added later (entity auto-links, resolved `{% ref %}`) are seen; a test asserts that a `link` around content that gains an auto-link in `postProcess` renders the stretched form, with no nested `<a>`
- [ ] The schema emits a documented marker for the engine (an element or attribute carrying `href`, with no `data-rune`), and the marker never reaches the rendered HTML
- [ ] When the content is interactive, `link` renders a stretched `<a data-name="link">`, focusable and labelled by `aria-label` when given, else by the content's title slot (`aria-labelledby`). When the content is a single rune, the anchor goes inside that rune's root; when it is several blocks or plain prose, the engine wraps them in one positioned `<div>` that holds the anchor. Both cases are tested
- [ ] `link` emits no `data-rune`, and a test asserts that a schema property inside a `link` still publishes
- [ ] An empty `href` renders the content unchanged
- [ ] `card`'s and `bento-cell`'s `href` render through `link` and are not deprecated. **The shorthand always takes the stretched form**, so the rune's root stays the grid item and its `>` child selectors keep matching (`bento-cell`'s `grid-column` / `grid-row` span and `> .rf-bento-cell__content` split rules would break under an outer or inner wrapping `<a>`)
- [ ] Skeleton gets the shared rules: the stretched anchor's positioning (replacing `.rf-card__link` and `.rf-bento-cell__link` in their rune CSS) and, for the wrap form, a reset so a wrapped block does not inherit link colour and underline. Lumina's `.rf-card:has(.rf-card__link):hover` still matches, or is moved to the shared selector
- [ ] The changeset says that linked cards and bento cells are now reachable by keyboard and screen readers, one tab stop per card
- [ ] The CSS coverage test passes, and contracts are regenerated on both copies and the diff reviewed

## Approach

- Today's overlays are built in `packages/runes/src/tags/card.ts` and
  `plugins/marketing/src/tags/bento.ts`, and positioned by `packages/skeleton/styles/runes/card.css`
  and `bento.css`.
- Wrap and stretch are chosen in the engine because the engine is the first stage that sees links
  added by `postProcess`. This is a new kind of engine pass, over an element that is not a rune,
  which is why the item is rated complex.

## References

- {% ref "SPEC-160" /%}: D8.
- {% ref "SPEC-145" /%}: D19 (name-resolution boundaries).

{% /work %}
