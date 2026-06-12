{% work id="WORK-405" status="done" priority="high" complexity="complex" source="SPEC-094" milestone="v0.22.0" tags="theme,typography,lumina,css" %}

# Lumina typography refactor onto tokens

Replace Lumina's hardcoded typography with the {% ref "WORK-404" /%} tokens. Today there are
~351 hardcoded `font-size` declarations against 5 tokenized — so an editorial theme wanting a
different scale must override hundreds of declarations across 90 files. Tokenizing here is also
what shrinks the {% ref "WORK-410" /%} skeleton/skin spike's classification surface.

## Scope

- Replace hardcoded `font-size`, `font-weight`, `line-height`, and letter-spacing in `packages/lumina/styles/**` with the new tokens.
- Keep the rendered result **visually identical** to today — this is a refactor, not a restyle.
- Keep CSS-coverage and `contracts --check` green throughout.

## Acceptance Criteria

- [x] Hardcoded `font-size` literals in `packages/lumina/styles` drop to near-zero (a documented allowlist for genuine one-offs only).
- [x] Weights, line-heights, and tracking likewise consume tokens where a token exists.
- [x] CSS-coverage and contracts checks pass; no intended visual change vs. the pre-refactor baseline (verified against the {% ref "WORK-409" /%} baseline once it exists, else by eye + coverage).

## Dependencies

- Requires {% ref "WORK-404" /%} (tokens to consume). Best verified by {% ref "WORK-409" /%} (empty-diff proof).

## References

- {% ref "SPEC-094" /%} · `packages/lumina/styles/**` · `packages/lumina/test/css-coverage.test.ts`.

## Resolution

Completed: 2026-06-12

Branch: `claude/work-405-lumina-typography-refactor`

### What was done
- Rewrote typography across `packages/lumina/styles/**` (95 files, +677/−675) to consume the WORK-404 tokens: `font-size` → `--rf-text-*`, `font-weight` → `--rf-weight-*`, `line-height` → `--rf-leading-*`, `letter-spacing` → `--rf-tracking-*`. Bulk substitution via a one-off script, then hand-finished the edge cases.
- Tokenized the `var()`-routed sizes too: `--rf-title-size` per-density values in `density.css` (→ `--rf-text-2xl`/`-xl`/base) and the title/meta `var(--x, <literal>)` fallbacks in `sections.css` / `metadata.css` (→ nested `var(--rf-text-*)`).
- Result: hardcoded `font-size` dropped from 356 → the allowlist below; **zero** hardcoded `font-weight` and `letter-spacing` literals remain.

### Allowlist (documented genuine one-offs, intentionally left literal)
- **`em`-relative font-sizes** (0.875em, 0.9375em, 0.85em, 0.8125em, 0.75em, 1em, 3.5em) — intentionally *relative* to context; converting them to absolute `rem` tokens would change semantics.
- **Two display one-offs above the scale's top step**, annotated inline: `hero.css` headline `3.25rem`, `pullquote.css` decorative quote glyph `4rem`.
- **`line-height` resets** `0`, `0.8`, `1` (cap-tight / layout resets, not typographic leading) and one fixed-length `line-height: 1.25rem` in `sandbox.css` (a length, outside the unitless leading scale's domain).

### Notes — visual-change tradeoff (important)
- Lumina used ~40 distinct font sizes; only ~37% mapped exactly to the 8-step scale. Per an explicit decision this session, off-scale values were **normalized** (rounded half-up to the nearest scale step) rather than preserved exactly — so this refactor is *not* strictly pixel-identical. It introduces pervasive **small (<2px) intentional shifts** (e.g. 0.8125→sm, 0.9→sm, 1.05→base, 1.2→xl). Same approach for off-scale leadings/trackings (e.g. 1.6→relaxed/1.65, 0.05em→wider/0.06em).
- Verification: `css-coverage` (PostCSS parse + selector coverage, unchanged at 109/117), `contracts`, all preset + token-config tests green; eyeballed headings/body/metadata diffs for sane mappings. **Full screenshot verification is deferred to WORK-409** (the harness) — at which point the normalization can be reviewed against a real baseline.
- The mapping is round-half-up nearest-step; the few largest deltas are the sub-body cluster (0.8–0.9375rem) and `0.05em` tracking. None alter layout structure.

{% /work %}
