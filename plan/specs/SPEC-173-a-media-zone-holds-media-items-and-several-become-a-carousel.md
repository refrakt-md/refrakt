{% spec id="SPEC-173" status="draft" tags="runes, media, carousel, card, section, gallery, figure, behaviors" %}

# A media zone holds media items, and several become a carousel

## Summary

A media zone (the content before the first `---` in `card`, `section`, `hero`, `feature` and
the rest) is read by six different rules today. One of them drops everything after the first
image without a word. This spec defines one **media item**, read by one shared module, for
every media zone and for `gallery`. A media zone that holds **several items renders them as a
carousel**, on {% ref "SPEC-100" /%}'s shared contract, with no gallery chrome.

Prompted by product cards on commercial sites: a card whose media is a run of photographs the
reader steps through, and a card whose media is a colour ({% ref "SPEC-165" /%}).

Out of scope: pins on images (a separate discussion, since it belongs with popovers in
general), and `mediatext`, which is held for its own spec.

## What exists, measured

**The readers.** All are in `packages/runes/src/tags/common.ts` unless noted:

| Reader | Counts as media | Used by |
|---|---|---|
| `isMediaNode` (197–202) | `img`, `video`, an `svg` with class `rf-placeholder` or `rf-icon` | `extractMediaImage`, gallery, testimonial, storyboard |
| `extractMediaImage` (204–215) | the first `isMediaNode`, top-level or inside a `<p>` | card, recipe, playlist, hero (cover), realm/faction scene |
| `unwrapParagraphImages` (225–240) | a `<p>` holding exactly one `img`, `[data-rune]` element or scheme `svg`. A `video` is not unwrapped; a `<p>` with two images stays wrapped | bento-cell, hero, feature, step |
| `.tag('img').limit(1)` | `img` only | character, `pageSectionProperties` |
| mediatext (`mediatext.ts:56-70`) | every `img` in the body | mediatext |

`figure`, `picture`, `iframe` and `audio` count nowhere.

**What each media zone keeps:**

| Rune | Keeps | A second image |
|---|---|---|
| card (`card.ts:114-127`) | the first media node, if any; **the rest of the zone, text and runes included, is dropped silently**. With no media node, the zone renders as written | dropped |
| recipe, playlist | the same rule as card | dropped |
| hero | the whole zone; in `cover`, only the first media node | kept, or dropped in `cover` |
| feature, step, bento-cell | the whole zone, unwrapped | kept, side by side in one `<p>` |
| testimonial (`testimonial.ts:102-112`) | the *last* media paragraph seen | dropped, last one wins |
| character | the first `img`; scheme `svg` and `video` are not kept | dropped |
| storyboard-panel | an image paragraph starts a new panel | starts a panel |

**gallery** (`gallery.ts:43-55`) flattens its children and keeps every `isMediaNode`, each
wrapped as `<figure data-name="item">` with a caption from `alt`. A `{% figure %}` is dropped,
caption and all, as are embeds and text.

**Guests.** Any rune may sit in a media zone ({% ref "WORK-339" /%}): `map`, `chart`,
`mockup`, `sandbox`, a `gallery`. The zone clips, rounds and is a container-query context, by
one name-agnostic rule in `layouts/split.css`.

**The carousel** (`packages/behaviors/src/behaviors/carousel.ts`) binds on any
`[data-layout="carousel"]` element. Its track is the first `[data-name="items"]`
inside the host, and the track's children are the slides. It injects prev/next buttons and
handles the arrow keys. It has no position indicator, no `role` or `aria-roledescription`,
and no autoplay. `gallery`, `feature` and `cast` adopt it.

**Posture.** In a linked tile (`href`) or in `cover`, the engine marks the whole media zone
`data-guest-posture="presentational"` (`engine.ts:525-529`). The zone goes
`pointer-events: none`, and the behaviours layer skips every behavior inside it, layout
modes included (`behaviors/src/index.ts:149`).

**Content.** Of the 49 media zones in `site/content` with a `---`, 27 hold no image, 22 hold
one, and none holds two or more. No existing page changes when several items become a
carousel. The change that matters for existing content is that nothing is dropped.

## Decisions

### D1 — one media item, read by one module

A **media item** is one of:

