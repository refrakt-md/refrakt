{% work id="WORK-652" status="done" priority="high" complexity="moderate" source="SPEC-160" tags="runes, section, card, composition, primitives, media" milestone="v0.43.0" pr="refrakt-md/refrakt#723" %}

# section gains the media split, cover and a media kind

`card` is the only primitive with a media split, so every composition that wants a titled region
with media places a drawn object. {% ref "ADR-041" /%} moves the split onto `section`. This item
gives `section` the split attributes, `cover`, and a `media` attribute that stamps
`data-media`, while `card`'s output stays exactly as it is ({% ref "SPEC-160" /%} D2, D3).

## Acceptance Criteria

- [x] `section` accepts the split attributes (`media-position`, `media-ratio`, `valign`, `collapse`) through `SplitLayoutModel` and the same helpers `card` uses (`buildLayoutMetas`, `splitMediaBodyFooter`, `extractMediaImage`)
- [x] `section` accepts cover as `card` has it: the `media-position="cover"` config variant (`data-cover-scope="full"`) plus `content-place`, `height` and `aspect`, with the same engine `styles` for `valign` and `aspect` (SPEC-160 D7 counts on `height` and `aspect` moving onto `section`)
- [x] With `media-position`, a section reads media, body and footer zones by `card`'s rule, and an empty leading zone omits the media element; without it, every existing `section` fixture renders unchanged and a `---` stays body content
- [x] `section` accepts `media` (`portrait | cover | thumbnail | hero | icon`) and stamps `data-media` on its media zone
- [x] A section with a split keeps its header anatomy (eyebrow, headline, blurb) in the content column
- [x] `card`'s contract entry and gallery output are unchanged on both contract copies
- [x] The section docs page documents the split, `cover` and `media`
- [x] SPEC-145 D18 and D20 carry a note pointing to ADR-041
- [x] The composed-runes guide (`site/content/extend/rune-authoring/composed-runes.md`) names `section` as the host that splits, and its `teaser` example and `packages/runes/test/fixtures/composed/teaser.md` place `{% section media-position=… %}` instead of `{% card %}`, with `composed-runes-guide.test.ts` and `composition-models.test.ts` updated

## Approach

`card` already uses all four shared split helpers (checked 2026-10-26), so SPEC-160 D3's "moves
onto the shared helpers" needs no change to `card.ts`; `refrakt contracts --check` reporting no
change to `Card` is the whole of D3 here.

## Blocked by

- {% ref "WORK-651" /%}

## References

- {% ref "SPEC-160" /%}: D2, D3.
- {% ref "ADR-041" /%}.

## Resolution

Completed: 2026-10-26

Branch: `claude/v0-43-0-review-ny4nl1`

### What was done
- `packages/runes/src/tags/section.ts`:
  - Attributes: `base: splitLayoutAttributes`, plus `media`, `content-place`, `height` and `aspect`.
  - `sectionZones`: zoning is opt-in. With no `media-position` every child is body.
  - With it, the transform splits by `splitMediaBodyFooter` into a media zone (unwrapped by `extractMediaImage`, `data-media` from `media`) and a `content` column holding header, body and an optional `<footer>`. An empty leading zone leaves out the media element.
  - The no-split path is the old code, unchanged.
  - The `schemaHeaderRoles` reader reads the body zone too.
  - `sectionSections` gains `media: 'media'`.
- `packages/runes/src/config.ts` (`Section`): the split modifiers (`media-position` with no default), `card`'s cover variant (`rf-section--cover`, `data-cover-scope="full"`), and the `valign` / `aspect` styles.
- CSS:
  - `packages/skeleton/styles/runes/section.css`: the column stack is `:where(.rf-section)`, plus `.rf-section__content` and the height scale.
  - `packages/lumina/styles/runes/section.css`: the content gap and the footer.
- Tests: `packages/runes/test/section-split.test.ts`. `composition-models.test.ts` is updated for the `teaser` fixture, which now places `section media-position="top"`.
- Docs:
  - `runes/section.md`: split, cover, `media` and the anatomy rows;
  - `composed-runes.md`: `section` is the host that splits, the `{% if %}` example, and the `character` notes. Review markers re-stamped.
- SPEC-145 D18 and D20 carry notes pointing to ADR-041.
- Contracts: only `Section` changes. `Card` is unchanged on both copies; `card.ts` is untouched. The SEO baseline does not move.

### Notes
- The `:where()` was needed. `section.css` loads after `layouts/split.css` in both packages, so `.rf-section { display: flex }` would have overridden the split's `[data-media-position]` grid at equal specificity.
- `media` is stamped by the transform rather than through `RuneConfig.mediaSlots`, because the kind is per instance. The engine keeps attributes the transform sets.
- Declaring the `media` section role makes `frame` available on `section` (targeting `[data-section="media"]`), and `media-position` makes `cover` and `content-place` available. The contract records all three.

{% /work %}
