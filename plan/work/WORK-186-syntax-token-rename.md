{% work id="WORK-186" status="ready" priority="high" complexity="small" tags="syntax-highlighting, tokens, shiki, breaking-change" source="SPEC-048" milestone="v0.14.0" %}

# Highlighter token rename: --shiki-* → --rf-syntax-*

Stop leaking the underlying highlighter into the public token surface. Today eleven `--shiki-*` custom properties sit in `packages/lumina/tokens/base.css` alongside `--rf-*` tokens, and per-rune CSS reads them directly — swapping Shiki for Prism, Starry Night, or a server-side alternative is currently a breaking change for every downstream theme and any custom user CSS. After this work item, rune CSS reads only `--rf-syntax-*`; the highlighter integration writes those names.

## Acceptance Criteria

- [ ] All `--shiki-*` custom properties in `packages/lumina/tokens/base.css` and `packages/lumina/tokens/dark.css` renamed to `--rf-syntax-*` equivalents
- [ ] Shiki integration in `packages/lumina` (or wherever it lives) configured to emit `--rf-syntax-*` via `cssVariablePrefix` or themed-tokens mapping
- [ ] All per-rune CSS in `packages/lumina/styles/runes/` that reads syntax tokens updated to `--rf-syntax-*`
- [ ] `TokenContract.syntax` namespace in {% ref "WORK-185" /%} types reflects the new vocabulary
- [ ] CSS coverage tests in `packages/lumina/test/css-coverage.test.ts` updated to expect `--rf-syntax-*` selectors
- [ ] A documentation note (in the SPEC-048 docs page or migration guide) explains that the highlighter is now an implementation detail behind a stable contract — themes only see `--rf-syntax-*`

## Approach

Pure rename with a small Shiki config change.

Mapping (canonical list, derive remaining from `--shiki-*` survey):

| Old | New |
|---|---|
| `--shiki-foreground` | `--rf-syntax-text` |
| `--shiki-background` | `--rf-syntax-bg` |
| `--shiki-token-keyword` | `--rf-syntax-keyword` |
| `--shiki-token-function` | `--rf-syntax-function` |
| `--shiki-token-string` | `--rf-syntax-string` |
| `--shiki-token-number` | `--rf-syntax-number` |
| `--shiki-token-constant` | `--rf-syntax-constant` |
| `--shiki-token-comment` | `--rf-syntax-comment` |
| `--shiki-token-punctuation` | `--rf-syntax-punctuation` |
| `--shiki-token-link` | `--rf-syntax-link` |
| `--shiki-token-string-expression` | `--rf-syntax-string-expression` |

(Audit the actual `--shiki-*` names in lumina before locking the mapping; the table above is illustrative.)

Configure Shiki with `cssVariablePrefix: '--rf-syntax-'` if its API supports a flat prefix, or with an explicit token-name map if it requires the longer form.

Verify by running `cd site && npm run build`, then loading a docs page with a code block and inspecting computed styles — confirm code blocks render identically.

## Dependencies

- {% ref "WORK-185" /%} — `TokenContract.syntax` namespace defined.

## References

- {% ref "SPEC-048" /%} — "Highlighter is an implementation detail" design principle
- `packages/lumina/tokens/base.css` — current `--shiki-*` declarations
- Shiki documentation for `cssVariablePrefix` configuration

{% /work %}
