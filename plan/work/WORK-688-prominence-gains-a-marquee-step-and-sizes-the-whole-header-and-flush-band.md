{% work id="WORK-688" status="done" priority="medium" complexity="moderate" source="SPEC-183" tags="prominence, surfaces, section, lumina, transform" milestone="v0.45.0" pr="refrakt-md/refrakt#742" %}

# Prominence gains a marquee step and sizes the whole header and flush band

`prominence` gets a fifth step, `marquee`, above `display` (SPEC-183 D1). Each step now sizes the
blurb and the header's spacing as well as the title (D2). A flush band at `display` or `marquee`
takes its padding from the step (D3). Lumina paints the `display` and `marquee` titles with a gradient (D4), and
the large buttons apply at `marquee` only (D5).

## Acceptance Criteria
- [x] `PROMINENCE_VALUES` gains `marquee`, and the universal attribute definition, `RuneConfig.defaultProminence` and the editor read it (D1)
- [x] Lumina ramps the `marquee` title at 13/6 of the resting size, and `display` and the lower steps are unchanged (D1)
- [x] Each step publishes `--rf-prominence-blurb-size` and `--rf-prominence-header-scale`, `normal` sets neither, and both are cleared at every rune root (D2)
- [x] A flush section at `display` or `marquee` takes D3's block padding at both widths, and a cover band moves it onto the overlaid content (D3)
- [x] The `display` and `marquee` titles take the gradient through `--rf-prominence-title-fill`, never on a nested rune's title, and not under `forced-colors` (D4)
- [x] `actions.css` gives the large buttons at `marquee` only (D5)
- [x] The surfaces reference page and the theme-authoring dimensions page document `marquee` and the widened register
- [x] Contracts are regenerated in both copies, and CSS coverage and the SEO baseline check pass

## Approach

- `packages/transform/src/facets/prominence.ts`: `PROMINENCE_VALUES` and `ProminenceValue`. `types.ts` `defaultProminence` and `packages/runes/src/lib/universal-attribute-defs.ts` should read the constant rather than repeat it.
- `packages/lumina/styles/dimensions/surfaces.css`: the ramp and the new properties. `density.css` clears them at `[data-density]`, beside `--rf-prominence-size`. `sections.css`: the description reads `--rf-prominence-blurb-size`, and the title reads the fill.
- The flush padding goes next to `[data-elevation="flush"]` in `surfaces.css`. For cover, it sets `--rune-padding` on `[data-name="content"]`, as `hero.css` does.

## References

- {% ref "SPEC-183" /%}
- {% ref "SPEC-160" /%}: D7, the button-size decision D5 amends.

## Resolution

Completed: 2026-10-30

Branch: `claude/milestone-v0-44-0-ism7ni`

### What was done
- `packages/transform/src/facets/prominence.ts`: `marquee` added to `PROMINENCE_VALUES`, now exported from `@refrakt-md/transform`. `types.ts` (`defaultProminence`) and `packages/runes/src/lib/universal-attribute-defs.ts` read the constant.
- `packages/lumina/styles/dimensions/surfaces.css`:
  - the marquee title ramp (13/6);
  - per-step `--rf-prominence-blurb-size` / `-header-scale` / `-band-padding`, with narrow-screen padding;
  - the gradient as `--rf-prominence-title-fill` / `-clip` / `-ink` on display and marquee;
  - flush padding read through the band property, and cover bands moving it onto the content.
- `density.css` clears every new property at rune roots. `sections.css` reads the blurb size and the title paint, with a forced-colours reset. `runes/section.css` scales its header gaps. `runes/actions.css` gives large buttons at marquee only.
- `packages/lumina/test/prominence-register.test.ts` is new; `actions-prominence.test.ts` is updated.
- Contracts (both copies) and `site/content/_data/rune-attributes.json` regenerated.
- Docs: surfaces (author page), theme-authoring surfaces and dimensions, actions. Changeset `prominence-marquee.md`.

### Notes
- The spec's `--rf-prominence-header-gap` became `--rf-prominence-header-scale`, a multiplier of the section's own gaps (0.5rem and 1.5rem). That keeps `normal` exactly as it was.
- The title paint is three properties (fill, clip, ink), so `background-clip: text` applies only where a step sets a fill.
- SPEC-183 D2/D4 were amended during implementation: the plugin cta's headline is a gradient and its blurb `text-lg`, so display takes both (agreed in session).

{% /work %}
