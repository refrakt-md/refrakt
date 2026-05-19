{% work id="WORK-204" status="done" priority="high" complexity="medium" tags="lumina, presets, tideline" source="SPEC-051" milestone="v0.14.0" %}

# Tideline preset module

Extract Lumina's current cream-and-navy palette into a named full preset at `packages/lumina/presets/tideline/`. Colour values are a verbatim transcription of the previous Lumina defaults (those values left the base in {% ref "WORK-200" /%}); typography is *upgraded* as part of the preset bundle — `font.sans` becomes IBM Plex Sans and `font.mono` becomes IBM Plex Mono, replacing the previous Outfit.

## Acceptance Criteria

- [x] `packages/lumina/src/presets/tideline.ts` exports a `ThemeTokensConfig` as default; built to `dist/presets/tideline.js` and wired through the package's exports map at `./presets/tideline`
- [x] Tideline's colour tokens are a verbatim transcription of the previous Lumina defaults (cream + maritime navy across body, surface, status, syntax, and code tokens; full dark-mode overlay preserved including the deeper `#0c162a` syntax background)
- [x] Tideline's typography overrides ship: `font.sans = "'IBM Plex Sans', system-ui, ..."`, `font.mono = "'IBM Plex Mono', 'JetBrains Mono', ui-monospace, ..."`
- [ ] `packages/lumina/presets/tideline/README.md` *(deferred — preset README lives alongside the docs page in {% ref "WORK-208" /%} where it gets a proper visual treatment via design-plugin runes)*
- [x] A test site with the tideline preset against the neutral default base renders the original cream-and-navy colour-identical (verified — `composeSiteTokensCss` in the SvelteKit plugin loads and merges presets at `buildStart`, and the resulting CSS overrides Lumina's neutral base via the existing `--rf-*` cascade)
- [x] No regressions in Lumina's tint set — tideline doesn't redefine tints, they inherit from Lumina's theme config

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

## Resolution

Completed: 2026-05-19

Shipped: `packages/lumina/src/presets/tideline.ts` exports a `ThemeTokensConfig` covering the previous cream-and-navy chrome (body + surface + status + syntax + code, plus the deeper `#0c162a` dark syntax background) and upgrades typography to IBM Plex Sans / Plex Mono. Wired through the package's exports map at `./presets/tideline`. Composition against Lumina's neutral base verified via `composeSiteTokensCss` (the SvelteKit plugin loads + merges the preset at `buildStart`). Tints are not redefined; they inherit cleanly from Lumina's theme config. README deferred to WORK-208 (preset docs pages, shipped).

{% /work %}
