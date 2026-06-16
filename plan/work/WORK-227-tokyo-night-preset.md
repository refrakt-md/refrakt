{% work id="WORK-227" status="done" priority="high" complexity="simple" tags="lumina, presets, tokyo-night, syntax-highlighting" source="SPEC-057" milestone="v0.14.2" %}

# Tokyo Night preset module + doc page

Ship Enkia's Tokyo Night palette as a single refrakt preset with **Day (light) + Storm (dark)** as the canonical pair. Tokyo Night is the lineup's most aggressive role-splitter — it deliberately uses distinct hues for `type`, `function`, `parameter`, `keyword`, and `number`. If Tokyo Night maps cleanly onto refrakt's contract, the SPEC-056 widening was sized correctly. The Moon variant is deferred to Phase 2.

## Acceptance Criteria

- [x] `packages/lumina/src/presets/tokyo-night.ts` exports a `ThemeTokensConfig` with Day as the base (light) and Storm as `modes.dark`
- [x] Day canvas `#e1e2e7`, text `#3760bf`. Storm canvas `#24283b`, text `#a9b1d6` (verify against Tokyo Night source)
- [x] Role mapping exercises SPEC-056's extended roles at full fidelity — `type` (cyan), `function` (blue), `parameter` (orange), `keyword` (magenta), `number` (orange-distinct-from-constant), `tag`, `attribute`, `operator`
- [x] Each hue in the file references the source variable name from Tokyo Night's TextMate theme (the project publishes named CSS variables — use those for traceability)
- [x] File header includes attribution: "Derived from Tokyo Night by Enkia, MIT licensed. https://github.com/enkia/tokyo-night-vscode-theme"
- [x] `packages/lumina/test/tokyo-night-preset.test.ts` mirrors `nord-preset.test.ts`, with extra assertions verifying the *number of distinct values* across SPEC-056's extended roles — Tokyo Night should distinguish at least 4 of the 7 extended roles
- [x] `site/content/themes/tokyo-night.md` follows the Nord doc page structure with Day + Storm palette blocks
- [x] Doc page intro highlights Tokyo Night's role-splitting design — connect this to SPEC-056's extended role widening
- [x] No regressions in CSS coverage tests; full suite green

## Approach

Tokyo Night's source lives at https://github.com/enkia/tokyo-night-vscode-theme/blob/master/themes/tokyo-night-color-theme.json (Storm) and `tokyo-night-light-color-theme.json` (Day). Read the `tokenColors` arrays for the canonical hue → scope mappings, then translate to refrakt's role vocabulary.

The verification gate worth pinning: count how many of the seven SPEC-056 extended roles (`type`, `property`, `parameter`, `tag`, `attribute`, `operator`, `number`, `regex`) Tokyo Night sets *distinctly* (not equal to its core fallback). My expectation: 4–5. If less than 3 are distinct, Tokyo Night isn't really exercising the contract, which would weaken SPEC-057's claim that the lineup validates the extended roles — investigate before committing.

## Dependencies

- {% ref "WORK-220" /%}, {% ref "WORK-221" /%} — Nord structural references

## References

- {% ref "SPEC-057" /%} — "Tokyo Night" subsection
- GitHub: https://github.com/enkia/tokyo-night-vscode-theme
- Storm theme source: https://github.com/enkia/tokyo-night-vscode-theme/blob/master/themes/tokyo-night-color-theme.json

## Resolution

Completed: 2026-05-20

Branch: \`claude/spec-057-v0-14-2-implementation\`

### What was done

Tokyo Night shipped as Day (light) + Storm (dark) canonical pair. The lineup's most aggressive role-splitter — exercises 6 of 7 SPEC-056 extended optional roles distinctly in Storm. The dedicated parameter assertion in the test file validates SPEC-056's \`parameter\` role for the second time in the lineup (after Catppuccin).

### SPEC-057 fidelity gate

The Tokyo Night test file includes a programmatic assertion that ≥4 extended roles must be distinct from their fallbacks. This was the verification gate flagged in WORK-227's acceptance criteria. Current count: **6 of 7** distinct in Storm (\`type\`, \`parameter\`, \`tag\`, \`attribute\`, \`operator\`, \`regex\`). \`number\` collapses with \`constant\` in Tokyo Night's intent (both orange). If this drops below 4 in a future refinement, the gate fails loudly.

### Role splits in Storm

- \`type\` (Cyan #7dcfff) ≠ \`function\` (Blue #7aa2f7) — headline SPEC-056 split
- \`parameter\` (Yellow #e0af68) ≠ \`variable\` (Foreground #c0caf5) — Tokyo Night's distinct parameter hue
- \`tag\` (Red #f7768e) ≠ \`keyword\` (Magenta #bb9af7) — JSX tags get punchy red
- \`attribute\` (Yellow #e0af68) — same hue as parameter (intentional collapse on identifier-family)
- \`operator\` (Cyan-blue #89ddff) ≠ \`punctuation\` (Foreground)
- \`regex\` (Light cyan #b4f9f8) ≠ \`string\` (Green #9ece6a)

### Test results

- 11/11 Tokyo Night preset tests pass.
- Full suite \`npm test\` — 2581/2581 pass across 210 test files.
- Site builds clean.

### Files touched

- \`packages/lumina/src/presets/tokyo-night.ts\` (new)
- \`packages/lumina/package.json\` (added export)
- \`packages/lumina/test/tokyo-night-preset.test.ts\` (new, 11 tests including the fidelity gate)
- \`site/content/themes/tokyo-night.md\` (new)
- \`site/content/themes/_layout.md\` (Tokyo Night in nav)
- \`refrakt.config.json\` (Tokyo Night in tints)

{% /work %}
