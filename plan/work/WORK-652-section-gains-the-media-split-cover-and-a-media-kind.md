{% work id="WORK-652" status="draft" priority="high" complexity="moderate" source="SPEC-160" tags="runes, section, card, composition, primitives, media" milestone="v0.43.0" %}

# section gains the media split, cover and a media kind

`card` is the only primitive with a media split, so every composition that wants a titled region
with media places a drawn object. {% ref "ADR-041" /%} moves the split onto `section`. This item
gives `section` the split attributes, `cover`, and a `media` attribute that stamps
`data-media`, while `card`'s output stays exactly as it is ({% ref "SPEC-160" /%} D2, D3).

## Acceptance Criteria

- [ ] `section` accepts the split attributes (`media-position`, `media-ratio`, `valign`, `collapse`) and `cover`, through the same helpers `card` uses
- [ ] With `media-position`, a section reads media, body and footer zones by `card`'s rule, and an empty leading zone omits the media element; without it, every existing `section` fixture renders unchanged and a `---` stays body content
- [ ] `section` accepts `media` (`portrait | cover | thumbnail | hero | icon`) and stamps `data-media` on its media zone
- [ ] A section with a split keeps its header anatomy (eyebrow, headline, blurb) in the content column
- [ ] `card`'s contract entry and gallery output are unchanged on both contract copies
- [ ] The section docs page documents the split, `cover` and `media`
- [ ] SPEC-145 D18 and D20 carry a note pointing to ADR-041

## Approach

`card`'s schema moves onto the shared split helpers where it does not already use them (D3),
and `refrakt contracts --check` reports no change to `Card`.

## Blocked by

- {% ref "WORK-651" /%}

## References

- {% ref "SPEC-160" /%}: D2, D3.
- {% ref "ADR-041" /%}.

{% /work %}
