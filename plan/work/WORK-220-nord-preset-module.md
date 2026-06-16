{% work id="WORK-220" status="done" priority="high" complexity="simple" tags="lumina, presets, nord, syntax-highlighting" source="SPEC-056" milestone="v0.14.1" %}

# Nord preset module

Author Lumina's Nord preset at `packages/lumina/src/presets/nord.ts` — an *integrated* palette preset that maps the official Nord palette's 16 named hues onto the extended `SyntaxTokens` contract **and** sets the code-surface (`color.code.*`) tokens so opting into Nord produces code blocks on Nord's canonical Polar Night canvas. Nord is the validation case for SPEC-056's three extensions: syntax role widening, optional code-surface claiming, and (via WORK-223) scoped tint projection.

Where niwaki took the scoped "foreground only" position deliberately, Nord takes the integrated "canvas + foreground" position because that's how Nord was designed — its hues were tuned against `nord0` specifically, and rendering Nord foreground on Lumina's warm-cream bg misrepresents the palette.

## Acceptance Criteria

- [x] `packages/lumina/src/presets/nord.ts` exports a `ThemeTokensConfig` overriding `syntax.*` and `color.code.*` (no chrome bg/surface, no fonts, no status, no radius/spacing/shadow — those stay chrome's responsibility)
- [x] Built to `dist/presets/nord.js`, exported at `./presets/nord` in `packages/lumina/package.json`
- [x] Sets at least one *extended* optional syntax role distinctly from its core fallback (e.g. `type` ≠ `function`) — proves the fidelity gain is real, not theoretical
- [x] Sets `color.code.bg`, `color.code.text`, and `color.code.border` for at least one mode (dark) — proves the canvas-claiming path works end-to-end
- [x] Light-mode and dark-mode values both supplied via `modes.dark.*` (Nord is dark-canonical but ships an Aurora-derived light variant — verify the light values against the Nord spec)
- [x] Each hue in the file references its official Nord swatch name in a comment (e.g. `// Frost nord7`) for traceability against the upstream palette
- [x] File header includes attribution: "Derived from the Nord palette by Arctic Ice Studio & Sven Greb, MIT licensed. https://www.nordtheme.com/"
- [x] A test site (or merge-pipeline test) with `presets: ["@refrakt-md/lumina/presets/nord"]` against the neutral default renders code blocks with Nord colours **on Nord's canvas** — verifying both the syntax tokens and code-surface tokens cascade together
- [x] Composes with tideline — `["tideline", "nord"]` renders tideline chrome with Nord syntax + Nord code surface. The rest of the page (body bg, surfaces, buttons, borders) stays in tideline; only the code surface flips to Nord
- [x] No CSS coverage regressions in `npx vitest run packages/lumina/test/css-coverage.test.ts`

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

## Resolution

Completed: 2026-05-20

Branch: \`claude/spec-056-milestone-v0-14-1\`

### What was done

- **\`packages/lumina/src/presets/nord.ts\`** (new) — Nord preset as a \`ThemeTokensConfig\` overriding \`syntax.*\` and \`color.code.*\` only. Both modes (light + dark) supplied. Every hue annotated with its official Nord swatch name (Polar Night nord0–3, Snow Storm nord4–6, Frost nord7–10, Aurora nord11–15) for traceability.
- **\`packages/lumina/package.json\`** — added \`./presets/nord\` export entry mirroring the niwaki/tideline pattern, so consumers can \`import nord from '@refrakt-md/lumina/presets/nord'\`.
- **\`packages/lumina/test/nord-preset.test.ts\`** (new) — 11 tests covering: structural shape (no chrome/fonts/structural keys), the \`type\` ≠ \`function\` fidelity-gain split, both modes' \`color.code.*\` canvas claims, CSS generation through the token-stylesheet generator, and composition with tideline / niwaki / Lumina via \`mergeThemeTokensConfigs\`. The "no chrome / typography / structural tokens" test enforces Nord's scope boundary at the generated-CSS layer — any future drift would fail the test.

### Note on \`color.code.border\`

The work item's acceptance criterion mentioned \`color.code.bg/text/border\`, but the \`TokenContract\` defines \`color.code\` as \`{ bg, text, 'inline-bg' }\` — there is no \`border\` slot. The criterion is satisfied to the extent the contract allows: Nord sets \`bg\`, \`text\`, and \`inline-bg\` for both modes. If we need a code-surface border token, that's a separate SPEC-048 contract amendment.

### Nord palette → role mapping highlights

The mapping follows Nord's own syntax-highlighting reference. SPEC-056's role-widening lets these distinctions land cleanly:

- **type ≠ function** (Frost nord7 \`#8fbcbb\` vs Frost nord8 \`#88c0d0\`) — the motivating SPEC-056 split.
- **tag ≠ keyword** (Frost nord10 \`#5e81ac\` vs Frost nord9 \`#81a1c1\`) — Nord renders HTML tags as deep Frost, distinct from keywords.
- **attribute ≠ function** (Frost nord7 vs Frost nord8) — attributes align with the type-family.
- **operator ≠ punctuation** (Frost nord9 \`#81a1c1\` vs Polar Night nord3 \`#4c566a\`) — operators read as keyword-family.
- **number ≠ constant** (Aurora nord12 orange \`#d08770\` vs Aurora nord15 purple \`#b48ead\`) — Nord splits numbers from booleans/null/symbols.
- **regex ≠ string** (Aurora nord13 yellow \`#ebcb8b\` vs Aurora nord14 green \`#a3be8c\`) — regex gets its own dedicated hue.

Roles Nord doesn't separately spec (\`property\`, \`parameter\`, \`link\`, \`string-expression\`) are left unset; they cascade via the fallback chain emitted by the token-stylesheet generator (WORK-219).

### Test results

- \`npx vitest run packages/lumina/test/nord-preset.test.ts\` — 11/11 pass.
- \`npx vitest run packages/lumina/\` — all lumina tests pass.
- Full suite \`npm test\` — 2520/2520 pass across 205 test files.

### Files touched

- \`packages/lumina/src/presets/nord.ts\` (new)
- \`packages/lumina/package.json\` (added export entry)
- \`packages/lumina/test/nord-preset.test.ts\` (new, 11 tests)

{% /work %}
