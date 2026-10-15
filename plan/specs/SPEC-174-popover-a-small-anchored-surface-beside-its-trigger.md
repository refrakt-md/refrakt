{% spec id="SPEC-174" status="draft" tags="runes, popover, drawer, preview, xref, behaviors, a11y" %}

# Popover: a small, anchored surface beside its trigger

## Summary

A drawer is refrakt's only disclosure surface: a modal panel for reading. Several things want
a lighter one, shown beside what opened it and dismissed by clicking elsewhere: a ref that
previews its target, a pin on an image, a glossary term, a tooltip-style annotation.
{% ref "SPEC-078" /%} reserved `preview="popover"` for this and said refrakt has no popover
primitive yet.

This spec adds `{% popover %}`. It has the drawer's shape: a region with an id and no trigger
of its own, opened by any reference to it. It is built on the platform's `popover` attribute
and CSS anchor positioning, so its core behaviour needs no JavaScript. Pins on images are its
next consumer, specified separately.

## What exists, measured

**The drawer** ({% ref "SPEC-060" /%}):

- `{% drawer id %}` renders `<section id="drawer-{id}">` and registers a page-scoped `drawer`
  entity (`drawer-pipeline.ts:58-115`).
- Triggers are any `a[data-target-type="drawer"]` pointing at `#drawer-{id}`. The behaviour
  turns the section into a `<dialog>` and opens it with `showModal()`
  (`behaviors/drawer.ts:180-288`).
- Opening one closes any other. Without JS the section is visible in the page, and the link
  scrolls to it.

**`preview`** exists on `ref` and `file-ref` only, with one value, `drawer`. A ref with
`preview="drawer"` emits a sentinel, and a hoist builder appends a drawer at the end of the
page, holding the `expand` of the entity. An authored drawer with the same id wins
(`drawer-pipeline.ts:317-456`).

**No short rendering of an entity exists.** A ref is either a link, or the entity's full
content through `expand`. Page entities carry `data.description` from frontmatter
(`runes/src/config.ts:2542`). `EntityRegistration` has no summary field.

**Tooltip-like things today:**

- `annotate variant="tooltip"` reveals its note on `:hover` only, with no keyboard or touch
  path (`skeleton/styles/runes/annotate.css:39-50`).
- `sidenote variant="tooltip"` is a bordered box, not a tooltip.
- `map`'s pin popup is built by concatenating HTML strings without escaping
  (`behaviors/src/elements/map.ts:229-235`).

Nothing in `packages/` or `plugins/` uses the `popover` attribute or anchor positioning.

**The platform.** The Popover API is Baseline. CSS anchor positioning works in all three
engines since Firefox 147 (January 2026). Opening on hover (`interestfor`,
`popover="hint"`) appears to be Chromium-only.

## Decisions

### D1 — `{% popover %}` is a region with an id, like a drawer

```md
The walls are {% ref "ultramarine" preview="popover" /%}.

{% popover id="ultramarine" title="Ultramarine" %}
{% color value="#2563EB" /%} A deep, saturated blue.

[See the colour](/colours/ultramarine)
{% /popover %}
```

- It renders `<section id="popover-{id}" popover="auto" data-rune="popover">`, with a
  `data-name="title"` label when `title` is given, and a close button
  (`popovertarget="popover-{id}" popovertargetaction="hide"`, labelled from
  `core.popover.close`).
- It registers a page-scoped `popover` entity, as a drawer does, so a ref resolves to it and
  `data-target-type="popover"` marks the trigger.
- It stays where it was authored in the source; the `popover` attribute hides it until
  opened, and an open popover renders in the top layer, so its position in the page does not
  matter visually.
- Attributes: `id` (required), `title`. A popover without a `title` reports
  `popover-unnamed`, because the surface needs an accessible name and its triggers can be
  many.

### D2 — the trigger is a button, and the browser does the rest

A reference resolved to a popover renders
`<button type="button" popovertarget="popover-{id}" data-target-type="popover">`, with the
reference's label as its text. Natively, with no script:

- a click, tap, Enter or Space opens it, and the button exposes its expanded state;
- Esc, a click outside, or opening another popover closes it (`popover="auto"`);
- a popover opened from inside another stays open with it, as nested disclosures should.

A button and not a link: the trigger opens something on this page and has no destination of
its own. The destination, if there is one, is a link inside the popover. The same was already
true of `preview="drawer"`, whose trigger points at `#drawer-{id}`.

### D3 — `preview` picks the surface

| `preview` | Surface | For |
|---|---|---|
| absent | a link | going there |
| `popover` | small, non-modal, beside the trigger | a glance |
| `drawer` | large, modal | reading |
| `details`, `sidenote` | still reserved | |

`ref` and `file-ref` gain `popover`. Anything later that is a reference (a pin, a glossary
term) takes the same vocabulary, so the trigger never decides the surface. A pin that opens a
drawer is `preview="drawer"` and needs nothing new.

### D4 — a generated popover holds the entity's summary

