{% work id="WORK-201" status="ready" priority="high" complexity="medium" tags="lumina, palette, syntax-highlighting, neutral-default" source="SPEC-051" milestone="v0.14.0" %}

# Syntax highlighting palette (five hues + comment + punctuation)

Author Lumina's default syntax highlighting palette — the "quiet spectrum walk" of teal / violet / rust / ochre / sage plus warm muted comment and tonal punctuation. All values specified in {% ref "SPEC-051" /%}. Lands the palette in both light and dark mode for the seven syntax token roles in the contract.

## Acceptance Criteria

- [ ] Light-mode syntax palette per the SPEC-051 table:
  - [ ] `syntax.keyword = #2a5c63` (deep teal)
  - [ ] `syntax.function = #4a3b6e` (slate violet)
  - [ ] `syntax.string = #8a3a3a` (warm rust)
  - [ ] `syntax.number = #876327` (antique ochre)
  - [ ] `syntax.type = #3a5c2a` (sage moss)
  - [ ] `syntax.comment = #8a857d` (warm muted, italic)
  - [ ] `syntax.punctuation = color.muted` (tonal)
  - [ ] `syntax.variable = color.text` (tonal, default identifier)
- [ ] Dark-mode syntax palette per the same table's dark column
- [ ] Comment renders italic per the spec note
- [ ] Visual pass on real code in at least six languages: TypeScript, Python, Markdown, JSON, HTML, Bash — palette doesn't fall apart under any of them
- [ ] No syntax colour clashes with the status palette ({% ref "WORK-202" /%}) — sentiment callouts containing inline code don't get visually confused between code colours and sentiment accents
- [ ] CSS coverage tests pass

## Approach

Authors the syntax token values into the same `ThemeTokensConfig` as {% ref "WORK-200" /%}. The seven values are specified; verification work happens during the multi-language visual pass.

For the visual pass: pick representative snippets of real refrakt-relevant code:

- TypeScript: a plugin definition (heavy on imports, types, function calls)
- Python: a class with methods (different keyword/function balance)
- Markdown: a refrakt content file with frontmatter, headings, code fences
- JSON: a `refrakt.config.json` (mostly strings and structural punctuation)
- HTML: a snippet with attributes and tags
- Bash: a one-liner with strings and flags

Render each in both light and dark mode. Look for: any role that becomes invisible against the surface; any pair of roles that's hard to distinguish; any role that dominates visually.

If the teal-for-keywords choice looks off in practice, the SPEC-051 open question about swapping for `#2c4a6e` ink-blue is the agreed pivot — capture that decision in this work item's resolution rather than reopening the spec.

## Dependencies

- {% ref "WORK-185" /%} — types ready, including `TokenContract.syntax`.
- {% ref "WORK-186" /%} — syntax token names use `--rf-syntax-*` (no longer `--shiki-*`).
- {% ref "WORK-191" /%} — Lumina migrated to config-driven tokens.

## References

- {% ref "SPEC-051" /%} — "The Syntax Highlighting Palette" section with full table and sandbox preview
- `packages/lumina/src/config.ts` — file being edited

{% /work %}
