{% work id="WORK-702" status="in-progress" priority="high" complexity="moderate" source="SPEC-181" tags="runes, composition, marketing, hero, go-live" milestone="v0.48.0" %}

# The composed hero goes live in the marketing plugin

`site/staged-runes/hero.md` has been reviewed on staging.refrakt.md and shows no difference from
the plugin hero ({% ref "WORK-689" /%}). SPEC-181 D5 makes going live its own item. This is the
first one, so it is also the first use of a plugin `runeDir` (SPEC-153 D2) and of the contract and
baseline diffs a go-live produces.

## Gates (SPEC-181 rollout)

1. Reviewed on its reference page and every other page that uses it, light and dark: done in WORK-689.
2. Every difference accepted or fixed: done in WORK-689.
3. Content whose meaning changes has a codemod, and the plugin accepted the new form for a release:
   the plugin hero has accepted `align="start|end"` beside `left|right` since SPEC-181 D7, and
   `site/content` uses only `start` and `center`. This item confirms that no other attribute differs.
4. No dependency on a primitive whose spec is `draft`: confirmed when the item starts.

## Acceptance Criteria
- [x] The marketing plugin declares a `runeDir`, publishes it in `files`, and `refrakt plugin validate` passes
- [x] `hero.md` moves from `site/staged-runes/` into that `runeDir` unchanged, and the `staging` site's `runes.prefer` entry for `hero` is removed
- [x] The plugin hero's schema, theme config entry and `hero.css` are removed, and the CSS coverage sets are updated
- [x] Both copies of `contracts/structures.json` and the SEO baseline are regenerated, and the diff is reviewed in the PR description
- [x] WORK-669's theme-override reporting reports any theme override of the removed `Hero` config
- [x] The hero reference page and the composed-runes guide describe the rune as a composition; the homepage renders unchanged
- [x] A breaking changeset and a migration note list what authors and themes lose (`rf-hero*` classes) and what changed

## Approach
Move the file first and run the comparison tests against its new location; then delete the native
parts. Record anything the first `runeDir` load turned up in the resolution, since WORK-703 and
WORK-704 follow the same path.

## References
- {% ref "SPEC-181" /%}: the rollout gates and D5.
- {% ref "SPEC-153" /%}: D2, `runeDir`.
- {% ref "WORK-689" /%}: the review.
- {% ref "WORK-669" /%}: theme-override reporting.

{% /work %}