A `ref` with `preview="popover"` and no authored popover of that id gets one generated and
hoisted, as drawers are today. Its body is a **summary** of the entity, which is new: a
`summary-pending` placeholder, resolved after the registry is complete, as `expand-pending`
is.

The summary is generic for now:

- the title, from `data.title` or `data.name`, as the popover's label;
- the description, from `data.description`, when there is one;
- a link to the entity's URL, labelled from `core.popover.open`, unless the entity is on the
  same page.

An entity with no description gets a title and a link, and reports `popover-summary-thin` as
info, suggesting an authored popover or `preview="drawer"`. An entity type supplying its own
summary, for example a colour showing its swatch, is a stated later extension, most likely as
a composition. It is not designed here.

`file-ref` with `preview="popover"` holds its snippet, capped at a maximum height and scrolled.

### D5 — placement is CSS

- **Beside the trigger.** The popover is anchored to the button that opened it, below it by
  default, with `position-try-fallbacks` flipping it above or to the side when there is no
  room.
- **One popover, many triggers.** A popover referenced from three places is anchored to the
  one that opened it. That cannot be fixed at build time, so a small behaviour sets
  `position-anchor` on open. Without it, the popover opens in the browser's default position,
  centred, which is usable.
- **A sheet on narrow screens.** Below the `sm` breakpoint the same element is drawn as a
  bottom sheet, through CSS only. It is not a third surface.
- **Never clipped.** The top layer is outside every `overflow: hidden` ancestor, so a
  popover opened from a card's media zone or a carousel slide is not cut off.

### D6 — click to open; no hover

Hover fails on touch screens and for keyboard users, and the platform's hover path is not
cross-browser yet. Hover is reserved, for when `interestfor` ships in all three engines, and
would be an addition to click, never a replacement.

### D7 — a popover is short by contract

A popover holds a glance: paragraphs, lists, images, value elements, an `{% actions %}` row.
Two reports keep it from becoming a small drawer:

- a heading in a popover body reports `popover-too-large` as a warning, and points to
  `preview="drawer"`;
- more than five top-level blocks reports the same as info. The threshold is a starting
  point, to be tuned against real content.

A drawer or another `{% popover %}` *declared* inside a popover body is an error
(`popover-nested-region`). A *reference* to one inside it is fine.

### D8 — what degrades, and how

- **No JavaScript.** Everything in D2 still works. Only D5's anchoring to the opening trigger
  is lost; the popover opens centred.
- **No Popover API** (a browser from before 2024). The `popover` attribute is ignored, so the
  popover renders as ordinary content where it is in the page (at the end, when generated),
  and the trigger does nothing. This matches how a drawer degrades without JS.
- **Print.** An open popover is not printed and a closed one is hidden. Authored popover
  content is therefore missing from print; see the open questions.

### D9 — the later consumers are recorded, not done

| Consumer | What it gains |
|---|---|
| pins on images | a positioned reference with the D3 vocabulary; a legend list as the fallback |
| `annotate variant="tooltip"` | keyboard and touch access, by moving onto `popover` |
| a glossary | auto-linked terms opening a popover |
| `map`'s pin popup | the same surface, and the unescaped HTML removed |

Each is its own change. None is required for this spec to ship.

## Open questions

- **Print.** Should authored popover bodies print as endnotes after the section, numbered at
  their triggers? That is useful for references, and noise for UI-like popovers.
- **A summary per entity type.** D4 leaves this open. The likely shape is a composition the
  entity's plugin registers as its summary template.
- **`aria-haspopup` and roles.** The platform exposes the button's expanded state. Whether a
  popover holding links should also carry `role="dialog"` (non-modal) is to be checked with a
  screen reader during implementation, not decided here.

## Acceptance Criteria

- [ ] `{% popover id title %}` renders a `popover="auto"` section with a label and a close button, and registers a page-scoped `popover` entity; a missing `title` reports `popover-unnamed`
- [ ] A reference resolved to a popover renders a `<button popovertarget>` with `data-target-type="popover"`, and opening, closing, Esc and outside clicks work with JavaScript disabled
- [ ] `ref` and `file-ref` accept `preview="popover"`; an authored popover of the same id wins over a generated one
- [ ] A generated popover holds the generic summary (title, description, link), resolved after the registry; an entity without a description reports `popover-summary-thin`
- [ ] The popover is anchored to the trigger that opened it, flips when there is no room, and renders as a bottom sheet below `sm`
- [ ] A popover opened from inside an `overflow: hidden` container is not clipped
- [ ] A heading in a popover body reports `popover-too-large`; a drawer or popover declared inside a popover body reports `popover-nested-region`
- [ ] The close and open labels come from `core.popover.*` keys
- [ ] The `popover` rune is documented beside `drawer`, with the D3 table

## References

- {% ref "SPEC-060" /%}: the drawer, whose shape this follows.
- {% ref "SPEC-078" /%}: the `preview` attribute and its reserved values.
- {% ref "SPEC-173" /%}: media zones and carousels, where pins will sit.
- {% ref "SPEC-090" /%}: interaction posture; a trigger in a linked card is a lifted control.
- {% ref "SPEC-166" /%}: value elements, which a popover may hold.

{% /spec %}
