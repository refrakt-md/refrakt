{% work id="WORK-665" status="ready" priority="high" complexity="complex" source="SPEC-160" tags="runes, composition, marketing, hero, section" milestone="v0.44.0" %}

# hero is a composition over section

`hero` becomes a `section` with a split, `cover`, the header and `{% actions %}`, with no rune CSS
of its own ({% ref "SPEC-160" /%} D7). {% ref "WORK-654" /%} leaves a composed `hero` fixture;
this item completes it and compares it with the plugin.

## Acceptance Criteria

- [ ] A composed `hero` definition declares `align`, the split attributes, `content-place`, `height` and `aspect`, and forwards them to its `section`
- [ ] It declares `defaults: { width: full, elevation: flush, prominence: display }` and writes `guest-fit="bleed"` on its `section`
- [ ] It reads no heading as an eyebrow ({% ref "ADR-046" /%}), and a second leading heading is body rather than dropped ({% ref "BUG-047" /%})
- [ ] Rendered beside the plugin `hero` for every gallery fixture, light and dark, including cover; every difference is listed and explained
- [ ] `actions.css` in skeleton and Lumina sets the button-size custom properties from the enclosing section's `data-prominence`: `display` and `prominent` give today's hero size (`0.7rem 1.75rem` at `--rf-text`), and anything else gives today's cta size (SPEC-160 D7)
- [ ] The size rules reach only an `actions` whose nearest enclosing rune carries the `prominence`, asserted with a card holding `actions` inside a display hero, which keeps default buttons
- [ ] The composed `hero`'s buttons match the plugin `hero`'s in size, with no `hero.css`
- [ ] The plugin `hero` is unchanged; replacing it is a later step, taken once the comparison is reviewed

## Blocked by

- {% ref "WORK-663" /%}
- {% ref "WORK-664" /%}
- {% ref "WORK-654" /%}: `actions` and the hero fixture (v0.43.0)
- {% ref "WORK-656" /%}: the eyebrow pill in the sections dimension (v0.43.0)

## References

- {% ref "SPEC-160" /%}: D7.
- {% ref "SPEC-145" /%}: D31–D34.

{% /work %}
