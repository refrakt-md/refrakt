{% bug id="BUG-055" status="confirmed" severity="minor" source="SPEC-196" tags="layout, chrome, search, transform" %}

# A layout chrome entry with an svg drops its children, so the search trigger has no label or key hint

Found while moving the search behaviour to attribute selectors ({% ref "WORK-723" /%}). Reproduced
on `main` (2026-11-12) by rendering `docsLayout` through `layoutTransform`.

`buildLayoutChrome` returns as soon as an entry has an `svg`, with the icon as the only child:

```ts
// packages/transform/src/layout.ts — buildLayoutChrome
if (entry.svg) {
	resolvedAttrs['data-raw-html'] = 'true';
	return makeTag(entry.tag, resolvedAttrs, [entry.svg]);
}
```

The `searchButton` chrome entry (`packages/transform/src/layouts.ts`) has both an `svg` and two
children, a "Search" label (`ref: 'search-label'`) and a key hint (`ref: 'search-kbd'`). The
children are never built. The skeleton styles both (`layouts/search.css`,
`.rf-search-trigger__label`, `.rf-search-trigger__kbd`), and the search behaviour fills the key
hint with ⌘K or Ctrl+K, so all three were written for elements no built-in layout emits.

## Steps to Reproduce

1. Render `docsLayout` with `layoutTransform` and a header region.
2. Find the `[data-search-trigger]` button in the output.

## Expected

```html
<button data-name="search-trigger" data-search-trigger …>
  <svg …>…</svg>
  <span data-name="search-label" class="rf-search-trigger__label">Search</span>
  <kbd data-name="search-kbd" class="rf-search-trigger__kbd"></kbd>
</button>
```

## Actual

```html
<button data-name="search-trigger" data-search-trigger data-raw-html="true">
  <svg …>…</svg>
</button>
```

## Approach

- `data-raw-html` marks *every* child as raw HTML to the renderers, so the svg and the built
  children cannot simply be placed side by side under it. Either wrap the svg in its own element
  that carries `data-raw-html` (an icon span), or have the renderers treat only a string child
  as raw.
- This is a visible change: every layout with a search trigger gains the label and the key hint.
  Decide whether that is wanted (the skeleton's `@media` rule at `search.css:79` already hides
  both on narrow screens), or remove the children, the CSS and the behaviour's key-hint code
  instead.
- A layout test asserting the trigger's children, so the two cannot drift apart again.

## References

- {% ref "WORK-723" /%}: the behaviour now finds the hint as `[data-name="search-kbd"]`, the
  `data-name` the chrome system gives the entry from its `ref`.
- {% ref "SPEC-196" /%} D6.

{% /bug %}
