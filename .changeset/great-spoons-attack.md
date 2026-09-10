---
'@refrakt-md/transform': minor
'@refrakt-md/runes': minor
---

Warn instead of silently dropping `reading`, `content-place` and `scrim-strength` (WORK-536)

Of the gated universal axes, four reported when a request was dropped and three said nothing. Each was silent for a different reason:

- **`reading`** always resolved and published its register as state; the value only became `data-reading` once child assembly found an element with section role `body`. On a body-less rune it vanished with no code path aware anything had been asked for. Now warns — but only on an explicit `reading=`, since every unmarked block in a build resolves to the `ui` default and warning there would make the channel worth ignoring.
- **`content-place`** was gated by `appliesTo` on an axis that a rune without the matching config modifier never sets, so the facet never ran and never got the chance to complain. It now also runs on the bare attribute, purely to warn.
- **`scrim-strength` in cover mode** was neither honoured nor consumed: cover's scrim meta list omits it, so it was dropped from the styling *and* leaked its raw `<meta>` tag into the rendered tree. Now warned and consumed.

Each goes through the facet warning collector with a `dedupeKey`, so it reports once per build rather than once per rune instance.

**Fixes an over-narrowing regression in the same release.** WORK-534 filed the `scrim*` family under the `cover` axis, which is gated on a declared `media-position` modifier — so narrowing removed `scrim`, `scrim-type`, `scrim-strength`, `scrim-blur` and `scrim-tone` from **82 of 83 runes**. That was wrong: the background layer reads all five and raises itself on any rune, and cover mode does not *enable* the scrim, it **reroutes** it to the media well. Verified against the engine — a bare `{ block: 'grid' }` config with `scrim="bottom"` produces a full scrim overlay. The family now belongs to the `bg` axis, where the facet that implements it lives, so `{% textblock scrim="bottom" %}` validates again. `cover` owns no author-facing attribute and is still reported per rune, like `density` and `content-place`.

This is why the work item's third case changed shape: `scrim*` on a rune that cannot enter cover mode is not dropped at all, and the genuine defect runs the other way.

Schema narrowing catches *authored* attributes at validation time; these runtime diagnostics cover the path it cannot see, where scoped defaults and embed overrides (ADR-027) apply attribute bags to runes that never spelled the attribute out.
