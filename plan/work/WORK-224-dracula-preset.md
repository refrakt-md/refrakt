{% work id="WORK-224" status="ready" priority="high" complexity="small" tags="lumina, presets, dracula, syntax-highlighting" source="SPEC-057" milestone="v0.14.2" %}

# Dracula preset module + doc page

Ship the Dracula syntax palette as an integrated refrakt preset, following the pattern established by {% ref "WORK-220" /%} (Nord). Dark-canonical, no official light variant — ships as dark-only via `modes.dark`; light mode (when a user is on a light-mode site and the Dracula tint is applied) inherits the surrounding chrome.

## Acceptance Criteria

- [ ] `packages/lumina/src/presets/dracula.ts` exports a `ThemeTokensConfig` overriding chrome accents (`color.bg/surface.base/text/muted/border/primary`), `color.code.*`, and `syntax.*` for dark mode only
- [ ] Built and exported at `./presets/dracula` in `packages/lumina/package.json`
- [ ] Role mapping follows Dracula's official spec: keyword (Pink `#ff79c6`), function (Green `#50fa7b`), type (Cyan `#8be9fd`), string (Yellow `#f1fa8c`), constant (Purple `#bd93f9`), comment (Grey `#6272a4`), variable (Foreground `#f8f8f2`)
- [ ] Sets at least three SPEC-056 extended roles distinctly — `type` ≠ `function`, `tag`, `attribute` — proving the fidelity gain over a 9-role mapping
- [ ] Each hue in the file references its Dracula swatch name in a comment (e.g. `// Pink`)
- [ ] File header includes attribution: "Derived from Dracula by Zeno Rocha and contributors, MIT licensed. https://draculatheme.com/"
- [ ] `packages/lumina/test/dracula-preset.test.ts` mirrors `nord-preset.test.ts` — structural shape, role splits, code-surface canvas, CSS generation, composition with tideline / niwaki / Lumina
- [ ] `site/content/themes/dracula.md` follows the Nord doc page structure: intro + opt-in + palette (dark-only) + live preview (shared TS+JSX snippet) + composing with tideline + attribution
- [ ] Doc page palette + code preview render in Dracula colours on the niwaki-active docs site
- [ ] No regressions in CSS coverage tests; full suite green

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

{% /work %}