| Item | Source |
|---|---|
| an image | `![…](…)`, including `placeholder:` and `icon:` schemes |
| a video | a `<video>` element, which `isMediaNode` already accepts; an `{% embed %}` is a guest |
| a figure | `{% figure %}`: media with its own caption |
| a colour | a bare `{% color %}` ({% ref "SPEC-165" /%} D2) |
| an icon | a bare `{% icon %}` |
| a guest | any other rune, as one item (`map`, `chart`, `mockup`, `sandbox`, `gallery`…) |

Following {% ref "SPEC-166" /%} D2, the reading is one shared module: `mediaItems(nodes)` returns
the items in order, each unwrapped from its paragraph, plus whatever is not an item. Every
reader in the table above is replaced by it, and every media zone and `gallery` call it.

- A paragraph holding several images is several items. Today it is one `<p>`.
- An item's `data-media-item` attribute names its kind (`image`, `video`, `figure`, `color`,
  `icon`, `guest`), so CSS can treat a colour differently from a photograph without a class
  per rune.

### D2 — a media zone holds items, or one free block

After `mediaItems`, a zone is one of three things:

1. **One item.** Rendered as today.
2. **Several items.** A carousel (D3).
3. **Anything that is not only items**, such as a paragraph of text beside an image. Rendered
   as written, in order, with nothing dropped. If it mixes items and text, it reports
   `media-zone-mixed` naming the text, since the author probably meant the text for the body.

This replaces card's, recipe's and playlist's silent drop. That drop is the bug the earlier
discussion would have filed; it is fixed here instead.

### D3 — several items are a carousel, always

A zone with several items emits `data-layout="carousel"` on the zone and wraps the items in a
`[data-name="items"]` track: SPEC-100's contract, with no new behavior code. The shared CSS
shows **one item per view**, full width, with scroll snap.

- **The layout is fixed.** There is no attribute for a grid or a stack of media in a zone. An
  author who wants a grid places a `{% gallery %}`, which is one guest item.
- **No gallery chrome.** No columns, lightbox or gallery caption. A figure item keeps its own
  caption under its slide.
- **Height.** Slides stretch to the tallest, and images use `object-fit: cover`, so the zone
  does not jump between slides. An author who wants a fixed shape gives `media-ratio` (the
  split preset, {% ref "SPEC-168" /%} D1).
- **Slot kinds.** A carousel applies to zones of kind `cover` or `hero`, or with no kind. A
  `portrait`, `thumbnail` or `icon` zone holds one item: the first is kept and the rest are
  reported as `media-zone-multiple`. This changes testimonial from last-wins to first-wins.
- **Cover.** A `cover` zone with several items would be a backdrop slideshow, which needs
  autoplay or controls laid over the content. Both are out of scope (SPEC-090 §4 already
  rules out interactive full-bleed guests). The first item is the backdrop, and the rest are
  reported as `media-zone-multiple`. Today hero's cover drops them silently.

### D4 — the shared carousel gains what one-per-view needs

These are changes to the shared behavior, so `gallery`, `feature` and `cast` get them too.

- **A position indicator.** With one slide per view the reader cannot see how many there
  are. The behavior adds a list of page buttons, each labelled "Slide 2 of 4" from i18n
  (`behavior.carousel.slide`), with the current one marked `aria-current`. The theme draws
  them as dots, a counter or thumbnails; the DOM is the same.
- **The APG carousel pattern.** The host gets `role="region"` and
  `aria-roledescription="carousel"`; each slide gets `role="group"`,
  `aria-roledescription="slide"` and its position as `aria-label`. This is missing for every
  adopter today.
- **Nesting.** A `feature layout="carousel"` of cards whose media zones are carousels nests
  two hosts. The track is found with `:scope` rules rather than the first descendant, and an
  arrow key is handled by the innermost host only.
- **No autoplay.** Motion the reader did not start needs a pause control (WCAG 2.2.2) and is
  not a content concern.

### D5 — a linked card keeps its carousel usable

Under SPEC-090 a linked tile's whole media zone is presentational, so a product card with
`href` would show only its first photograph and the reader could not step through. That
posture was written for a guest's own controls, such as a map's pan or a codegroup's tabs.
A carousel is an arrangement of the zone itself, so:

- **The posture moves from the zone to each item.** Every item in a linked tile is still
  presentational: a map slide does not pan, and its fallback renders. The zone's
  carousel is enhanced.
- **The prev/next and page buttons are lifted** above the stretched link, as body controls
  already are (SPEC-090 §3).
