{% spec id="SPEC-183" status="draft" tags="runes, composition, section, prominence, surfaces, lumina, hero, cta" %}

# Prominence is a register: a marquee step, and the header and band scale with it

`prominence` sizes a section header's title and nothing else. This spec adds a fifth step above
`display`, called `marquee`, and widens each step to the whole header: the blurb, the space
between the title and what follows it, and the padding of a flush band. Lumina gives the marquee
title its gradient. With that, the composed `hero` is `section` at `marquee` and the composed `cta`
is `section` at `display`, and neither needs CSS of its own.

It corrects one row of {% ref "SPEC-160" /%} D7, which said a display-size headline and blurb
come from `prominence="display"`, "which exists". It does not: reviewing the staged `hero` on
staging.refrakt.md showed its headline, blurb, spacing and gradient all differ from the plugin's.

## Why

**The staging review found it.** The staged `hero` (`site/staged-runes/hero.md`) declares
`prominence: display`, as SPEC-145 D34 has it. Side by side with refrakt.md, the header is smaller,
the blurb is body size, the band is tight and the headline is solid. Each is a value the plugin's
`hero.css` sets and `section` does not.

**The numbers show where the gap is.** On a flush, full-width band, at the density default:

| | plugin `hero` | plugin `cta` | `section` at `display` today |
|---|---|---|---|
| Title | 3.25rem, gradient | 2.5rem (`4xl`), solid | 1.5rem × 5/3 = 2.5rem |
| Blurb | `text-xl` | `text-xl` | `text` |
| Block padding | 7rem / 6.5rem | 3.5rem / 3rem | `--rune-padding` (`spacing-sm`) |
| Buttons | large | default | large (SPEC-160 D7) |

