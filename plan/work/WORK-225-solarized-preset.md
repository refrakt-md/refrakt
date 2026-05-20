{% work id="WORK-225" status="done" priority="high" complexity="small" tags="lumina, presets, solarized, syntax-highlighting" source="SPEC-057" milestone="v0.14.2" %}

# Solarized preset module + doc page

Ship Ethan Schoonover's Solarized palette as an integrated refrakt preset with **both light and dark modes from the same 16-hue family**. Solarized is the validation case for SPEC-057's "one preset per palette identity, light + dark in `modes.dark`" decision — it's the palette most deliberately coordinated across modes, so if our preset shape carries it cleanly, it carries everything.

## Acceptance Criteria

- [x] `packages/lumina/src/presets/solarized.ts` exports a `ThemeTokensConfig` overriding chrome accents, `color.code.*`, and `syntax.*` for both light and dark modes
- [x] Light mode: canvas `base3 #fdf6e3`, text `base00 #657b83`. Dark mode: canvas `base03 #002b36`, text `base0 #839496`. Same eight accent hues in both modes
- [x] Built and exported at `./presets/solarized` in `packages/lumina/package.json`
- [x] Role mapping follows the Solarized syntax-highlighting convention (Yellow=class/type, Orange=number/constant, Red=keyword, Magenta=function-call, Violet=string, Blue=function-decl, Cyan=string-escape, Green=comment) — adapt as needed to refrakt's role vocabulary
- [x] Each hue in the file references its Solarized swatch name (`base03`, `yellow`, `orange`, `red`, `magenta`, `violet`, `blue`, `cyan`, `green`, etc.)
- [x] File header includes attribution: "Derived from Solarized by Ethan Schoonover, MIT licensed. https://ethanschoonover.com/solarized/"
- [x] `packages/lumina/test/solarized-preset.test.ts` mirrors `nord-preset.test.ts` — including assertions that verify the same accent hues appear in both light and dark blocks (the Solarized invariant)
- [x] `site/content/themes/solarized.md` follows the Nord doc page structure with both light and dark palette blocks
- [x] Doc page intro calls out Solarized's design intent — the same 16 hues coordinated across two canvases — and contrasts with palettes that ship different hues per mode
- [x] No regressions in CSS coverage tests; full suite green

## Approach

The implementation pattern here is the headline test of SPEC-057: every other multi-mode palette in the lineup can shift hues between light and dark, but Solarized's design intent is that the *exact same* eight accent hues appear in both modes. Our preset shape (`modes.dark` as an overlay on the light base) handles this naturally — `syntax.keyword: red` at the base, and `modes.dark.syntax.keyword` either omitted (same value) or set to the same red for clarity.

Decision to settle in implementation: do we *omit* the same-hue values from `modes.dark` (cleaner, smaller file, relies on cascade) or *restate* them (more explicit, larger file, clearer to a reader of just the dark block)? My lean: restate them, with a comment at the top of `modes.dark.syntax` saying "Solarized's design intent is that the accent hues are mode-symmetric — these values intentionally match the base block."

Map Solarized's syntax-highlighting reference (https://ethanschoonover.com/solarized/#usage-development) onto refrakt's roles. Notable splits SPEC-057 will validate: Solarized splits class/type (Yellow) from function (Blue) — exercises `type`. Number (Orange) is split from boolean-constant (also Orange or Red depending on language) — exercises `number`.

## Dependencies

- {% ref "WORK-220" /%} — Nord preset module is the structural reference
- {% ref "WORK-221" /%} — Nord doc page is the doc structural reference

## References

- {% ref "SPEC-057" /%} — "Solarized" subsection
- Solarized palette + syntax mapping: https://ethanschoonover.com/solarized/
- GitHub: https://github.com/altercation/solarized

## Resolution

Completed: 2026-05-20

Branch: \`claude/spec-057-v0-14-2-implementation\`

### What was done

- \`packages/lumina/src/presets/solarized.ts\` — full \`ThemeTokensConfig\` with light base + \`modes.dark\` overlay. Eight accent hues identical across modes (Solarized's design invariant); only the four base tones (canvas, surface, text, muted) flip.
- \`packages/lumina/package.json\` — \`./presets/solarized\` export.
- \`packages/lumina/test/solarized-preset.test.ts\` — 12 tests. The headline assertion: an "accent-mode-symmetric" loop iterates 11 syntax roles and verifies each has the same hex in both modes. The mode-flipped base tones (canvas/text/muted/border) are separately asserted to *differ* between modes — so the test catches both "Solarized invariant broken" (accents changed across modes) and "Solarized misimplemented" (canvas didn't flip).
- \`site/content/themes/solarized.md\` — doc page following the Nord pattern, with intro framing the unified-mode design intent and a deliberately-shorter dark palette block (only the base tones differ; accents reuse the light values).
- \`refrakt.config.json\` — added \`sites.main.tints.solarized\`.
- \`site/content/themes/_layout.md\` — Solarized in Syntax presets nav.

### SPEC-056 extended-role exercise

Solarized splits 5 of the 7 extended optional roles distinctly:
- \`type\` (Yellow #b58900) ≠ \`function\` (Blue #268bd2) — the SPEC-056 headline split
- \`number\` (Orange #cb4b16) ≠ \`constant\` (Violet #6c71c4)
- \`regex\` (Green #859900) ≠ \`string\` (Cyan #2aa198)
- \`operator\` (Violet) ≠ \`punctuation\` (base00/base0 — mode-flipped default text)
- \`attribute\` (Blue) — set explicitly even though it equals function (the role is named in Solarized's spec)
\`tag\` (Red, same as keyword by Solarized's intent), \`parameter\`, \`property\`, \`link\`, \`string-expression\` set distinctly or omitted to cascade.

### Test results

- \`npx vitest run packages/lumina/test/solarized-preset.test.ts\` — 12/12 pass.
- Full suite \`npm test\` — 2559/2559 pass across 208 test files.
- Site builds clean: \`data-tint="solarized"\` stamps on the doc page; both \`[data-tint=solarized]\` (light) and \`[data-tint=solarized][data-color-scheme=dark]\` rules in the CSS bundle.

### Files touched

- \`packages/lumina/src/presets/solarized.ts\` (new)
- \`packages/lumina/package.json\` (added export)
- \`packages/lumina/test/solarized-preset.test.ts\` (new, 12 tests)
- \`site/content/themes/solarized.md\` (new)
- \`site/content/themes/_layout.md\` (Solarized in nav)
- \`refrakt.config.json\` (Solarized in tints)

{% /work %}
