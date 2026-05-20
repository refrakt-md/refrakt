{% work id="WORK-220" status="ready" priority="high" complexity="small" tags="lumina, presets, nord, syntax-highlighting" source="SPEC-056" milestone="v0.14.1" %}

# Nord preset module

Author Lumina's Nord preset at `packages/lumina/src/presets/nord.ts` — a syntax-only preset (same shape as niwaki) that maps the official Nord palette's 16 named hues onto the extended `SyntaxTokens` contract. Nord is the validation case for SPEC-056: if its 16 hues land on distinct roles where Nord intends them to, the contract shape is correct. If the mapping forces collisions, the spec is revised before further imports.

## Acceptance Criteria

- [ ] `packages/lumina/src/presets/nord.ts` exports a `ThemeTokensConfig` overriding only `syntax.*` tokens (no chrome, no fonts, no status) — same scoped shape as niwaki
- [ ] Built to `dist/presets/nord.js`, exported at `./presets/nord` in `packages/lumina/package.json`
- [ ] Sets at least one *extended* optional role distinctly from its core fallback (e.g. `type` ≠ `function`) — proves the fidelity gain is real, not theoretical
- [ ] Light-mode and dark-mode syntax values both supplied via `modes.dark.syntax` (Nord is primarily a dark palette but ships an Aurora-derived light variant — confirm the light values against the Nord spec)
- [ ] Each hue in the file references its official Nord swatch name in a comment (e.g. `// Frost nord7`) for traceability against the upstream palette
- [ ] File header includes attribution: "Derived from the Nord palette by Arctic Ice Studio & Sven Greb, MIT licensed. https://www.nordtheme.com/"
- [ ] A test site (or merge-pipeline test) with `presets: ["@refrakt-md/lumina/presets/nord"]` against the neutral default renders code blocks with Nord colours
- [ ] Composes with tideline — `["tideline", "nord"]` renders tideline chrome with Nord syntax (same composition guarantee niwaki provides)
- [ ] No CSS coverage regressions in `npx vitest run packages/lumina/test/css-coverage.test.ts`

## Approach

Read the official Nord palette spec (https://www.nordtheme.com/docs/colors-and-palettes) and Nord's own syntax highlighting documentation (which roles each Frost/Aurora hue is intended for). Then map onto refrakt's extended contract:

Rough starting mapping (verify against Nord's own syntax docs before committing):

| Refrakt role | Nord hue | Rationale |
|---|---|---|
| keyword | Frost nord9 | Nord's "keyword" colour |
| function | Frost nord8 | Nord's "method/function" colour |
| type | Frost nord7 | Nord's "class/type" colour — the role split that motivates SPEC-056 |
| string | Aurora nord14 | Nord's "string" colour |
| constant | Aurora nord15 | Nord's "constant/number" colour |
| comment | Polar Night nord3 | Nord's "comment" colour |
| punctuation | Snow Storm nord4 | Nord's "operator/punctuation" colour |
| variable | Snow Storm nord4 | Nord's default text |
| ... | | |

If a role refrakt cares about has no clear Nord intent (Nord doesn't separately spec `tag` or `attribute`, for example), leave it unset — the fallback chain from WORK-219 handles it.

The verification gate is: every distinct hue in Nord's spec lands on a distinct role in refrakt, *or* two hues collapse to the same role because Nord intends that. If the contract forces a collision Nord wouldn't have wanted, that's a SPEC-056 problem — escalate before working around it.

## Dependencies

- {% ref "WORK-217" /%} — extended `SyntaxTokens` shape must exist
- {% ref "WORK-219" /%} — fallback chains so roles Nord doesn't set degrade gracefully
- {% ref "WORK-218" /%} — recommended (so colours actually show up on the new roles) but Nord's *correctness as a preset module* doesn't strictly depend on it

## References

- {% ref "SPEC-056" /%} — "Validation" section names Nord as the validation case
- Nord palette: https://www.nordtheme.com/docs/colors-and-palettes
- `packages/lumina/src/presets/niwaki.ts` — reference for preset module shape and attribution comment style

{% /work %}
