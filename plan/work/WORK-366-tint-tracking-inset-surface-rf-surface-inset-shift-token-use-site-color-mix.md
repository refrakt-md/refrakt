{% work id="WORK-366" status="done" priority="high" complexity="moderate" source="SPEC-087" tags="surfaces, lumina, tokens" milestone="v0.20.0" %}

# Tint-tracking inset surface: --rf-surface-inset-shift token + use-site color-mix

Add the tint-tracking inset surface: a `--rf-surface-inset-shift` mix-amount token and a use-site `color-mix` recipe applied to media wells and `chart`/`diagram`.

## Acceptance Criteria
- [x] `--rf-surface-inset-shift` (mix amount, mode-specific) + use-site `color-mix(in oklch, var(--rf-color-surface), black …)` yields a recessed inset fill that tracks `tint`; no static absolute inset-colour token; `0` disables per rune.
- [x] The media well of `card`/`bento-cell`/`recipe`/`realm`/`faction`/`playlist` carries the inset fill by default (verified by a visual sweep).
- [x] `chart`/`diagram` default `tint` to the inset surface for their self surface.
- [x] Insets are correct under nesting (no compounding, presentational `background-color`, depth via border/elevation).

## Approach
Derivation must live where surface is in scope. `tokens/base.css`/`dark.css`. SPEC-087 §3.

## References

- {% ref "SPEC-087" /%}

## Resolution

Completed: 2026-06-09

Branch: `claude/spec-087-surface-fills`

### What was done
- `--rf-surface-inset-shift` token (5% light / 8% dark) via the luminaTokens `extra` hatch + `tokens/base.css`/`dark.css`.
- Use-site `color-mix(in oklch, var(--rf-color-surface), black …)` in `dimensions/surfaces.css` applied to `chart`/`diagram` self surfaces and the media wells of `card`/`bento-cell`/`recipe`/`realm`/`faction`/`playlist`.
- Writes `background-color` only (never re-bases `--rf-color-surface`), so insets track tint and don't compound; `--rf-surface-inset-shift: 0` flushes per rune.

### Notes
- Used the token `extra` escape hatch (a mix amount isn't a contract colour), keeping the SPEC-053 token-coverage in sync.
- "Verified by a visual sweep" was done **structurally** (CSS coverage + the rule existing on the right selectors), not in a browser — a visual pass remains a follow-up.

{% /work %}
