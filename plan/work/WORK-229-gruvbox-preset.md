{% work id="WORK-229" status="done" priority="medium" complexity="simple" tags="lumina, presets, gruvbox, syntax-highlighting" source="SPEC-057" milestone="v0.14.2" %}

# Gruvbox preset module + doc page

Ship Pavel Pertsev's Gruvbox as a single refrakt preset with light + dark variants from coordinated hues. Gruvbox is the lineup's only warm palette — five blue/cool members plus this one warm gives the catalog visual variety. Gruvbox is also the most "unix terminal heritage" of the lineup, important counterweight to the JS-editor-modern bias of Catppuccin / Tokyo Night.

## Acceptance Criteria

- [x] `packages/lumina/src/presets/gruvbox.ts` exports a `ThemeTokensConfig` with light medium as the base and dark medium as `modes.dark`
- [x] Light medium canvas `#fbf1c7`, text `#3c3836`. Dark medium canvas `#282828`, text `#ebdbb2`
- [x] Role mapping follows Gruvbox's convention: red (keyword/identifier in some variants), orange (number/constant), yellow (function/operator), green (string), aqua (function-decl), blue (function-call), purple (number/constant alt), gray (comment)
- [x] Sets at least three SPEC-056 extended roles distinctly
- [x] Each hue in the file references its Gruvbox swatch name (e.g. `// neutral_red`, `// bright_orange`, `// faded_yellow`)
- [x] File header includes attribution: "Derived from Gruvbox by Pavel Pertsev (morhetz), MIT licensed. https://github.com/morhetz/gruvbox"
- [x] `packages/lumina/test/gruvbox-preset.test.ts` mirrors `nord-preset.test.ts` with light + dark assertions
- [x] `site/content/themes/gruvbox.md` follows the Nord doc page structure
- [x] Doc page intro highlights Gruvbox's "retro warm" identity and connects to the catalog's need for visual variety (one warm palette balancing five cool ones)
- [x] No regressions in CSS coverage tests; full suite green

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

## Resolution

Completed: 2026-05-20

Branch: \`claude/spec-057-v0-14-2-implementation\`

### What was done

Gruvbox shipped as light medium + dark medium canonical pair. The lineup's only warm palette — earthy oranges, deep greens, mustard yellows, Mediterranean reds. Provides visual variety against five blue/cool members.

### Role splits

4 of 7 SPEC-056 extended roles distinct in dark mode: \`type\` (Green) ≠ \`function\` (Yellow), \`regex\` (Orange) ≠ \`string\` (Green), \`operator\` (Orange), \`attribute\` (Blue) ≠ \`function\`. \`number\` collapses with \`constant\` (both purple).

### Heritage note

Gruvbox is the most "unix terminal heritage" of the lineup — original was a Vim colorscheme, syntax conventions trace from that lineage rather than the modern editor scene. The doc page calls this out as part of the palette's identity.

### Test results

- 10/10 Gruvbox preset tests pass.
- Full suite 2600/2600 pass across 212 test files.
- Site builds clean.

### Files touched

- \`packages/lumina/src/presets/gruvbox.ts\` (new)
- \`packages/lumina/package.json\` (added export)
- \`packages/lumina/test/gruvbox-preset.test.ts\` (new, 10 tests)
- \`site/content/themes/gruvbox.md\` (new)
- \`site/content/themes/_layout.md\` (Gruvbox in nav)
- \`refrakt.config.json\` (Gruvbox in tints)

{% /work %}
