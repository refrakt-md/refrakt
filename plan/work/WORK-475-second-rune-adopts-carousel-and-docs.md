{% work id="WORK-475" status="done" priority="low" complexity="simple" source="SPEC-100" milestone="v0.26.0" tags="carousel,layout,testimonial,pricing,cast,docs" %}

# Second rune adopts carousel + carousel docs

Land at least one further rune (`testimonial` *or* `pricing` *or* `cast`) on `layout="carousel"`
through config + contract + CSS only, demonstrating zero new behavior code per adoption, and note
the layout mode on adopting runes' docs. Per {% ref "SPEC-100" /%} Phase B.6.

## Scope

- Pick one of `testimonial` / `pricing` / `cast` (whichever renders the cleanest homogeneous item
  band) and add `carousel` to its `layout` matches, mapping its item collection onto the shared
  contract; add track CSS. **Zero new behavior code.**
- Verify CSS-coverage for the new `[data-layout="carousel"]` selectors on the adopting rune.
- Docs: each adopting rune's page notes `layout="carousel"` (the contract itself was documented
  once in {% ref "WORK-470" /%}).

## Acceptance Criteria

- [x] At least one further rune (`testimonial`/`pricing`/`cast`) adopts `layout="carousel"` through config + contract + CSS only, with zero new behavior code.
- [x] CSS-coverage passes for the new `[data-layout="carousel"]` selectors on the adopting rune.
- [x] The adopting rune's docs page notes `layout="carousel"`.

## Dependencies

- {% ref "WORK-472" /%} — the shared behavior the new rune binds to.
- {% ref "WORK-474" /%} — `feature` adoption proves the pattern first.

## References

- Spec: {% ref "SPEC-100" /%} Phase B.6 + Non-goals (incremental adoption; not every candidate this milestone).

## Resolution

Completed: 2026-06-25

Branch: `claude/spec-100-carousel-layout-mode`

### What was done
- `plugins/business/src/tags/cast.ts` — `cast` adopts `layout="carousel"` (matches migrated onto the canonical const `layoutMatches([LAYOUT.grid, LAYOUT.list, LAYOUT.carousel])`); its members `<ul>` ref renamed `members`→`items` (the shared carousel track token). Zero new behavior code — the shared dispatch + behavior drive it.
- `plugins/business/src/config.ts` — editHints `members`→`items`.
- `packages/skeleton/styles/runes/cast.css` + `packages/lumina/styles/runes/cast.css` — `.rf-cast__members`→`.rf-cast__items`; `.rf-cast--carousel` sets cast's `--rf-carousel-slide` (track + nav come from the shared carousel CSS).
- Docs: `site/content/runes/business/cast.md` notes `layout="carousel"`; `site/content/runes/marketing/feature.md` documents `carousel` + the `collapse-to` dial.
- Contracts regenerated; 288 business/lumina tests green (contracts + CSS coverage). Site prerender clean.

### Notes
- Proves the zero-per-rune-behavior-code adoption: cast added config + the `items` track token + a one-line slide-width rule. As with feature, adoption required renaming cast's semantic container (`members`→`items`) per the maintainer's "reuse data-name=items" decision — worth noting this rename-per-adopter cost if the carousel is rolled out widely.

{% /work %}
