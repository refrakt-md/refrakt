---
'@refrakt-md/runes': minor
'@refrakt-md/transform': minor
'@refrakt-md/cli': minor
---

A composed rune's universal attributes land where they act, not on its empty root (SPEC-145 D14, D24, D31, D33, D34).

- **The paint group goes to a carrier.** `elevation`, `substrate`, `bg` with the `scrim` family, `reveal` and `stagger`, and `tint` move to the rune the template places at its top level. `width`, `spacing` and `inset` stay on the root. A template that places several runes marks one with a bare `chrome`, which is consumed at expansion. Several top-level runes and no marker is rejected (`chrome-ambiguous`), as are two markers and a marker with a value. A composition that places no rune warns and drops the paint group.
- **Role-bound axes go to the role's owner.** `prominence` goes to the placed rune with a page-section header, `reading` and `dropcap` to the one with a prose body, and `frame` to the one with media. A composed rune offers one of these only when an owner resolves. A composition placing one `section` now offers `prominence` and `frame-*`, and they land on the section.
- **Placement is a property of the axis.** `UniversalAxisFacet.placement` is `root`, `carrier`, `header`, `prose-body` or `media`, and every axis declares one.
- **Resolution looks through nested compositions.** The attribute is written on the target as an ordinary attribute, so it renders exactly as if the author had written it there.
- **A definition declares `defaults`** for universal axes, `density` included. Precedence is the author's value, then a literal in the template, then the definition default. Root-placed defaults become the generated config's `defaultWidth`, `defaultSpacing` and `defaultInset`, and `RuneConfig` gains `defaultSpacing` and `defaultInset`.
- **The tools show where each attribute lands.** `contracts` records each composed axis's placement under `composition.placements`. `inspect` prints where every axis lands, and each default with its source. `reference` lists a composition's defaults.
