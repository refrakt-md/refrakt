{% work id="WORK-405" status="pending" priority="high" complexity="complex" source="SPEC-094" milestone="v0.22.0" tags="theme,typography,lumina,css" %}

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

- [ ] Hardcoded `font-size` literals in `packages/lumina/styles` drop to near-zero (a documented allowlist for genuine one-offs only).
- [ ] Weights, line-heights, and tracking likewise consume tokens where a token exists.
- [ ] CSS-coverage and contracts checks pass; no intended visual change vs. the pre-refactor baseline (verified against the {% ref "WORK-409" /%} baseline once it exists, else by eye + coverage).

## Dependencies

- Requires {% ref "WORK-404" /%} (tokens to consume). Best verified by {% ref "WORK-409" /%} (empty-diff proof).

## References

- {% ref "SPEC-094" /%} · `packages/lumina/styles/**` · `packages/lumina/test/css-coverage.test.ts`.

{% /work %}
