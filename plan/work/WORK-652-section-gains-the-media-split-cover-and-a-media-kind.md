{% work id="WORK-652" status="ready" priority="high" complexity="moderate" source="SPEC-160" tags="runes, section, card, composition, primitives, media" milestone="v0.43.0" %}

# section gains the media split, cover and a media kind

`card` is the only primitive with a media split, so every composition that wants a titled region
with media places a drawn object. {% ref "ADR-041" /%} moves the split onto `section`. This item
gives `section` the split attributes, `cover`, and a `media` attribute that stamps
`data-media`, while `card`'s output stays exactly as it is ({% ref "SPEC-160" /%} D2, D3).

## Acceptance Criteria

- [ ] `section` accepts the split attributes (`media-position`, `media-ratio`, `valign`, `collapse`) through `SplitLayoutModel` and the same helpers `card` uses (`buildLayoutMetas`, `splitMediaBodyFooter`, `extractMediaImage`)
- [ ] `section` accepts cover as `card` has it: the `media-position="cover"` config variant (`data-cover-scope="full"`) plus `content-place`, `height` and `aspect`, with the same engine `styles` for `valign` and `aspect` (SPEC-160 D7 counts on `height` and `aspect` moving onto `section`)
- [ ] With `media-position`, a section reads media, body and footer zones by `card`'s rule, and an empty leading zone omits the media element; without it, every existing `section` fixture renders unchanged and a `---` stays body content
- [ ] `section` accepts `media` (`portrait | cover | thumbnail | hero | icon`) and stamps `data-media` on its media zone
- [ ] A section with a split keeps its header anatomy (eyebrow, headline, blurb) in the content column
- [ ] `card`'s contract entry and gallery output are unchanged on both contract copies
- [ ] The section docs page documents the split, `cover` and `media`
- [ ] SPEC-145 D18 and D20 carry a note pointing to ADR-041
- [ ] The composed-runes guide (`site/content/extend/rune-authoring/composed-runes.md`) names `section` as the host that splits, and its `teaser` example and `packages/runes/test/fixtures/composed/teaser.md` place `{% section media-position=… %}` instead of `{% card %}`, with `composed-runes-guide.test.ts` and `composition-models.test.ts` updated

## Approach

`card` already uses all four shared split helpers (checked 2026-10-26), so SPEC-160 D3's "moves
onto the shared helpers" needs no change to `card.ts`; `refrakt contracts --check` reporting no
change to `Card` is the whole of D3 here.

## Blocked by

- {% ref "WORK-651" /%}

## References

- {% ref "SPEC-160" /%}: D2, D3.
- {% ref "ADR-041" /%}.

{% /work %}
