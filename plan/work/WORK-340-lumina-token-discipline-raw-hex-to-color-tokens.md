{% work id="WORK-340" status="ready" priority="medium" complexity="simple" source="" milestone="v0.19.0" tags="lumina,tokens,polish" %}

# Lumina token discipline: raw hex to color tokens

Replace hard-coded hex colours in rune CSS with design tokens (`--rf-color-*`),
adding tokens where a genuine gap exists. ~117 raw hex values live across rune
CSS; the demo runes (swatch, palette, syntax) legitimately use literals, but
the rest (typography, codegroup, map, event, audio, juxtapose, plan-ref, …)
should reference tokens so theming and dark mode stay consistent.

## Acceptance Criteria
- [ ] Raw hex in non-demo rune CSS is replaced with `--rf-color-*` tokens (or a new token where none fits).
- [ ] Any new tokens are defined in `packages/lumina/tokens/base.css` with a dark override in `dark.css`.
- [ ] Demo/illustrative runes (swatch, palette, spacing, syntax highlighting) are explicitly exempted and noted.
- [ ] `npm test` and CSS coverage pass; spot-check the affected runes render unchanged in light mode.

## Approach
Inventory with `grep -rEn "#[0-9a-fA-F]{3,6}" packages/lumina/styles/runes/`.
For each non-demo hit, map to the closest existing token; introduce a token only
when the value is semantically distinct. Any new tokens get their dark overrides
during the dark-mode parity audit (WORK-341).

## References
- `packages/lumina/styles/runes/*.css`, `packages/lumina/tokens/base.css`

{% /work %}
