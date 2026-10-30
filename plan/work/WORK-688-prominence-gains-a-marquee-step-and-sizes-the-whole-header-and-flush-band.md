{% work id="WORK-688" status="in-progress" priority="medium" complexity="moderate" source="SPEC-183" tags="prominence, surfaces, section, lumina, transform" milestone="v0.45.0" %}

# Prominence gains a marquee step and sizes the whole header and flush band

`prominence` gets a fifth step, `marquee`, above `display` (SPEC-183 D1). Each step now sizes the
blurb and the header's spacing as well as the title (D2). A flush band at `display` or `marquee`
takes its padding from the step (D3). Lumina paints the `display` and `marquee` titles with a gradient (D4), and
the large buttons apply at `marquee` only (D5).

## Acceptance Criteria
- [ ] `PROMINENCE_VALUES` gains `marquee`, and the universal attribute definition, `RuneConfig.defaultProminence` and the editor read it (D1)
- [ ] Lumina ramps the `marquee` title at 13/6 of the resting size, and `display` and the lower steps are unchanged (D1)
- [ ] Each step publishes `--rf-prominence-blurb-size` and `--rf-prominence-header-gap`, `normal` sets neither, and both are cleared at every rune root (D2)
- [ ] A flush section at `display` or `marquee` takes D3's block padding at both widths, and a cover band moves it onto the overlaid content (D3)
- [ ] The `display` and `marquee` titles take the gradient through `--rf-prominence-title-fill`, never on a nested rune's title, and not under `forced-colors` (D4)
- [ ] `actions.css` gives the large buttons at `marquee` only (D5)
- [ ] The surfaces reference page and the theme-authoring dimensions page document `marquee` and the widened register
- [ ] Contracts are regenerated in both copies, and CSS coverage and the SEO baseline check pass

## Approach

- `packages/transform/src/facets/prominence.ts`: `PROMINENCE_VALUES` and `ProminenceValue`. `types.ts` `defaultProminence` and `packages/runes/src/lib/universal-attribute-defs.ts` should read the constant rather than repeat it.
- `packages/lumina/styles/dimensions/surfaces.css`: the ramp and the new properties. `density.css` clears them at `[data-density]`, beside `--rf-prominence-size`. `sections.css`: the description reads `--rf-prominence-blurb-size`, and the title reads the fill.
- The flush padding goes next to `[data-elevation="flush"]` in `surfaces.css`. For cover, it sets `--rune-padding` on `[data-name="content"]`, as `hero.css` does.

## References

- {% ref "SPEC-183" /%}
- {% ref "SPEC-160" /%}: D7, the button-size decision D5 amends.

{% /work %}
