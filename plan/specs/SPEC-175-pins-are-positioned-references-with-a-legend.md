{% spec id="SPEC-175" status="draft" tags="runes, pin, figure, mockup, map, popover, a11y, legend" %}

# Pins are positioned references with a legend

## Summary

A pin marks a point on a picture: a colour on a photographed wall, a control on a screenshot, a
room on a floor plan. Clicking it may show a glance ({% ref "SPEC-174" /%}'s popover), open a
drawer, follow a link, or do nothing, as a numbered callout matched to a list of steps.

This spec adds `{% pin %}`, a reference with a position, accepted by hosts that declare it
(`figure` and `mockup` first). It also adds a shared **marker and legend** vocabulary: the
marker is what the eye uses, and the legend is the content, read by screen readers, kept
without JavaScript and printed. `map` moves its pins onto the same output, keeping its own
authoring.

## What exists, measured

- **Nothing positions content on an image.** `annotate` is margin notes, and `map`'s pins are
  geographic.
- **`figure`** (`packages/runes/src/tags/figure.ts:80-150`) keeps every child in order. The
  first paragraph with no media is the caption. Any other non-media child marks the body
  `mixed`. A `{% pin %}` written there today would be rendered as body content.
- **`mockup`** (`plugins/design/src/tags/mockup.ts:96`) wraps its body in a
  `data-name="viewport"` box inside the device frame.
- **`map`** (`plugins/places/src/tags/map.ts`):
  - pins are list items, with the name in bold, the description in italics, a link and
    coordinates;
  - they render as `<ol class="rf-map__pins">` of `map-pin` items, a list that is always
    visually hidden (`skeleton/styles/runes/map.css:30-40`);
  - the popup is built by concatenating HTML strings without escaping
    (`behaviors/src/elements/map.ts:229-235`);
  - a `.rf-map__fallback` style exists, but nothing emits it.
- **Cropping.** A media zone crops its image to fill (`object-fit: cover`,
  `layouts/split.css`), and `frame` applies an aspect ratio per child. A pin placed as a
  percentage of the image drifts when the image is cropped.

## Decisions

### D1 — a pin is a reference with a position

```md
{% figure caption="The living room in Ultramarine and Sandstone" %}
![Living room](room.jpg)

{% pin x=62 y=40 ref="ultramarine" preview="popover" /%}
{% pin x=18 y=71 ref="sandstone" preview="drawer" /%}
{% pin x=80 y=22 %}The ceiling is **Pure White**.{% /pin %}
{% /figure %}
```

- **`x` and `y`** are percentages of the picture's box, from the top left, as numbers from 0
  to 100. A value outside that range reports `pin-out-of-bounds`.
- **What it points at**, as `ref` and links already do:
  - `ref="…"`: an entity, labelled with the entity's title;
  - `href="…"`: a URL;
  - neither: the pin is a callout, and its body is its content.
- **`preview`** takes {% ref "SPEC-174" /%} D3's values: absent (follow the link), `popover`
  or `drawer`. A callout with `preview="popover"` gets a popover holding its own body.
- **`label`** gives a short name when the body is long, or when a `ref`'s title is not the
  right words.
- **The body** is the pin's legend entry (D3). A self-closing pin's entry is its label, or its
  referenced entity's title.

A pin with no `ref`, `href`, body or `label` has nothing to say, and reports `pin-empty`.

### D2 — hosts declare that they take pins

A rune accepts pins by declaring which element is the picture: `pinHost: 'image'` for `figure`,
`pinHost: 'viewport'` for `mockup`. A pin anywhere else reports `pin-outside-host`.

- **`figure`** takes pins when it holds exactly one image or one guest. With several, which
  one the pins belong to is ambiguous; it reports `pin-host-ambiguous`.
- **`mockup`** positions pins on its viewport, so callouts on a screenshot inside a phone
  frame land on the screen, not on the bezel.
- **Pins are consumed by the host.** They are never body content, so a `figure` with pins is
  not `mixed`, and a pin is never mistaken for the caption.

Other hosts (a `juxtapose` panel, a `gallery` item) declare it when someone needs them.

### D3 — the shared output: a stage, markers and a legend

```html
<figure data-rune="figure" data-pins="number">
  <div data-name="stage">
    <img src="room.jpg" alt="Living room">
    <button data-name="marker" data-pin="1" style="--pin-x: 62%; --pin-y: 40%" …>1</button>
    …
  </div>
  <ol data-name="legend">
    <li data-pin="1">Ultramarine</li>
    …
  </ol>
  <figcaption>The living room in Ultramarine and Sandstone</figcaption>
</figure>
```

- **The stage** wraps exactly the picture and is the positioning context. Markers sit at
  `--pin-x` and `--pin-y`. The values are validated numbers, so a style attribute is safe.
- **Markers are numbered** in source order. The host's `markers` attribute chooses the drawing:
  `number` (the default) or `dot`, the hotspot look. The theme draws both from `data-pin` and
  the marker type.
- **The legend is an ordered list** with the same numbers. It is the content: a screen reader
  reads it as a list, it is kept without JS, and it is what prints.
- **Touch targets.** A marker is at least 24 by 24 CSS pixels (WCAG 2.5.8), whatever the
  theme draws.

### D4 — which one is the control: the legend, or the markers

A control should exist once in the tab order. Which one is focusable depends on whether the
legend is shown, set by the host's `legend` attribute:

| `legend` | Controls in tab order | Markers |
|---|---|---|
| `visible` (default with `markers="number"`) | the legend entries | pointer shortcuts: `tabindex="-1"`, `aria-hidden` |
| `hidden` (default with `markers="dot"`) | the markers, each named by its label | the controls |

With `legend="hidden"`, the legend is still emitted. It is hidden on screen and from
assistive technology, and shown in print, so a printed hotspot image still says what each
point is.

When a pin opens a popover, the popover is anchored to its marker, whichever control opened
it. This is one more case of SPEC-174 D5's anchoring on open.

### D5 — a picture with pins is never cropped

Pins are percentages of the picture, so the picture must be drawn whole:

- the stage takes the picture's own aspect ratio;
- in a box of another shape (a media zone, a `frame` ratio, a carousel slide), the stage is
  fitted inside it, as `contain` would, rather than cropped as `cover` is;
- the host gets `data-pins`, so {% ref "SPEC-173" /%}'s zone rules and `frame` can tell.

An author who wants an edge-to-edge picture crops the image file itself. Positions then
follow the file.

### D6 — inside a linked card or a carousel

- **A linked card** ({% ref "SPEC-173" /%} D5) makes each media item presentational. A
  figure's pins there render as markers and a legend, with no controls. An interactive pin
  in a linked tile reports `pin-in-linked-tile`, as an interactive guest does under
  {% ref "SPEC-090" /%}.
- **A carousel** closes any popover opened from a slide when the slide changes. The carousel
  behavior does this for any open popover anchored inside its track.

### D7 — map shares the output, not the rune

Map pins have geographic coordinates and a list-item syntax that works. A `{% pin lat lng %}`
would be a second way to write the same thing, so map keeps its authoring. It moves its
output onto D3 and D4:

- its pin list becomes the shared legend, numbered like the markers. A `legend` attribute
  makes it visible; today it is screen-reader-only and cannot be shown;
- with `legend="visible"`, the list is also the no-JS view, which fills the gap left by the
  `.rf-map__fallback` that nothing emits;
- the popup is built from the legend entry's rendered DOM, not by concatenating strings, so
  author content is no longer inserted unescaped. Whether the popup becomes a SPEC-174
  popover anchored to the Leaflet marker is measured during implementation.

### D8 — later consumers are recorded

The marker and legend vocabulary fits other positions. Each would arrive as its own change:

| Position | Use |
|---|---|
| a code line | numbered callouts in a code block, the legend explaining each line |
| a time | video chapters, the legend as the chapter list |
| a data value | a chart annotation; the chart owns its coordinates |

None of them uses the `{% pin %}` rune. They share the output, so a theme's markers and
legends look the same everywhere.

## Open questions

- **Placing pins.** Writing coordinates by hand is slow. A dev-server helper that shows the
  percentages under the cursor, or the block editor placing pins by clicking, would make the
  rune practical. Neither is designed here.
- **A pin that points at a region**, a rectangle rather than a point (`w=` and `h=`), for
  highlighting part of a screenshot. It is a natural extension of the stage; it waits for a
  need.
- **Legend placement.** Beside the picture, below it, or in the figure's caption. The
  default is below, and the theme can move it, but an author attribute may be wanted.

## Acceptance Criteria

- [ ] `{% pin x y %}` accepts `ref`, `href`, `preview`, `label` and a body; coordinates outside 0–100 report `pin-out-of-bounds`, and a pin with nothing to say reports `pin-empty`
- [ ] Runes declare `pinHost` to accept pins; `figure` (one image or guest) and `mockup` (its viewport) do; a pin elsewhere reports `pin-outside-host`, and a figure with several images reports `pin-host-ambiguous`
- [ ] A host consumes its pins: a figure with pins is not `mixed`, and a pin is never its caption
- [ ] The output is a stage holding the picture and numbered markers at `--pin-x`/`--pin-y`, plus an ordered legend with the same numbers; markers are at least 24×24 CSS pixels
- [ ] With a visible legend, the legend entries are the controls and the markers are `aria-hidden` with `tabindex="-1"`; with `legend="hidden"`, the markers are the named controls and the legend shows only in print
- [ ] A popover opened from a pin is anchored to the pin's marker, whichever control opened it
- [ ] A picture with pins is fitted, never cropped, inside a media zone, a `frame` ratio or a carousel slide, and its markers land on the same points at every width
- [ ] Pins in a linked tile render without controls and report `pin-in-linked-tile`; changing slide in a carousel closes a popover opened from it
- [ ] `map` renders its pins as the shared legend, can show it with `legend="visible"`, and builds its popup from the rendered entry with no string concatenation of author content

## References

- {% ref "SPEC-174" /%}: the popover, and the `preview` vocabulary pins use.
- {% ref "SPEC-173" /%}: media zones and carousels, where pinned figures sit.
- {% ref "SPEC-090" /%}: interaction posture in linked tiles.
- {% ref "SPEC-078" /%}: `preview` on references.
- {% ref "SPEC-086" /%}: `frame` and its aspect ratio.

{% /spec %}