`display` already gives `cta`'s title exactly. `hero`'s title is beyond the ramp: the hero rests
above the whole type scale, which `hero.css` says outright ("stated here rather than promoted to a
`--rf-text-5xl` token"). So no tuning of `display` serves both runes. Stretching it to 3.25rem would
also grow every `prominence="display"` an author has written (eleven on this site), and `cta`.

**The two other answers are worse.**

- **Hero-specific CSS** (`[data-rune="hero"] .rf-section__headline`) works today, since the composed
  root carries `data-rune="hero"`. It brings back the per-rune stylesheet that going live is meant to
  delete. A user's own composed landing band could not opt into the look, and the next composed rune
  that wants it would copy the rules.
- **Leaving the difference** makes the composed `hero` a visibly smaller rune. SPEC-181's first
  rollout gate (reviewed on its pages, every difference accepted or fixed) would not pass it.

**A register is what `prominence` already claims to be.** SPEC-107 introduced it as "the
page-section-header type register", and the facet calls it "the header-emphasis axis". Emphasis
that stops at the title is half a register: a display headline over a body-size blurb, in a band
padded like a card, is not how any theme draws a loud header. The theme owns the magnitudes, as it
does for `elevation` and `density`; the author, the layout or the composition picks the step.

## Decisions

### D1 — `marquee`, a fifth step above `display`

`prominence` takes `quiet | normal | prominent | display | marquee`. `marquee` is the loudest: a
landing page's opening band, one per page in practice.

- **It ramps relative to the resting size, like every step** (WORK-538). Lumina's multiplier is
  13/6, which gives 3.25rem from the 1.5rem default, the plugin `hero`'s size. The ladder is then
  5/6, 1, 5/4, 5/3, 13/6.
- **The value list is one constant**, `PROMINENCE_VALUES` in `packages/transform/src/facets/prominence.ts`.
  The universal attribute definition, `RuneConfig.defaultProminence`, the docs and the editor read it,
  or are made to.
- `display` is unchanged, so no `prominence="display"` written today moves.
- **The composed `hero` defaults to `marquee`**, and the composed `cta` declares `prominence: display`
  (it declares no prominence today, resting at `normal`).

`marquee` on a rune that already rests at a large size ramps from that size. The plugin `hero`, at
3.25rem, would give 7rem. That is the relative ramp's known behaviour and is not special-cased: the
plugin `hero` is being replaced, and no other rune rests above the scale.

### D2 — each step sizes the whole header

A prominence step publishes the header's values, not just the title's:

| custom property | what it sizes | `quiet`, `normal` | `prominent` | `display`, `marquee` |
|---|---|---|---|---|
| `--rf-prominence-size` | the title (exists) | ramp | ramp | ramp |
| `--rf-prominence-blurb-size` | `[data-section="description"]` | `text` | `text-lg` | `text-xl` |
| `--rf-prominence-header-gap` | the space after the title, and after the blurb | the section's own | 1.25× | 2× |

- **The values are Lumina's**, written as custom properties in `dimensions/surfaces.css` beside the
  title ramp. Another theme sets its own or none. They are not added to the typed token contract
  (SPEC-048), for the same reason the hero's resting size never was.
- **Each is cleared at every rune root**, where `density.css` already clears `--rf-prominence-size`.
  A raised card inside a marquee hero keeps its own header. This is the protection SPEC-160 D7
  relies on for button size, extended to the new properties.
- **`normal` sets nothing.** A section at its resting prominence looks as it does today.

### D3 — a flush band is padded by its prominence

On `elevation="flush"`, `display` and `marquee` set the band's block padding:

| step | block padding | under 640px |
|---|---|---|
| `display` | 3.5rem / 3rem | 2.5rem / 2rem |
| `marquee` | 7rem / 6.5rem | 3.5rem / 3rem |

These are the plugin `cta`'s and `hero`'s own values, and the plugin `hero`'s mobile cover values.

- **Only flush.** `raised`, `flat` and the card surfaces take their padding from `elevation`'s chrome
  bundle and density, as now. Padding a raised card by its header's emphasis would change every
  `prominence` an author has put on one.
- **Only the two loud steps.** `quiet`, `normal` and `prominent` keep `--rune-padding`, so a flush
  `section` with a `prominent` header is unchanged.
- **It reaches other flush `display` runes too, on purpose.** The surfaces page's "card vs hero"
  examples (a flush, full-width, `display` `recipe` and `blog`) gain the 3.5rem band padding. That
  is the example's point, a rune read as a hero, and it is reviewed on that page with the rest.
- **Cover moves the padding onto the overlaid content**, as `hero.css` does today
  (`--rune-padding` on `[data-name="content"]`), so the media well stays flush with the band.
- Inline padding is not prominence's. It stays with `width` and `inset`, and any difference from the
  plugins' `2rem` is a review finding, recorded or fixed with the rest.

This is the one place the axis reaches past type. The alternative, a padding attribute on the
composition, would make every composed band restate what its prominence already says.

### D4 — Lumina gives the marquee title its gradient

Lumina draws a `marquee` title with the plugin `hero`'s gradient, text to muted at 135°, clipped to
the text. It is a theme choice, not part of the step: another theme draws `marquee` however it
likes, and Lumina's own `display` stays solid, as the plugin `cta` is.

- It rides a custom property, `--rf-prominence-title-fill`, set by `marquee` and cleared at every
  rune root (D2), so a nested rune's title is never painted.
- **Forced colours and a tint drop it.** Under `forced-colors: active` the title is plain text. When
  the section carries a tint whose text colour differs from the page's, the gradient is computed from
  the tint's tokens, since it is built from `--rf-color-text` and `--rf-color-muted`.

### D5 — buttons are large at `marquee` only

SPEC-160 D7 (decided 2026-10-26) gives `display` and `prominent` the large buttons, today's `hero`
size. Under D1 the composed `cta` is `display`, so it would get hero-sized buttons, a difference from
the plugin `cta` that nothing asked for. The large size moves up with the hero:

- **`marquee` gives the large size.** Every other step, and an `actions` with no prominence around
  it, gives the default, today's `cta` buttons.
- `actions.css` changes one selector; the mechanism (`--action-padding`, `--action-font-size`, keyed
  on the nearest section's `data-prominence`) is unchanged.
- A `prominence="display"` or `"prominent"` section with actions, written today, gets the default
  buttons. No page on this site is affected outside the hero and cta pages being reviewed.

### D6 — the composed hero and cta carry no CSS, and the plugin stylesheets go with them

With D1–D5, every rule in `lumina/styles/runes/{hero,cta}.css` has a home outside the rune: the title
and blurb in D1–D2, the spacing in D2–D3, the gradient in D4, the button sizes in D5, and the rest
where SPEC-160 D7 already put it. The plugin stylesheets are deleted when each rune goes live
(SPEC-181), not before. Until then the plugin runes keep their own CSS and are unaffected: they rest
at `--rf-title-size: 3.25rem` and `4xl`, and an author writes no `marquee` on them.

**The blurb's measure is left to the review.** The plugin `hero` caps the blurb at 40rem, or 560px
when centred; `section` caps its preamble at `--rf-measure` (65ch). The difference is small at
desktop widths. It is recorded as an explained difference in the comparison test unless the review
on staging finds it wrong.

## Not in scope

- **Retuning `display` or the lower steps.** Their title sizes are unchanged.
- **A larger type token.** `marquee` reaches 3.25rem by the ramp, not by a `--rf-text-5xl`.
- **`prominence` on header-less runes.** It is still dropped with a warning there (SPEC-107).
- **Going live.** `hero` and `cta` go live per SPEC-181 once v0.44.0, which first accepts their new
  forms in the plugin, has been released for one version.

## Open questions

- **Whether `display` should also pad a non-flush band**, e.g. a raised `cta` card. Left out; the
  current `cta` is flush.

## Acceptance Criteria

- [ ] `prominence` accepts `marquee`, from one value list, with a title ramp of 13/6 in Lumina; `display` and the lower steps are unchanged
- [ ] Each step publishes `--rf-prominence-blurb-size` and `--rf-prominence-header-gap`, cleared at every rune root, and `normal` sets nothing
- [ ] A flush section at `display` or `marquee` takes the block padding of D3, at both widths, and a cover band moves it onto the overlaid content
- [ ] Lumina draws a `marquee` title with the gradient through `--rf-prominence-title-fill`, never on a nested rune's title, and not under forced colours
- [ ] The large buttons apply at `marquee` only
- [ ] The staged `hero` defaults to `marquee` and the staged `cta` declares `display`, and their comparison tests assert the title size, blurb size, spacing, gradient and button size against the plugin, with each remaining difference explained
- [ ] The surfaces reference page, the theme-authoring dimensions page and the composed-runes guide document `marquee` and the widened register
- [ ] `contracts/` and the SEO baseline are regenerated where the new value appears, and CSS coverage passes

## References

- {% ref "SPEC-107" /%}: the `elevation` and `prominence` surface axes.
- {% ref "SPEC-160" /%}: D7, the row this spec corrects, and the button-size decision D5 amends.
- {% ref "SPEC-145" /%}: D33–D34, the carrier and the composition's `defaults`.
- {% ref "SPEC-181" /%}: the staging review this came out of, and the rollout gates.
- WORK-538: the relative prominence ramp.

{% /spec %}
