{% work id="WORK-366" status="ready" priority="high" complexity="moderate" source="SPEC-087" tags="surfaces, lumina, tokens" milestone="v0.20.0" %}

# Tint-tracking inset surface: --rf-surface-inset-shift token + use-site color-mix

Add the tint-tracking inset surface: a `--rf-surface-inset-shift` mix-amount token and a use-site `color-mix` recipe applied to media wells and `chart`/`diagram`.

## Acceptance Criteria
- [ ] `--rf-surface-inset-shift` (mix amount, mode-specific) + use-site `color-mix(in oklch, var(--rf-color-surface), black …)` yields a recessed inset fill that tracks `tint`; no static absolute inset-colour token; `0` disables per rune.
- [ ] The media well of `card`/`bento-cell`/`recipe`/`realm`/`faction`/`playlist` carries the inset fill by default (verified by a visual sweep).
- [ ] `chart`/`diagram` default `tint` to the inset surface for their self surface.
- [ ] Insets are correct under nesting (no compounding, presentational `background-color`, depth via border/elevation).

## Approach
Derivation must live where surface is in scope. `tokens/base.css`/`dark.css`. SPEC-087 §3.

## References

- {% ref "SPEC-087" /%}

{% /work %}
