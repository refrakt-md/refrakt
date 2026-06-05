{% work id="WORK-341" status="done" priority="medium" complexity="simple" source="" milestone="v0.19.0" tags="lumina,tokens,dark-mode,polish" %}

# Dark-mode token parity audit

Make dark-mode token coverage deliberate. Most "dark looks off" reports trace to
the phantom tokens fixed in {% ref "WORK-340" /%} (a phantom can't have a dark
value); this item closes the genuine remaining gaps and records the intentional
shared-token decisions.

## Acceptance Criteria
- [x] The three code-block tokens with no dark override get correct dark values: `--rf-color-line-highlight`, `--rf-color-line-highlight-rail`, `--rf-color-line-number`. Verify line highlighting + numbering read correctly on a dark code block.
- [x] Every remaining semantic colour token defined in `base.css` either has a dark override in `dark.css` or is explicitly annotated as intentionally shared.
- [x] The `--rf-color-primary-50…950` ramp is no longer a parity concern (removed by {% ref "WORK-340" /%}); confirm nothing dark-mode-relevant still depends on it.
- [x] A light/dark spot-check (or snapshot) of code blocks, callouts, and badges shows no cold/blown-out colours.

## Approach
Diff the base vs dark token sets (`comm -23`). For each unmatched token, add a dark
value or annotate it shared. The code-block tokens are the only confirmed visual
gap; the rest is a deliberate-decision pass once WORK-340's phantoms are resolved.

## References
- `packages/lumina/tokens/base.css`, `dark.css`
- `packages/lumina/styles/runes/codegroup.css` + code/syntax styling

## Resolution

Completed: 2026-06-05

Branch: `claude/v0.19-lumina-polish`

### What was done
Investigation showed the dark-parity gap was smaller than feared — and mostly already fixed by WORK-340. After the phantom-token + ramp cleanup, only four base tokens lack a dark.css override, and **all four are derived** from mode-aware tokens:
- `line-highlight` = `color-mix(text 6%, transparent)`
- `line-highlight-rail` = `var(--rf-color-primary, …)`
- `line-number` = `var(--rf-color-muted)`
- `primary-bg` = `color-mix(primary 10%, transparent)`

Because `text` / `primary` / `muted` all flip in dark mode, these track dark automatically; pinning fixed dark values would *break* the derivation. So they are **intentionally shared** — annotated as such in `base.css` (WORK-341 note). Every *absolute* token already has a dark override (verified).

### Notes
- The real "dark looks off" symptoms (cold-gray muted text, out-of-place blue) were the phantom tokens, resolved in WORK-340 — not a missing dark value here.
- No fixed dark values added by design; this item is the deliberate verify-and-annotate pass the parity audit called for.

{% /work %}
