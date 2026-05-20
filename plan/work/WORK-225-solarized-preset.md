{% work id="WORK-225" status="ready" priority="high" complexity="small" tags="lumina, presets, solarized, syntax-highlighting" source="SPEC-057" milestone="v0.14.2" %}

# Solarized preset module + doc page

Ship Ethan Schoonover's Solarized palette as an integrated refrakt preset with **both light and dark modes from the same 16-hue family**. Solarized is the validation case for SPEC-057's "one preset per palette identity, light + dark in `modes.dark`" decision — it's the palette most deliberately coordinated across modes, so if our preset shape carries it cleanly, it carries everything.

## Acceptance Criteria

- [ ] `packages/lumina/src/presets/solarized.ts` exports a `ThemeTokensConfig` overriding chrome accents, `color.code.*`, and `syntax.*` for both light and dark modes
- [ ] Light mode: canvas `base3 #fdf6e3`, text `base00 #657b83`. Dark mode: canvas `base03 #002b36`, text `base0 #839496`. Same eight accent hues in both modes
- [ ] Built and exported at `./presets/solarized` in `packages/lumina/package.json`
- [ ] Role mapping follows the Solarized syntax-highlighting convention (Yellow=class/type, Orange=number/constant, Red=keyword, Magenta=function-call, Violet=string, Blue=function-decl, Cyan=string-escape, Green=comment) — adapt as needed to refrakt's role vocabulary
- [ ] Each hue in the file references its Solarized swatch name (`base03`, `yellow`, `orange`, `red`, `magenta`, `violet`, `blue`, `cyan`, `green`, etc.)
- [ ] File header includes attribution: "Derived from Solarized by Ethan Schoonover, MIT licensed. https://ethanschoonover.com/solarized/"
- [ ] `packages/lumina/test/solarized-preset.test.ts` mirrors `nord-preset.test.ts` — including assertions that verify the same accent hues appear in both light and dark blocks (the Solarized invariant)
- [ ] `site/content/themes/solarized.md` follows the Nord doc page structure with both light and dark palette blocks
- [ ] Doc page intro calls out Solarized's design intent — the same 16 hues coordinated across two canvases — and contrasts with palettes that ship different hues per mode
- [ ] No regressions in CSS coverage tests; full suite green

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

{% /work %}
