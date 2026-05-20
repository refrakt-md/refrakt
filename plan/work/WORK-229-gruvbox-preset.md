{% work id="WORK-229" status="ready" priority="medium" complexity="small" tags="lumina, presets, gruvbox, syntax-highlighting" source="SPEC-057" milestone="v0.14.2" %}

# Gruvbox preset module + doc page

Ship Pavel Pertsev's Gruvbox as a single refrakt preset with light + dark variants from coordinated hues. Gruvbox is the lineup's only warm palette — five blue/cool members plus this one warm gives the catalog visual variety. Gruvbox is also the most "unix terminal heritage" of the lineup, important counterweight to the JS-editor-modern bias of Catppuccin / Tokyo Night.

## Acceptance Criteria

- [ ] `packages/lumina/src/presets/gruvbox.ts` exports a `ThemeTokensConfig` with light medium as the base and dark medium as `modes.dark`
- [ ] Light medium canvas `#fbf1c7`, text `#3c3836`. Dark medium canvas `#282828`, text `#ebdbb2`
- [ ] Role mapping follows Gruvbox's convention: red (keyword/identifier in some variants), orange (number/constant), yellow (function/operator), green (string), aqua (function-decl), blue (function-call), purple (number/constant alt), gray (comment)
- [ ] Sets at least three SPEC-056 extended roles distinctly
- [ ] Each hue in the file references its Gruvbox swatch name (e.g. `// neutral_red`, `// bright_orange`, `// faded_yellow`)
- [ ] File header includes attribution: "Derived from Gruvbox by Pavel Pertsev (morhetz), MIT licensed. https://github.com/morhetz/gruvbox"
- [ ] `packages/lumina/test/gruvbox-preset.test.ts` mirrors `nord-preset.test.ts` with light + dark assertions
- [ ] `site/content/themes/gruvbox.md` follows the Nord doc page structure
- [ ] Doc page intro highlights Gruvbox's "retro warm" identity and connects to the catalog's need for visual variety (one warm palette balancing five cool ones)
- [ ] No regressions in CSS coverage tests; full suite green

## Approach

Gruvbox's palette is documented in the README at https://github.com/morhetz/gruvbox#palette. The palette has three contrast levels (soft / medium / hard) and we ship `medium` for both light and dark. The neutral foreground / background swatches are mode-dependent (`#3c3836`/`#fbf1c7` for light, `#ebdbb2`/`#282828` for dark) but the bright/neutral/faded accent variants share names across modes.

For syntax: Gruvbox's convention varies across implementations; the canonical mapping from the gruvbox.vim repo is the most authoritative. Settle on one canonical mapping and document the choices in code comments.

## Dependencies

- {% ref "WORK-220" /%}, {% ref "WORK-221" /%} — Nord structural references

## References

- {% ref "SPEC-057" /%} — "Gruvbox" subsection
- GitHub: https://github.com/morhetz/gruvbox
- Palette: https://github.com/morhetz/gruvbox#palette
- Reference syntax mapping: https://github.com/morhetz/gruvbox/blob/master/colors/gruvbox.vim

{% /work %}
