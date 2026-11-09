{% bug id="BUG-048" status="reported" severity="major" source="SPEC-196" tags="nav, behaviors, menubar, accessibility, keyboard" milestone="v0.50.0" %}

# The menubar nav behaviour skips every group, so menubars get no ARIA or keyboard support

Found by the behaviour audit for {% ref "SPEC-196" /%} D6. Confirmed by reading the code; not yet
reproduced in a browser.

The menubar behaviour finds each group's list as a direct child of the group:

```ts
// packages/behaviors/src/behaviors/nav-menubar.ts:30
const panel = group.querySelector<HTMLElement>(':scope > ul, :scope > ol');
if (!trigger || !panel) continue;
```

But `nav-group` always wraps its body, the list included, in a panel element whenever the group
has content:

```ts
// packages/runes/src/tags/nav.ts:252
groupChildren.push(new Markdoc.Tag('div', { 'data-name': 'panel' }, panelChildren));
```

So `:scope > ul` never matches, `panel` is `null`, and the loop skips every group. The wrapper
came with {% ref "SPEC-054" /%}'s richer dropdowns. Lumina's and the skeleton's CSS were updated
to style it (`.rf-nav-group__panel`); the behaviour was not.

## Steps to Reproduce

1. Write a menubar nav with at least one group:

   ```markdoc
   {% nav layout="menubar" %}
   ## Docs
   - getting-started
   - installation
   {% /nav %}
   ```

2. Load the page with behaviours enabled, and inspect the group heading.
3. Tab to the heading and press ArrowDown, then Escape.

## Expected

The behaviour wires each group as a WAI-ARIA menubar item, as its own doc comment describes:

- the heading gets `role="button"`, `tabindex="0"`, `aria-haspopup` and `aria-expanded`, with an
  `id` the panel references;
- a click toggles the group's `data-open`, and only one group is open at a time;
- ArrowLeft and ArrowRight move between triggers, ArrowDown enters the open submenu, and Escape
  closes it and returns focus.

## Actual

None of that happens: no group is wired. The panels still open on hover and on
`:focus-within`, through the skeleton's fallback rules
(`packages/skeleton/styles/runes/nav.css:80–82`), so mouse users see working dropdowns and the
defect is easy to miss. Keyboard and screen-reader users get no menubar semantics: no roles, no
expanded state, no arrow-key navigation, and no Escape.

## Environment

- `main` as of 2026-11-09.
- There is no behaviour test for the menubar. Nav tests in `packages/runes/test` cover the
  schema and auto-enrichment, not `navMenubarBehavior`.

## Approach

- Select the panel as `:scope > [data-name="panel"]`, the element SPEC-054 introduced and the
  CSS already styles. That is also the selector {% ref "SPEC-196" /%} D6 asks for, since it uses
  the vocabulary rather than an element name.
- Check the other `:scope > …` lookups in the same file against the current output, notably
  the mobile trigger (`:scope > [data-name="trigger"]`).
- Add a DOM test (jsdom, as the other behaviour tests use) that renders a menubar nav through
  the real schema and asserts the roles and the keyboard model, so the schema and the behaviour
  cannot drift apart again.

## References

- {% ref "SPEC-196" /%} D6: the behaviour audit that found it.
- {% ref "SPEC-054" /%}: the panel wrapper.

{% /bug %}
