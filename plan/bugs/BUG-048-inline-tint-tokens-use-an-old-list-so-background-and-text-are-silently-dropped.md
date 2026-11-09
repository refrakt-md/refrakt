{% bug id="BUG-048" status="fixed" severity="major" source="SPEC-053" tags="tint, runes" milestone="v0.49.0" pr="refrakt-md/refrakt#786" %}

# Inline tint tokens use an old list, so background and text are silently dropped

## Steps to Reproduce
1. Write an inline tint as a child rune:
   ```markdoc
   {% hint %}
   {% tint %}
   - background: #111111
   - text: #222222
   - primary: #333333
   {% /tint %}
   Hi
   {% /hint %}
   ```
2. Transform it and look at the `tint-*` metas, or the rendered `--tint-*` custom properties.

## Expected
Every token the tint system knows is applied: `bg`, `surface`, `text`, `muted`, `primary`, `border` (`TINT_TOKENS` in `packages/transform/src/facets/tint.ts`, and `TintTokens` in `packages/transform/src/types.ts`, which named tints in theme config use).

## Actual
`packages/runes/src/tags/tint.ts` keeps its own `TINT_TOKENS`: `background`, `surface`, `primary`, `secondary`, `accent`, `border`. The child rune emits `tint-background`, which the facet never reads, and drops `text` entirely. Only `surface`, `primary` and `border` reach the page. `secondary` and `accent` are emitted but have no CSS bridge either.

The tint reference page's inline examples write `background:`, so they silently do nothing, and its "Theme configuration" example uses `background` too.

## Fix
- Have the rune parse the facet's `TINT_TOKENS` (import it rather than keeping a copy).
- Decide whether `background` stays accepted as an alias of `bg`, with a warning.
- Update the examples on `site/content/runes/tint.md` (inline and theme config) to the real names.
- Add a test that every token the rune accepts is one the facet reads.

## Environment
- Found while documenting the tint rune (v0.49.0 docs work).

## Resolution

Completed: 2026-11-09

Branch: `claude/composition-usage-rune-pages-c87ar6`

### What was done
- `packages/runes/src/tags/tint.ts` imports `TINT_TOKENS` from `@refrakt-md/transform` (now exported there) instead of keeping its own list; `background` is read as a deprecated alias of `bg`, with a one-time warning.
- `packages/runes/test/tint-tokens.test.ts`: the rune's list equals the axis's; every token passes through light and dark; the alias; an unknown name is ignored.
- `site/content/runes/tint.md` examples use the real token names; the theme-config example uses `lockMode`.
- Changeset `inline-tint-tokens.md` (patch).

### Notes
- `secondary` and `accent` have no equivalent and are now ignored rather than emitted to nowhere.

{% /bug %}
