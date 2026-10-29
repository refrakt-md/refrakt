{% work id="WORK-665" status="done" priority="high" complexity="complex" source="SPEC-160" tags="runes, composition, marketing, hero, section" milestone="v0.44.0" pr="refrakt-md/refrakt#733" %}

# hero is a composition over section

`hero` becomes a `section` with a split, `cover`, the header and `{% actions %}`, with no rune CSS
of its own ({% ref "SPEC-160" /%} D7). {% ref "WORK-654" /%} leaves a composed `hero` fixture;
this item completes it and compares it with the plugin.

## Acceptance Criteria

- [x] A composed `hero` definition declares `align`, the split attributes, `content-place`, `height` and `aspect`, and forwards them to its `section`
- [x] It declares `defaults: { width: full, elevation: flush, prominence: display }` and writes `guest-fit="bleed"` on its `section`
- [x] It reads no heading as an eyebrow ({% ref "ADR-046" /%}), and a second leading heading is body rather than dropped ({% ref "BUG-047" /%})
- [x] Rendered beside the plugin `hero` for every gallery fixture, light and dark, including cover; every difference is listed and explained
- [x] `actions.css` in skeleton and Lumina sets the button-size custom properties from the enclosing section's `data-prominence`: `display` and `prominent` give today's hero size (`0.7rem 1.75rem` at `--rf-text`), and anything else gives today's cta size (SPEC-160 D7)
- [x] The size rules reach only an `actions` whose nearest enclosing rune carries the `prominence`, asserted with a card holding `actions` inside a display hero, which keeps default buttons
- [x] The composed `hero`'s buttons match the plugin `hero`'s in size, with no `hero.css`
- [x] The plugin `hero` is unchanged; replacing it is a later step, taken once the comparison is reviewed

## Blocked by

- {% ref "WORK-663" /%}
- {% ref "WORK-664" /%}
- {% ref "WORK-654" /%}: `actions` and the hero fixture (v0.43.0)
- {% ref "WORK-656" /%}: the eyebrow pill in the sections dimension (v0.43.0)

## References

- {% ref "SPEC-160" /%}: D7.
- {% ref "SPEC-145" /%}: D31–D34.

## Resolution

Completed: 2026-10-29

Branch: `claude/milestone-v0-44-0-ism7ni`

### What was done
- `packages/runes/test/fixtures/composed/hero.md`: the complete composed `hero`. One `section` (split, cover, header, `{% actions %}`), forwarding `align`, `media-position`, `media-ratio`, `valign`, `collapse`, `content-place`, `height` and `aspect`, writing `media="hero"` and `guest-fit="bleed"`, with `defaults: { width: full, elevation: flush, prominence: display }`. A `body` field (`heading|paragraph`) keeps a second leading heading (BUG-047).
- `packages/content/test/composed-marketing.ts` + `composed-hero.test.ts`: the composition beside the plugin for every gallery cell (default, align left/right, media bottom/top/end, cover, cover placed and sized). The test asserts the same content in the same roles, the split and cover on the section, and every structural difference.
- `actions.css`: Lumina sets the size custom properties on `[data-prominence="display"|"prominent"]` (today's hero size); the skeleton clears them at every other rune root except `actions`. `packages/lumina/test/actions-prominence.test.ts` holds the shape. In a browser: a raised card with `actions` inside a display section keeps default buttons (10px 24px / 14px), and the section's own row is large (11.2px 28px / 16px).
- Shared CSS that `hero.css` did and the composition needs: `section`'s `align` justifies its own actions row; a cover `section` is a band (content-driven height with `min-height: clamp(22rem, 55vh, 40rem)`, mid-band overlay and even scrim when unplaced, no media radius when flush).
- Fixes found on the way:
  - Lumina's `.rf-section__preamble { margin: 0 }` cancelled the skeleton's centring (now `margin-block`).
  - `media-position="end"` put a media-first rune's content on row 2 (`grid-auto-flow: dense` in `layouts/split.css`).
  - `composedRuneConfig` made a forwarded enum attribute a root modifier: `data-media-position="cover"` on the wrapper laid it out as a 3:4 cover well. A forwarded attribute is no longer a modifier. The `realm`, `faction` and `character` comparisons were updated: the split is on their section, not their root.
- Docs: `site/content/runes/section.md` (cover band, align and actions), `site/content/runes/actions.md` (size from prominence).

### Differences from the plugin hero (Lumina, light and dark; the same in both modes)
- **Structure:** a block-less `div[data-rune="hero"]` around a `section`, so no `rf-hero*` classes; a theme targeting them needs the migration note.
- **Headline:** `section`'s display-prominence size, slightly smaller than the hero's 3.25rem rest, with no gradient text fill. The blurb is `section`'s (base size, muted), not the hero's `text-xl`.
- **Band padding:** the hero's 7rem / 2rem padding is gone; spacing is `section`'s rhythm under flush elevation. At page level, `width="full"` gets the layout's gutters; a gallery cell has none.
- **Cover:** same band height and centred overlay. `height` uses section's scale (12/18/26/34rem) rather than the hero's (20/28/36/44rem).
- **`align`:** `start | center | end` (section's vocabulary) rather than `left | center | right`.
- **`width="wide"`:** not anchored to the text measure (`contentMeasure` is the plugin's config; section declares none).
- **Buttons:** the same size, from the prominence rule rather than `hero.css`.

### Notes
- The plugin `hero` is unchanged. Replacing it waits on this comparison being reviewed.

{% /work %}
