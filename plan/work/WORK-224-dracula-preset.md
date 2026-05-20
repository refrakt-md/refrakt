{% work id="WORK-224" status="done" priority="high" complexity="small" tags="lumina, presets, dracula, syntax-highlighting" source="SPEC-057" milestone="v0.14.2" %}

# Dracula preset module + doc page

Ship the Dracula syntax palette as an integrated refrakt preset, following the pattern established by {% ref "WORK-220" /%} (Nord). Dark-canonical, no official light variant — ships as dark-only via `modes.dark`; light mode (when a user is on a light-mode site and the Dracula tint is applied) inherits the surrounding chrome.

## Acceptance Criteria

- [x] `packages/lumina/src/presets/dracula.ts` exports a `ThemeTokensConfig` overriding chrome accents (`color.bg/surface.base/text/muted/border/primary`), `color.code.*`, and `syntax.*` for dark mode only
- [x] Built and exported at `./presets/dracula` in `packages/lumina/package.json`
- [x] Role mapping follows Dracula's official spec: keyword (Pink `#ff79c6`), function (Green `#50fa7b`), type (Cyan `#8be9fd`), string (Yellow `#f1fa8c`), constant (Purple `#bd93f9`), comment (Grey `#6272a4`), variable (Foreground `#f8f8f2`)
- [x] Sets at least three SPEC-056 extended roles distinctly — `type` ≠ `function`, `tag`, `attribute` — proving the fidelity gain over a 9-role mapping
- [x] Each hue in the file references its Dracula swatch name in a comment (e.g. `// Pink`)
- [x] File header includes attribution: "Derived from Dracula by Zeno Rocha and contributors, MIT licensed. https://draculatheme.com/"
- [x] `packages/lumina/test/dracula-preset.test.ts` mirrors `nord-preset.test.ts` — structural shape, role splits, code-surface canvas, CSS generation, composition with tideline / niwaki / Lumina
- [x] `site/content/themes/dracula.md` follows the Nord doc page structure: intro + opt-in + palette (dark-only) + live preview (shared TS+JSX snippet) + composing with tideline + attribution
- [x] Doc page palette + code preview render in Dracula colours on the niwaki-active docs site
- [x] No regressions in CSS coverage tests; full suite green

## Approach

Dark-only palette — ship `modes.dark` populated and leave the base level mostly empty (chrome accents fall through to whatever theme/preset sits beneath). When opted in as the active preset, Dracula effectively forces dark rendering since light mode has no Dracula values; document this explicitly in the file header.

For the palette doc page, both `{% palette %}` blocks can render the dark palette — there's no light variant to show. Use a single "Dracula — the palette" block instead of two light/dark blocks, or render the same dark palette twice with the same swatches.

Verify the role splits with the comprehensive TS+JSX snippet from the Nord page — `User` should read Cyan (type), `findUser` should read Green (function), `<Button>` should read Pink-or-Cyan depending on Dracula's intent for JSX tags.

## Dependencies

- {% ref "WORK-220" /%} — Nord preset module is the structural reference
- {% ref "WORK-221" /%} — Nord doc page is the doc structural reference
- All SPEC-056 mechanics (WORK-217 / WORK-218 / WORK-219 / WORK-223) — shipped in v0.14.1

## References

- {% ref "SPEC-057" /%} — "Dracula" subsection
- Dracula palette: https://spec.draculatheme.com/
- Dracula syntax token mapping: https://github.com/dracula/dracula-theme/blob/master/SPECIFICATION.md

## Resolution

Completed: 2026-05-20

Branch: \`claude/spec-057-v0-14-2-implementation\`

### What was done

- \`packages/lumina/src/presets/dracula.ts\` — Dracula as a dark-only \`ThemeTokensConfig\`. All chrome accents + code-surface + syntax (11 base roles + 5 extended) populated via \`modes.dark\`. Each hue annotated with its Dracula swatch name (Pink, Cyan, Green, Yellow, Purple, Red, Orange, Foreground, Current Line, Comment, Background) for traceability.
- \`packages/lumina/package.json\` — added \`./presets/dracula\` export entry.
- \`packages/lumina/test/dracula-preset.test.ts\` — 11 tests covering structural shape (dark-only invariant), role splits (type ≠ function, regex ≠ string), CSS generation (chrome + code-surface + syntax all in the dark block; no light block), and composition with tideline / niwaki / Lumina.
- \`site/content/themes/dracula.md\` — doc page following the Nord pattern. Single palette block with \`tint-mode="dark"\` (no light variant). Live preview wraps the shared TS+JSX snippet in \`{% codegroup tint="dracula" %}\`.
- \`refrakt.config.json\` — added \`sites.main.tints.dracula\` so the doc page can use \`tint="dracula"\`.
- \`site/content/themes/_layout.md\` — Dracula listed in the Syntax presets group.

### SPEC-056 extended-role exercise

Dracula sets 5 of the 7 SPEC-056 extended optional roles distinctly: \`type\` (Cyan), \`number\` (Purple, same as constant — same hue, intentional collapse), \`regex\` (Red, distinct from string Yellow), \`tag\` (Pink — same as keyword, intentional), \`attribute\` (Green — same as function, intentional), \`operator\` (Pink). \`parameter\` and \`property\` left unset (Dracula doesn't separately spec them). The Cyan/Green split between \`type\` and \`function\` is the SPEC-056 headline fidelity gain over a 9-role mapping.

### Test results

- \`npx vitest run packages/lumina/test/dracula-preset.test.ts\` — 11/11 pass.
- Full suite \`npm test\` — 2547/2547 pass across 207 test files.
- Site builds clean: \`data-tint="dracula"\` stamps on the doc page; \`[data-tint=dracula][data-color-scheme=dark]\` rule in the CSS bundle.

### Files touched

- \`packages/lumina/src/presets/dracula.ts\` (new)
- \`packages/lumina/package.json\` (added export entry)
- \`packages/lumina/test/dracula-preset.test.ts\` (new, 11 tests)
- \`site/content/themes/dracula.md\` (new)
- \`site/content/themes/_layout.md\` (Dracula in nav)
- \`refrakt.config.json\` (Dracula in site tints)

{% /work %}
