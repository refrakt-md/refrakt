{% work id="WORK-220" status="ready" priority="high" complexity="small" tags="lumina, presets, nord, syntax-highlighting" source="SPEC-056" milestone="v0.14.1" %}

# Nord preset module

Author Lumina's Nord preset at `packages/lumina/src/presets/nord.ts` — an *integrated* palette preset that maps the official Nord palette's 16 named hues onto the extended `SyntaxTokens` contract **and** sets the code-surface (`color.code.*`) tokens so opting into Nord produces code blocks on Nord's canonical Polar Night canvas. Nord is the validation case for SPEC-056's three extensions: syntax role widening, optional code-surface claiming, and (via WORK-223) scoped tint projection.

Where niwaki took the scoped "foreground only" position deliberately, Nord takes the integrated "canvas + foreground" position because that's how Nord was designed — its hues were tuned against `nord0` specifically, and rendering Nord foreground on Lumina's warm-cream bg misrepresents the palette.

## Acceptance Criteria

- [ ] `packages/lumina/src/presets/nord.ts` exports a `ThemeTokensConfig` overriding `syntax.*` and `color.code.*` (no chrome bg/surface, no fonts, no status, no radius/spacing/shadow — those stay chrome's responsibility)
- [ ] Built to `dist/presets/nord.js`, exported at `./presets/nord` in `packages/lumina/package.json`
- [ ] Sets at least one *extended* optional syntax role distinctly from its core fallback (e.g. `type` ≠ `function`) — proves the fidelity gain is real, not theoretical
- [ ] Sets `color.code.bg`, `color.code.text`, and `color.code.border` for at least one mode (dark) — proves the canvas-claiming path works end-to-end
- [ ] Light-mode and dark-mode values both supplied via `modes.dark.*` (Nord is dark-canonical but ships an Aurora-derived light variant — verify the light values against the Nord spec)
- [ ] Each hue in the file references its official Nord swatch name in a comment (e.g. `// Frost nord7`) for traceability against the upstream palette
- [ ] File header includes attribution: "Derived from the Nord palette by Arctic Ice Studio & Sven Greb, MIT licensed. https://www.nordtheme.com/"
- [ ] A test site (or merge-pipeline test) with `presets: ["@refrakt-md/lumina/presets/nord"]` against the neutral default renders code blocks with Nord colours **on Nord's canvas** — verifying both the syntax tokens and code-surface tokens cascade together
- [ ] Composes with tideline — `["tideline", "nord"]` renders tideline chrome with Nord syntax + Nord code surface. The rest of the page (body bg, surfaces, buttons, borders) stays in tideline; only the code surface flips to Nord
- [ ] No CSS coverage regressions in `npx vitest run packages/lumina/test/css-coverage.test.ts`

## Approach

Read the official Nord palette spec (https://www.nordtheme.com/docs/colors-and-palettes) and Nord's own syntax highlighting documentation (which roles each Frost/Aurora hue is intended for, and which Polar Night/Snow Storm hues are intended for canvas/text). Then map onto refrakt's extended contract:

Rough starting mapping for syntax (verify against Nord's own syntax docs before committing):

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

For code surface (dark mode):

| Refrakt token | Nord hue | Rationale |
|---|---|---|
| `color.code.bg` | Polar Night nord0 (#2e3440) | Nord's canonical dark canvas |
| `color.code.text` | Snow Storm nord4 (#d8dee9) | Nord's default text on dark canvas |
| `color.code.border` | Polar Night nord1 (#3b4252) | Slightly lighter than canvas — Nord's UI panel separator |

For code surface (light mode):

| Refrakt token | Nord hue | Rationale |
|---|---|---|
| `color.code.bg` | Snow Storm nord6 (#eceff4) | Nord's canonical light canvas |
| `color.code.text` | Polar Night nord0 (#2e3440) | Nord's default text on light canvas |
| `color.code.border` | Snow Storm nord5 (#e5e9f0) | Slightly darker than canvas |

If a syntax role refrakt cares about has no clear Nord intent (Nord doesn't separately spec `tag` or `attribute`, for example), leave it unset — the fallback chain from WORK-219 handles it.

The verification gate is: every distinct hue in Nord's spec lands on a distinct role in refrakt, *or* two hues collapse to the same role because Nord intends that. If the contract forces a collision Nord wouldn't have wanted, that's a SPEC-056 problem — escalate before working around it.

## Dependencies

- {% ref "WORK-217" /%} — extended `SyntaxTokens` shape must exist
- {% ref "WORK-219" /%} — fallback chains so roles Nord doesn't set degrade gracefully
- {% ref "WORK-218" /%} — recommended (so colours actually show up on the new roles) but Nord's *correctness as a preset module* doesn't strictly depend on it

## References

- {% ref "SPEC-056" /%} — "Validation" section names Nord as the validation case; "Code-surface (canvas) tokens" describes the canvas-claiming path
- Nord palette: https://www.nordtheme.com/docs/colors-and-palettes
- `packages/lumina/src/presets/niwaki.ts` — reference for preset module shape and attribution comment style (note: niwaki is the *scoped* archetype; Nord is the *integrated* archetype)

{% /work %}