- **The track is lifted too, so touch swipe works.** Each slide is wrapped in a duplicate link
  to the card's `href`, with `tabindex="-1"` and `aria-hidden="true"`. A click on a photograph
  still opens the product. The card's own link stays the single link a keyboard or screen
  reader meets.

**Rejected:** leaving the track under the link. Clicks follow the link, but on a touch screen
the overlay takes the swipe, so the only way to change slide would be small buttons.

### D6 — gallery reads the same items

`gallery` uses `mediaItems`, so a `{% figure %}` keeps its caption and position, and colours,
icons and guests are accepted. The lightbox opens images and figures only. Everything else
about gallery stays: `layout`, `columns`, `lightbox`, `caption`. Gallery is the rune for
media arranged deliberately; a media zone with several items is the unarranged case. Both
use the one carousel.

### D7 — compositions get it for free

A composition that places `$slots.media` into a `section` or `card` zone passes whatever was
authored, so a composed product card with three photographs is a carousel with no template
change. A definition that wants exactly one item says so through the slot kind (D3).

### D8 — the visible changes are recorded

| Change | Where |
|---|---|
| Text and runes after the first image in a card, recipe or playlist media zone now render, with `media-zone-mixed` | card, recipe, playlist |
| Testimonial keeps the first avatar, not the last, and reports the rest | testimonial |
| Hero `cover` reports extra media instead of dropping it silently | hero |
| Two images in one paragraph become two items: a carousel, instead of side by side | feature, step, bento-cell, hero |
| Every carousel gains a page indicator and the APG roles | gallery, feature, cast |
| `gallery` accepts figures, colours, icons and guests | gallery |

The content count says no page in this repository shows the third or fourth row. The
structure contract and the SEO baseline are regenerated, and the diff is the review.

## Open questions

- **Feature and step side-by-side images.** Two images in one paragraph in a feature zone
  render side by side today. Is any third-party content relying on that, and should a stack
  be offered after all? The repository count is zero.
- **Thumbnails as the page indicator.** D4 lets a theme draw the indicator as thumbnails, but
  the indicator holds no image. Carrying each slide's image into its page button would let it.
- **`mediaItems` on `figure`'s own body.** A figure holding several images could use the same
  carousel. That is consistent, but it makes a figure-in-a-carousel nest; it waits for a need.

## Acceptance Criteria

- [ ] One shared `mediaItems` module reads images, videos, figures, colours, icons and guests in order, unwrapped from paragraphs, and replaces `isMediaNode`/`extractMediaImage`/`unwrapParagraphImages` and the per-rune readers in the table above
- [ ] Each item carries `data-media-item` naming its kind
- [ ] A media zone with one item renders as today; with several items it emits `data-layout="carousel"` and an items track; with anything else it renders as written, with nothing dropped, and mixed text reports `media-zone-mixed`
- [ ] `portrait`, `thumbnail` and `icon` zones, and `cover` zones, keep the first item and report the rest as `media-zone-multiple`
- [ ] The shared carousel adds a labelled page indicator with `aria-current`, the APG region and slide roles, `:scope`-bound track lookup, and innermost-host key handling; gallery, feature and cast gain them
- [ ] In a linked tile the carousel in the media zone stays enhanced: the guest posture applies per item, the buttons and the track sit above the stretched link, and each slide carries a hidden duplicate link to the tile's `href`
- [ ] `gallery` reads items through `mediaItems`; a `{% figure %}` in a gallery keeps its caption
- [ ] A composed card with several images in its media slot renders a carousel with no template change
- [ ] The changes in D8 are recorded in the changeset; contracts and the SEO baseline are regenerated

## References

- {% ref "SPEC-100" /%}: the carousel layout mode and its contract.
- {% ref "SPEC-090" /%}: media-guest posture, amended for linked tiles by D5.
- {% ref "WORK-339" /%}: any rune is a media-zone guest.
- {% ref "SPEC-160" /%} D2: `section`'s media zone and slot kinds.
- {% ref "SPEC-165" /%} D2: a bare `color` or `icon` in a media zone.
- {% ref "SPEC-166" /%} D2: one shared module per value kind, the model for `mediaItems`.
- {% ref "SPEC-168" /%} D1: the split preset and `media-ratio`.
- {% ref "SPEC-171" /%}: bento cells become cards, and read their zones the same way.

{% /spec %}
