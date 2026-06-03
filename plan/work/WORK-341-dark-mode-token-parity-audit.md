{% work id="WORK-341" status="ready" priority="medium" complexity="simple" source="" milestone="v0.19.0" tags="lumina,tokens,dark-mode,polish" %}

# Dark-mode token parity audit

Close dark-mode gaps in the token set. Four base colour tokens have no dark
override — `--rf-color-line-highlight`, `--rf-color-line-highlight-rail`,
`--rf-color-line-number`, and `--rf-color-primary-` — so code-block line
highlighting and numbering likely render wrong on dark backgrounds.

## Acceptance Criteria
- [ ] Every semantic colour token defined in `base.css` either has a dark override in `dark.css` or is documented as intentionally shared.
- [ ] The four known-missing code-block tokens get correct dark values.
- [ ] A visual check (or snapshot) confirms code blocks, line highlighting, and line numbers read correctly in dark mode.
- [ ] Any tokens added by {% ref "WORK-340" /%} are covered here too.

## Approach
Diff the token sets: `comm -23 <(base tokens) <(dark tokens)`. For each
unmatched token, add a dark value or annotate it as shared. Verify against the
code-block / syntax runes which are the most dark-sensitive surface.

## References
- `packages/lumina/tokens/base.css`, `packages/lumina/tokens/dark.css`
- `packages/lumina/styles/runes/codegroup.css`, `code` / syntax styling

{% /work %}
