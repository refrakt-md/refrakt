{% work id="WORK-665" status="draft" priority="high" complexity="complex" source="SPEC-160" tags="runes, composition, marketing, hero, section" milestone="v0.44.0" %}

# hero is a composition over section

`hero` becomes a `section` with a split, `cover`, the header and `{% actions %}`, with no rune CSS
of its own ({% ref "SPEC-160" /%} D7). {% ref "WORK-654" /%} leaves a composed `hero` fixture;
this item completes it and compares it with the plugin.

## Acceptance Criteria

- [ ] A composed `hero` definition declares `align`, the split attributes, `content-place`, `height` and `aspect`, and forwards them to its `section`
- [ ] It declares `defaults: { width: full, elevation: flush, prominence: display }` and writes `guest-fit="bleed"` on its `section`
- [ ] It reads no heading as an eyebrow ({% ref "ADR-046" /%}), and a second leading heading is body rather than dropped ({% ref "BUG-047" /%})
- [ ] Rendered beside the plugin `hero` for every gallery fixture, light and dark, including cover; every difference is listed and explained
- [ ] The button size decision below is made and recorded in SPEC-160 D7
- [ ] The plugin `hero` is unchanged; replacing it is a later step, taken once the comparison is reviewed

## Open before ready

**Button size.** `hero` and `cta` size their buttons differently: hero `0.7rem 1.75rem` at
`--rf-text`, cta `0.625rem 1.5rem` at `--rf-text-sm`. WORK-654 moves this into custom properties
that `hero.css` and `cta.css` each set, and defers the real answer to D7. With no rune CSS, the
size must come from something a composition can set. The options:

- `actions` takes `size="md | lg"`, and the composition writes it;
- `actions` reads the enclosing section's `prominence`, so `display` gives large buttons.

## Blocked by

- {% ref "WORK-663" /%}
- {% ref "WORK-664" /%}
- {% ref "WORK-654" /%}: `actions` and the hero fixture (v0.43.0)
- {% ref "WORK-656" /%}: the eyebrow pill in the sections dimension (v0.43.0)

## References

- {% ref "SPEC-160" /%}: D7.
- {% ref "SPEC-145" /%}: D31–D34.

{% /work %}
