{% work id="WORK-204" status="ready" priority="high" complexity="medium" tags="lumina, presets, tideline" source="SPEC-051" milestone="v0.14.0" %}

# Tideline preset module

Extract Lumina's current cream-and-navy palette into a named full preset at `packages/lumina/presets/tideline/`. Colour values are a verbatim transcription of the previous Lumina defaults (those values left the base in {% ref "WORK-200" /%}); typography is *upgraded* as part of the preset bundle — `font.sans` becomes IBM Plex Sans and `font.mono` becomes IBM Plex Mono, replacing the previous Outfit.

## Acceptance Criteria

- [ ] `packages/lumina/presets/tideline/index.ts` exists, exports a `ThemeTokensConfig` as default (or named `config` — match the convention from {% ref "WORK-190" /%})
- [ ] Tideline's colour tokens are a verbatim transcription of the previous Lumina defaults (cream + maritime navy across body, syntax, and primary tokens; old dark mode preserved)
- [ ] Tideline's typography overrides ship: `font.sans = "'IBM Plex Sans', system-ui, sans-serif"`, `font.mono = "'IBM Plex Mono', ui-monospace, …"`
- [ ] `packages/lumina/presets/tideline/README.md` exists, explains what tideline is, names it as the warm-paper maritime preset, and shows the one-line opt-in (`"presets": ["@refrakt-md/lumina/presets/tideline"]`)
- [ ] A test site with `presets: ["@refrakt-md/lumina/presets/tideline"]` against the neutral default renders colour-identical to today's Lumina (visual diff verified; font change is expected per spec)
- [ ] No regressions in Lumina's tint set (tideline doesn't redefine tints; they continue to inherit from Lumina's base)

## Approach

This is mostly a careful copy of the values that previously lived in `packages/lumina/tokens/base.css` and `tokens/dark.css`. With Lumina migrated to config in {% ref "WORK-191" /%} and the new neutral default landing in {% ref "WORK-200" /%}, this work captures "what used to be Lumina's default" into a named preset.

Naming the export: lean toward a single default export to keep the consumer side simple — `import tideline from '@refrakt-md/lumina/presets/tideline'`.

The README is brief — what it is (one paragraph), how to opt in (one snippet), what changes if you do (one short list). Reference SPEC-051 for the design rationale rather than rewriting it.

The font change is documented prominently in the README — existing tideline users *will* see Plex Sans instead of Outfit. The migration escape hatch (pin `font.sans` back to Outfit via `theme.tokens.font.sans`) is mentioned with a one-liner.

## Dependencies

- {% ref "WORK-185" /%}, {% ref "WORK-190" /%} — preset shape + loading.
- {% ref "WORK-191" /%} — Lumina config-driven (so the "what used to be Lumina's defaults" values are now portable data).
- {% ref "WORK-200" /%} — neutral default exists (otherwise the test site has no neutral baseline to apply tideline against).

## References

- {% ref "SPEC-051" /%} — "The Tideline Preset" section
- `packages/lumina/src/config.ts` (post-{% ref "WORK-191" /%}, pre-{% ref "WORK-200" /%}) — source of truth for the values being captured

{% /work %}
