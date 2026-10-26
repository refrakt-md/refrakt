{% work id="WORK-655" status="done" priority="medium" complexity="complex" source="SPEC-160" tags="runes, primitives, link, accessibility, card, bento, engine" milestone="v0.43.0" pr="refrakt-md/refrakt#725" %}

# link wraps blocks, and card and bento-cell href render through it

Only `card` and `bento-cell` can make a whole region a link, each through its own `href`.
Both stretched overlays are `aria-hidden="true" tabindex="-1"`, so keyboard and screen-reader
users cannot reach them. {% ref "SPEC-160" /%} D8 extends the existing `link` tag to wrap blocks,
and both `href` attributes become shorthand that renders through it.

## Acceptance Criteria

- [x] `{% link %}` accepts block content and renders a real `<a>` around it when it holds no links, buttons or form controls
- [x] The choice between wrap and stretch is made in the identity transform, so links added later (entity auto-links, resolved `{% ref %}`) are seen; a test asserts that a `link` around content that gains an auto-link in `postProcess` renders the stretched form, with no nested `<a>`
- [x] The schema emits a documented marker for the engine (an element or attribute carrying `href`, with no `data-rune`), and the marker never reaches the rendered HTML
- [x] When the content is interactive, `link` renders a stretched `<a data-name="link">`, focusable and labelled by `aria-label` when given, else by the content's title slot (`aria-labelledby`). When the content is a single rune, the anchor goes inside that rune's root; when it is several blocks or plain prose, the engine wraps them in one positioned `<div>` that holds the anchor. Both cases are tested
- [x] `link` emits no `data-rune`, and a test asserts that a schema property inside a `link` still publishes
- [x] An empty `href` renders the content unchanged
- [x] `card`'s and `bento-cell`'s `href` render through `link` and are not deprecated. **The shorthand always takes the stretched form**, so the rune's root stays the grid item and its `>` child selectors keep matching (`bento-cell`'s `grid-column` / `grid-row` span and `> .rf-bento-cell__content` split rules would break under an outer or inner wrapping `<a>`)
- [x] Skeleton gets the shared rules: the stretched anchor's positioning (replacing `.rf-card__link` and `.rf-bento-cell__link` in their rune CSS) and, for the wrap form, a reset so a wrapped block does not inherit link colour and underline. Lumina's `.rf-card:has(.rf-card__link):hover` still matches, or is moved to the shared selector
- [x] The changeset says that linked cards and bento cells are now reachable by keyboard and screen readers, one tab stop per card
- [x] The CSS coverage test passes, and contracts are regenerated on both copies and the diff reviewed

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

## Resolution

Completed: 2026-10-26

Branch: `claude/v0-43-0-review-ny4nl1`

### What was done
- `packages/runes/src/nodes.ts`: `linkTag`, now the `link` entry of the tags map.
  - Inline it delegates to the `link` node (a plain `<a>`).
  - Around blocks it returns a `<div data-link-href>` marker (`data-link-label` from `aria-label`). It has no `data-rune`.
  - An empty `href` returns the children.
  - The Markdown link node is unchanged.
- `packages/transform/src/link-regions.ts` (new): `resolveLinkRegions`. `engine.ts` runs it last in `createTransform`, with the set of runes configured `interactive`.
  - Wrap: `<a data-link="wrap">`.
  - Stretch: `<a data-link="stretch" data-name="link">`, inside a single rune's root with its `__link` class, or inside a `<div data-link="host">`.
  - Labelling for every stretched anchor: `aria-label`, else the host's `title` / `headline` / `name` slot or first heading through `aria-labelledby` (an id assigned if missing), else the host's text.
- `packages/runes/src/tags/common.ts`: `stretchedLink()`, exported. `card.ts` and `plugins/marketing/src/tags/bento.ts` use it instead of the `aria-hidden` / `tabindex="-1"` anchor.
- CSS:
  - `packages/skeleton/styles/dimensions/link.css` (new): wrap display, stretch positioning, and inner controls raised above.
  - `packages/lumina/styles/dimensions/link.css` (new): the wrap form's colour and underline reset, and the focus ring.
  - Imported from both `index.css` files and Lumina's `base.css`. The overlay rules are removed from `card.css` and `bento.css`.
- Tests: `packages/content/test/link-regions.test.ts` (12).
- Docs: `site/content/runes/card.md` (the focusable overlay, the output contract, "Linking any block").

### Notes
- **Focus ring inside the box.** The stretched link's ring is drawn inside it (`outline-offset: -3px`). `card` clips with `overflow: hidden` and the overlay fills exactly that box, so an outside ring was invisible. This showed up in a Chromium check: overlay hit-testing, inner link above it, Tab order, ring in light and dark.
- **"Interactive" covers:** `a`, `button`, form controls, `details` / `summary`, `iframe` / `audio` / `video` / `embed` / `object`, `label`, `tabindex`, `contenteditable`, and any rune whose config says `interactive`.
- **Existing hooks unchanged.** `card` and `bento-cell` keep `data-name="link"`, so `rf-card__link`, Lumina's linked-card hover and the SPEC-090 guest-posture check are unchanged.
- **Existing content unchanged.** Every existing `{% link %}` in `site/content` is single-line, which Markdoc parses as inline, so no existing output changes.
- **Attribute change.** `href` is no longer `required` on the tag, because an empty one is now meaningful.
- Contracts do not change, the SEO baseline does not move, and the site builds.

{% /work %}
