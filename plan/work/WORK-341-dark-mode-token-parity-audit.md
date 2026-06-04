{% work id="WORK-341" status="ready" priority="medium" complexity="simple" source="" milestone="v0.19.0" tags="lumina,tokens,dark-mode,polish" %}

# Dark-mode token parity audit

Make dark-mode token coverage deliberate. Most "dark looks off" reports trace to
the phantom tokens fixed in {% ref "WORK-340" /%} (a phantom can't have a dark
value); this item closes the genuine remaining gaps and records the intentional
shared-token decisions.

## Acceptance Criteria
- [ ] The three code-block tokens with no dark override get correct dark values: `--rf-color-line-highlight`, `--rf-color-line-highlight-rail`, `--rf-color-line-number`. Verify line highlighting + numbering read correctly on a dark code block.
- [ ] Every remaining semantic colour token defined in `base.css` either has a dark override in `dark.css` or is explicitly annotated as intentionally shared.
- [ ] The `--rf-color-primary-50…950` ramp is no longer a parity concern (removed by {% ref "WORK-340" /%}); confirm nothing dark-mode-relevant still depends on it.
- [ ] A light/dark spot-check (or snapshot) of code blocks, callouts, and badges shows no cold/blown-out colours.

## Approach
Diff the base vs dark token sets (`comm -23`). For each unmatched token, add a dark
value or annotate it shared. The code-block tokens are the only confirmed visual
gap; the rest is a deliberate-decision pass once WORK-340's phantoms are resolved.

## References
- `packages/lumina/tokens/base.css`, `dark.css`
- `packages/lumina/styles/runes/codegroup.css` + code/syntax styling

{% /work %}
