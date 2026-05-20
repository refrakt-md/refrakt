{% work id="WORK-227" status="ready" priority="high" complexity="small" tags="lumina, presets, tokyo-night, syntax-highlighting" source="SPEC-057" milestone="v0.14.2" %}

# Tokyo Night preset module + doc page

Ship Enkia's Tokyo Night palette as a single refrakt preset with **Day (light) + Storm (dark)** as the canonical pair. Tokyo Night is the lineup's most aggressive role-splitter — it deliberately uses distinct hues for `type`, `function`, `parameter`, `keyword`, and `number`. If Tokyo Night maps cleanly onto refrakt's contract, the SPEC-056 widening was sized correctly. The Moon variant is deferred to Phase 2.

## Acceptance Criteria

- [ ] `packages/lumina/src/presets/tokyo-night.ts` exports a `ThemeTokensConfig` with Day as the base (light) and Storm as `modes.dark`
- [ ] Day canvas `#e1e2e7`, text `#3760bf`. Storm canvas `#24283b`, text `#a9b1d6` (verify against Tokyo Night source)
- [ ] Role mapping exercises SPEC-056's extended roles at full fidelity — `type` (cyan), `function` (blue), `parameter` (orange), `keyword` (magenta), `number` (orange-distinct-from-constant), `tag`, `attribute`, `operator`
- [ ] Each hue in the file references the source variable name from Tokyo Night's TextMate theme (the project publishes named CSS variables — use those for traceability)
- [ ] File header includes attribution: "Derived from Tokyo Night by Enkia, MIT licensed. https://github.com/enkia/tokyo-night-vscode-theme"
- [ ] `packages/lumina/test/tokyo-night-preset.test.ts` mirrors `nord-preset.test.ts`, with extra assertions verifying the *number of distinct values* across SPEC-056's extended roles — Tokyo Night should distinguish at least 4 of the 7 extended roles
- [ ] `site/content/themes/tokyo-night.md` follows the Nord doc page structure with Day + Storm palette blocks
- [ ] Doc page intro highlights Tokyo Night's role-splitting design — connect this to SPEC-056's extended role widening
- [ ] No regressions in CSS coverage tests; full suite green

## Approach

Tokyo Night's source lives at https://github.com/enkia/tokyo-night-vscode-theme/blob/master/themes/tokyo-night-color-theme.json (Storm) and `tokyo-night-light-color-theme.json` (Day). Read the `tokenColors` arrays for the canonical hue → scope mappings, then translate to refrakt's role vocabulary.

The verification gate worth pinning: count how many of the seven SPEC-056 extended roles (`type`, `property`, `parameter`, `tag`, `attribute`, `operator`, `number`, `regex`) Tokyo Night sets *distinctly* (not equal to its core fallback). My expectation: 4–5. If less than 3 are distinct, Tokyo Night isn't really exercising the contract, which would weaken SPEC-057's claim that the lineup validates the extended roles — investigate before committing.

## Dependencies

- {% ref "WORK-220" /%}, {% ref "WORK-221" /%} — Nord structural references

## References

- {% ref "SPEC-057" /%} — "Tokyo Night" subsection
- GitHub: https://github.com/enkia/tokyo-night-vscode-theme
- Storm theme source: https://github.com/enkia/tokyo-night-vscode-theme/blob/master/themes/tokyo-night-color-theme.json

{% /work %}
