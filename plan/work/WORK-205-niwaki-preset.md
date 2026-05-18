{% work id="WORK-205" status="ready" priority="high" complexity="small" tags="lumina, presets, niwaki, syntax-highlighting" source="SPEC-051" milestone="v0.14.0" %}

# Niwaki preset module

Author Lumina's syntax-only preset at `packages/lumina/presets/niwaki/`. Overrides only the seven syntax tokens (pine, sakura, momiji, kuri, wakaba + comment + punctuation, in two modes); chrome, fonts, status, and primary inherit from whichever theme/preset is layered above. Composes: `["niwaki"]` against neutral gives Japanese-garden code on neutral chrome; `["tideline", "niwaki"]` gives tideline chrome with niwaki code.

## Acceptance Criteria

- [ ] `packages/lumina/presets/niwaki/index.ts` exists, exports a `ThemeTokensConfig` overriding only `syntax.*` tokens
- [ ] Light-mode syntax values per SPEC-051 niwaki table:
  - [ ] `keyword = #2d5230` (matsu — deep pine)
  - [ ] `function = #b35070` (sakura — cherry blossom)
  - [ ] `string = #c4501c` (momiji — fiery maple)
  - [ ] `number = #9c721a` (kuri — antique amber)
  - [ ] `type = #6b8a35` (wakaba — young leaf)
  - [ ] `comment = #7d7062` italic (ishi — warm stone)
  - [ ] `punctuation = #8a7c6e`
- [ ] Dark-mode syntax values per the dark column of the niwaki table
- [ ] Niwaki does *not* set any non-syntax tokens — chrome, fonts, status, primary all inherit
- [ ] `packages/lumina/presets/niwaki/README.md` exists, explains what niwaki is (Japanese-garden-inspired *syntax* palette, scoped intentionally), names the metaphor mapping (matsu/sakura/etc.), and credits the Japanese visual tradition the palette draws from
- [ ] A test site with `presets: ["@refrakt-md/lumina/presets/niwaki"]` against the neutral default renders code blocks with the niwaki palette and chrome unchanged from neutral default
- [ ] A test site with `presets: ["@refrakt-md/lumina/presets/tideline", "@refrakt-md/lumina/presets/niwaki"]` renders code blocks with the niwaki palette and chrome from tideline (Plex Sans body, cream + navy chrome)

## Approach

Authors the seven token overrides into a `ThemeTokensConfig` that touches *only* `syntax.*`. No `color.*`, no `font.*`, no `modes.*` overrides outside syntax.

README structure (brief):

- One paragraph on what the preset is and the metaphor (pine for keyword, sakura for function, etc.)
- One snippet showing the opt-in (`"presets": ["@refrakt-md/lumina/presets/niwaki"]`)
- One snippet showing composition with tideline
- A brief credit to the Japanese visual tradition (one or two sentences — homage framing, no overclaiming)

The composition test is the most important verification — confirms the scoped-preset architecture genuinely works rather than only working in isolation.

## Dependencies

- {% ref "WORK-185" /%}, {% ref "WORK-190" /%} — preset infrastructure.
- {% ref "WORK-191" /%} — Lumina config-driven.
- {% ref "WORK-201" /%} — neutral default syntax palette exists so we have a baseline to *replace* in tests.

## References

- {% ref "SPEC-051" /%} — "The Niwaki Preset" section with the full palette table and rationale
- "Cultural sensitivity" note in SPEC-051 — re-state in the README

{% /work %}
