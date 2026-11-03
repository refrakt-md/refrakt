{% work id="WORK-702" status="done" priority="high" complexity="moderate" source="SPEC-181" tags="runes, composition, marketing, hero, go-live" milestone="v0.48.0" pr="refrakt-md/refrakt#767" %}

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

## Resolution

Completed: 2026-11-03

Branch: `claude/composition-usage-rune-pages-c87ar6`
PR: refrakt-md/refrakt#767

### What was done
- `site/staged-runes/hero.md` → `plugins/marketing/runes/hero.md`, unchanged; the marketing plugin declares `runeDir: 'runes'` and publishes `runes/` and `fixtures/`. `hero` removed from the staging site's `runes.prefer`.
- Removed the native hero: `plugins/marketing/src/tags/hero.ts`, its `Hero` theme entry, Lumina's and the skeleton's `hero.css`, and the three native hero test files.
- `plugins/marketing/fixtures/hero.md` replaces the plugin entry's inline fixture, so `inspect hero` keeps an input.
- `refrakt migrate hero` (`packages/cli/src/commands/migrate.ts`): `align="left|right"` → `start|end`, `justify` → `align`, on hero tags only; `site/content` needed nothing.
- `extractSeo` reads the composed hero's `headline` / `blurb` slots; without it the OG description was the eyebrow (test fails without the fix).
- Proof skin restyled onto `.rf-section[data-prominence="marquee"]` and `actions`.
- Lumina's contract test now loads plugins via `loadPlugin`, as the CLI does, so `runeDir` runes are covered; composed runes are allowed to be block-less.
- Contracts (both copies), rune attribute data and plugin vocabulary regenerated; SEO baseline unchanged.
- Docs: hero page gains "How it is built" with the definition as a snippet and the migrate command; composed-runes guide notes the first go-live; two theme-authoring config examples no longer use `Hero`.

### Notes
- Gate 3: the plugin hero had accepted `start|end` since SPEC-181 D7; `left|right|justify` get the codemod.
- WORK-669: no theme in the repo overrides `Hero`; with the native entry gone, an override now targets a composed rune and is reported and dropped by the existing guard.
- A composed rune re-marks content another composition places into it (`place()` sets one owner/slot). Recorded in `NOT_YET_PLACEABLE` and the guide, not fixed: nesting compositions with schema rows needs its own decision.
- The editor snippet for hero is gone with its plugin entry; a `runeDir` definition has no snippet field.

{% /work %}
