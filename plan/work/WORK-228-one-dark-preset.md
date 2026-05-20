{% work id="WORK-228" status="ready" priority="medium" complexity="small" tags="lumina, presets, one-dark, syntax-highlighting" source="SPEC-057" milestone="v0.14.2" %}

# One Dark preset module + doc page

Ship Atom's One Dark as an integrated refrakt preset. Phase 1 ships dark only — the "One Light" sibling is deferred to Phase 2 since it's a separate published theme rather than a `modes` overlay on the same hue family. Important historical: Atom was the first widely-adopted editor with custom theme APIs, and One Dark is the palette that defined the "blue-grey + warm-accent" aesthetic now common across modern editors.

## Acceptance Criteria

- [ ] `packages/lumina/src/presets/one-dark.ts` exports a `ThemeTokensConfig` with chrome accents, `color.code.*`, and `syntax.*` for dark mode only (via `modes.dark`, like Dracula)
- [ ] Canvas `#282c34`, text `#abb2bf`. Accents: red `#e06c75`, green `#98c379`, yellow `#e5c07b`, blue `#61afef`, purple `#c678dd`, cyan `#56b6c2`
- [ ] Role mapping follows Atom's One Dark syntax: keyword (Purple), function (Blue), type (Yellow), string (Green), constant (Orange `#d19a66`), comment (Grey `#5c6370`), variable (Light Foreground)
- [ ] Sets at least three SPEC-056 extended roles distinctly
- [ ] Each hue in the file references its One Dark variable name
- [ ] File header includes attribution: "Derived from One Dark by GitHub / Atom contributors, MIT licensed. https://github.com/atom/atom/tree/master/packages/one-dark-syntax"
- [ ] `packages/lumina/test/one-dark-preset.test.ts` mirrors `nord-preset.test.ts`
- [ ] `site/content/themes/one-dark.md` follows the Nord doc page structure (dark-only palette; intro notes One Light is deferred to Phase 2)
- [ ] No regressions in CSS coverage tests; full suite green

## Approach

Atom's one-dark-syntax package publishes its colour variables in `styles/colors.less` (https://github.com/atom/atom/blob/master/packages/one-dark-syntax/styles/colors.less). Read the variables, translate to refrakt's role vocabulary.

The doc page intro can briefly note One Dark's historical importance — it's one of the most-cloned palettes in the modern editor era, and many palette designs (Tokyo Night, Catppuccin Mocha) borrowed its blue-grey-canvas + warm-accent approach. This is worth saying once in the lineup; readers don't need to hear it on every preset page.

## Dependencies

- {% ref "WORK-220" /%}, {% ref "WORK-221" /%} — Nord structural references

## References

- {% ref "SPEC-057" /%} — "One Dark" subsection
- Atom one-dark-syntax: https://github.com/atom/atom/tree/master/packages/one-dark-syntax
- Colour variables: https://github.com/atom/atom/blob/master/packages/one-dark-syntax/styles/colors.less

{% /work %}
