{% work id="WORK-655" status="draft" priority="medium" complexity="moderate" source="SPEC-160" tags="runes, primitives, link, accessibility, card, bento" milestone="v0.43.0" %}

# link wraps blocks, and card and bento-cell href render through it

Only `card` and `bento-cell` can make a whole region a link, each through its own `href`.
`card`'s stretched overlay is `aria-hidden="true" tabindex="-1"`, so keyboard and screen-reader
users cannot reach it. {% ref "SPEC-160" /%} D8 extends the existing `link` tag to wrap blocks,
and both `href` attributes become shorthand that renders through it.

## Acceptance Criteria

- [ ] `{% link %}` accepts block content and renders a real `<a>` around it when it holds no links, buttons or form controls
- [ ] When the content is interactive, `link` renders a stretched `<a data-name="link">` inside the wrapped rune's root, focusable and labelled by `aria-label` when given, else by the content's title slot
- [ ] `link` emits no `data-rune`, and a test asserts that a schema property inside a `link` still publishes
- [ ] An empty `href` renders the content unchanged
- [ ] `card`'s and `bento-cell`'s `href` render through `link` and are not deprecated
- [ ] The changeset says that linked cards and bento cells are now reachable by keyboard and screen readers, one tab stop per card
- [ ] Contracts are regenerated on both copies and the diff reviewed

## References

- {% ref "SPEC-160" /%}: D8.
- {% ref "SPEC-145" /%}: D19 (name-resolution boundaries).

{% /work %}
