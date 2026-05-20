{% work id="WORK-226" status="done" priority="high" complexity="small" tags="lumina, presets, catppuccin, syntax-highlighting" source="SPEC-057" milestone="v0.14.2" %}

# Catppuccin preset module + doc page

Ship Catppuccin's canonical Latte (light) + Mocha (dark) pair as a single refrakt preset. Catppuccin is the lineup's most well-documented palette — every hue has a name and a documented purpose — making the role mapping unusually clean. The mid-dark flavours (Frappé, Macchiato) are deferred to Phase 2 per SPEC-057.

## Acceptance Criteria

- [x] `packages/lumina/src/presets/catppuccin.ts` exports a `ThemeTokensConfig` with Latte as the base (light) and Mocha as `modes.dark`
- [x] Latte canvas `base #eff1f5`, text `text #4c4f69`. Mocha canvas `base #1e1e2e`, text `text #cdd6f4`
- [x] Role mapping uses Catppuccin's documented syntax-highlighting reference: Mauve (keyword), Blue (function), Yellow (class/type), Green (string), Peach (number), Overlay0/1 (comment), Rosewater/Text (variable), Pink (tag), Teal (attribute), Sky (operator), etc. — see https://catppuccin.com/palette/
- [x] Sets at least three SPEC-056 extended roles distinctly — Catppuccin spec is precise enough that `type`, `attribute`, and `tag` all land on distinct hues
- [x] Each hue in the file references its Catppuccin swatch name in a comment (e.g. `// Mauve (Mocha)`, `// Rosewater (Latte)`)
- [x] File header includes attribution: "Derived from Catppuccin by the Catppuccin organisation, MIT licensed. https://catppuccin.com/"
- [x] `packages/lumina/test/catppuccin-preset.test.ts` mirrors `nord-preset.test.ts` — including assertions for the Latte light values and the Mocha dark values
- [x] `site/content/themes/catppuccin.md` follows the Nord doc page structure with both Latte and Mocha palette blocks, calling out that the doc page ships Latte+Mocha and other flavours can be added in a future milestone
- [x] No regressions in CSS coverage tests; full suite green

## Approach

Catppuccin publishes formal palette JSON at https://catppuccin.com/palette/ — read the Mocha and Latte palettes and the syntax-highlighting variant documentation. Map the named hues to refrakt's role vocabulary.

Note that Catppuccin doesn't always pick a unique hue for every refrakt extended role — `tag` and `keyword` might both be Mauve in some implementations. Where Catppuccin collapses, let the role collapse too (don't set the extended role; let it cascade via fallback). Where Catppuccin splits, set the extended role explicitly.

The doc page intro should note: Catppuccin ships four flavours; we ship Latte (light) + Mocha (dark) as the canonical pair. If readers want Frappé or Macchiato as separate presets, that's a Phase 2 ask — open an issue.

## Dependencies

- {% ref "WORK-220" /%}, {% ref "WORK-221" /%} — Nord structural references

## References

- {% ref "SPEC-057" /%} — "Catppuccin" subsection
- Catppuccin palette: https://catppuccin.com/palette/
- Syntax mapping: https://github.com/catppuccin/catppuccin#-style-guide
- GitHub: https://github.com/catppuccin/catppuccin

## Resolution

Completed: 2026-05-20

Branch: \`claude/spec-057-v0-14-2-implementation\`

### What was done

Latte (light) + Mocha (dark) shipped as the canonical pair per SPEC-057. Both palettes use Catppuccin's official named hues, mapped onto refrakt's role vocabulary using the [Catppuccin style guide](https://github.com/catppuccin/catppuccin#-style-guide).

### Catppuccin-distinctive role: parameter (Maroon)

Catppuccin is one of the few palettes in the lineup to give **function parameters** a dedicated hue (Maroon). This validates SPEC-056's \`parameter\` extended role — a slot most palettes leave at the \`variable\` fallback, but that Catppuccin uses for genuine semantic emphasis.

### SPEC-056 extended-role exercise

6 of 7 extended roles set distinctly: \`type\` (Yellow), \`parameter\` (Maroon), \`number\` (Peach), \`regex\` (Pink), \`operator\` (Sky), \`string-expression\` (Pink). \`attribute\` collapses with \`type\` and \`tag\` collapses with \`keyword\` — Catppuccin's intent, not the contract's limitation.

### Test results

- 11/11 Catppuccin preset tests pass.
- Full suite \`npm test\` — 2570/2570 pass across 209 test files.
- Site builds clean: data-tint=catppuccin stamps + both light + dark CSS rules in the bundle.

### Files touched

- \`packages/lumina/src/presets/catppuccin.ts\` (new)
- \`packages/lumina/package.json\` (added export)
- \`packages/lumina/test/catppuccin-preset.test.ts\` (new, 11 tests)
- \`site/content/themes/catppuccin.md\` (new)
- \`site/content/themes/_layout.md\` (Catppuccin in nav)
- \`refrakt.config.json\` (Catppuccin in tints)

{% /work %}
