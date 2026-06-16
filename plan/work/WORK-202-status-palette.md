{% work id="WORK-202" status="done" priority="high" complexity="moderate" tags="lumina, palette, status, neutral-default" source="SPEC-051" milestone="v0.14.0" %}

# Status palette (4 sentiments × 3 tokens × 2 modes)

Author Lumina's status / sentiment palette — info (deep ink blue), warning (deep amber), danger (brick red), success (forest green). Each sentiment has three tokens: `base`, `bg`, `border`. All twelve values per mode specified in {% ref "SPEC-051" /%}. The four hues sit at a single saturation/lightness band so they form a visual family — no single sentiment more aggressive than another.

## Acceptance Criteria

- [x] Light-mode status palette per the SPEC-051 table:
  - [x] `info { base: #34547a, bg: #e8edf4, border: #c5d2e0 }`
  - [x] `warning { base: #9c5a18, bg: #f5ebd9, border: #e0c9a3 }`
  - [x] `danger { base: #a83232, bg: #f5e0e0, border: #e0b8b8 }`
  - [x] `success { base: #2d6a3e, bg: #e0eee4, border: #b8d4be }`
- [x] Dark-mode status palette per the same table's dark column
- [x] Family check: a page with all four callouts stacked reads as four colours of the same fabric — eye doesn't get pulled toward one
- [x] Saturation-at-scale check: a form with several validation states visible at once reads cleanly; an inline-badge variant at small size also reads cleanly
- [x] No collision with syntax palette ({% ref "WORK-201" /%}) — `warning` (amber) doesn't blur with `syntax.number` (ochre); `danger` (brick red) doesn't blur with `syntax.string` (warm rust); `success` (forest) doesn't blur with `syntax.type` (sage)
- [x] Existing hint / callout runes render against the new palette without code changes (token-driven)
- [x] Visual review: at least one site page using callout / hint runes verified in both modes

## Approach

Same author surface as {% ref "WORK-200" /%} and {% ref "WORK-201" /%} — values land in Lumina's `ThemeTokensConfig`. The values are specified; the work is transcription plus visual verification.

For the saturation-at-scale check, mock up a single test page with: four stacked callouts, a form with all four validation states visible, and four inline status badges at 12px. Render in both modes. If any bg pulls too much focus when several are visible together, the SPEC-051 open question's guidance applies — dial the bg tint down; `base` and `border` are more stable.

## Dependencies

- {% ref "WORK-185" /%} — types ready.
- {% ref "WORK-191" /%} — Lumina migrated to config-driven tokens.

## References

- {% ref "SPEC-051" /%} — "The Status Palette" section with full table and live sandbox preview
- `packages/lumina/src/config.ts` — file being edited
- Hint / callout rune CSS in `packages/lumina/styles/runes/` — already token-driven, no changes needed

{% /work %}
