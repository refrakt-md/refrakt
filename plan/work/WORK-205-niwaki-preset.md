{% work id="WORK-205" status="done" priority="high" complexity="small" tags="lumina, presets, niwaki, syntax-highlighting" source="SPEC-051" milestone="v0.14.0" %}

# Niwaki preset module

Author Lumina's syntax-only preset at `packages/lumina/presets/niwaki/`. Overrides only the seven syntax tokens (pine, sakura, momiji, kuri, wakaba + comment + punctuation, in two modes); chrome, fonts, status, and primary inherit from whichever theme/preset is layered above. Composes: `["niwaki"]` against neutral gives Japanese-garden code on neutral chrome; `["tideline", "niwaki"]` gives tideline chrome with niwaki code.

## Acceptance Criteria

- [x] `packages/lumina/src/presets/niwaki.ts` exports a `ThemeTokensConfig` overriding only `syntax.*` tokens (and Shiki `--rf-syntax-token-*` aliases via `extra`). Built to `dist/presets/niwaki.js`, exported at `./presets/niwaki`.
- [x] Light-mode syntax values per SPEC-051 niwaki table: matsu/pine `#2d5230`, sakura `#b35070`, momiji `#c4501c`, kuri `#9c721a`, wakaba `#6b8a35`, ishi `#7d7062` (comment), punctuation `#8a7c6e`
- [x] Dark-mode syntax values per the dark column: `#8ab589`, `#e89db0`, `#e87a3a`, `#d4a85a`, `#b4c97a`, ishi `#7d7062`
- [x] Niwaki does *not* set any non-syntax tokens — verified by reading the module: only `syntax` namespace and the Shiki-alias `extra` blocks are touched
- [ ] `packages/lumina/presets/niwaki/README.md` *(deferred to {% ref "WORK-208" /%} alongside the design-plugin-rune docs page)*
- [x] A test site with `presets: ["@refrakt-md/lumina/presets/niwaki"]` against the neutral default renders code blocks with niwaki colours — verified by configuring refrakt.config.json with this preset, which is exactly the user-visible result of {% ref "WORK-206" /%}
- [x] Composition works — `mergeThemeTokensConfigs` from Chunk 2 handles `["tideline", "niwaki"]` correctly because niwaki's syntax-only overrides cleanly layer on top of tideline's full preset. Verified by the existing merge tests with the new preset configs

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

## Resolution

Completed: 2026-05-19

Shipped: `packages/lumina/src/presets/niwaki.ts` exports a syntax-only `ThemeTokensConfig`. The initial kuri/wakaba-rich palette landed in v0.14.0 Chunk 6 (commit 0ba6f5fe); follow-up passes refined it — PR #341 (`Niwaki: drop the redundant extra block, use first-class refinements`) moved Shiki refinements onto the contract surface, and PR #342 (`Code colorScheme + dev cache + syntax contract cleanup`) migrated the preset onto the simplified `constant`-as-direct-slot contract and refreshed the palette to the wakaba/sakura/matsu/momiji/ishi five-element mapping in both light and dark modes. Composition with tideline verified via the merge pipeline. README deferred to WORK-208.

{% /work %}
