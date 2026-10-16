{% bug id="BUG-042" status="confirmed" severity="minor" source="SPEC-060" tags="lumina, drawer, layout, css" milestone="v0.41.1" %}

# An open drawer keeps the default layout's 4rem section margins, so it does not reach the viewport edges

An open drawer is meant to sit `--rf-drawer-gutter` (8px) from every viewport edge. On a page
using the **default** layout it stops 64px short at the top and the bottom. Measured in
Chromium at 1280×800: the panel spans y 72 → 728 instead of 8 → 792, with a computed margin
of `64px 0`. A docs-layout page (`/runes/xref`) is unaffected.

The cause is the default layout's section rhythm (`packages/lumina/styles/layouts/default.css`):

```css
.rf-page-content > article > * + [data-rune] {
	margin-top: var(--rf-spacing-section, 4rem);
	margin-bottom: var(--rf-spacing-section, 4rem);
}
```

The drawer pipeline hoists every drawer to the end of the article, so each one matches
`* + [data-rune]`. Lumina's drawer skin resets `dialog.rf-drawer { margin: 0 }` in the same
`skin` layer, but at specificity (0,1,1) against the rhythm rule's (0,2,1), so the rhythm rule
wins and the modal panel keeps flow margins it has no use for.

The neighbouring rule, `[data-rune] + :not([data-rune])`, has the mirror problem: prose after a
closed, invisible drawer would gain a section gap.

## Steps to Reproduce

1. On a default-layout page, write `See {% ref "SPEC-078" preview="drawer" /%}.`
2. Build the site and open the page with JavaScript on.
3. Click the link.

## Expected

The drawer runs from 8px below the top of the viewport to 8px above the bottom.

## Actual

It runs from 72px to 72px above the bottom; the computed margin is `64px 0`.

## Environment

- `@refrakt-md/lumina` at the current `main`, default layout.
- Visible on the v0.41.1 release pages, which use the default layout and carry drawers.

## Acceptance Criteria

- [x] An open drawer on a default-layout page reaches the drawer gutter at the top and bottom
- [x] The no-JS fallback (`section.rf-drawer`, in the flow) keeps its section spacing
- [x] Prose after a drawer gains no section gap from it
- [x] A docs-layout drawer is unchanged

{% /bug %}
