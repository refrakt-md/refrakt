{% work id="WORK-404" status="ready" priority="high" complexity="moderate" source="SPEC-094" milestone="v0.22.0" tags="theme,tokens,typography,contract" %}

# Typography token contract

Extend the {% ref "SPEC-048" /%} `TokenContract` with a real typographic system. Today the
contract carries only `font.sans` / `font.mono` — no scale, leading, weight, or tracking — so
typographic identity (the primary differentiator for editorial/magazine themes) is not
themeable. This is the gate for the {% ref "SPEC-094" /%} Tier 1 foundations.

## Scope

- A modular **type scale** (e.g. `text.xs … text.4xl`), ideally ratio-derivable so a theme sets a base size + ratio rather than every step.
- **Line-height** tokens (per-step, or tight/normal/relaxed).
- **Font-weight** tokens.
- **Letter-spacing / tracking** tokens.
- A distinct **display/heading family** slot (`font.display` or `font.serif` — reserved per {% ref "SPEC-051" /%}), separate from `font.sans`.
- Mapping to `--rf-*` per the contract's flattening rule; updates to `mergeTokenContracts`, token-validate, and `generateThemeStylesheet` so the new leaves merge, reject typos, and emit CSS.

The Lumina refactor that *consumes* these is {% ref "WORK-405" /%}; CSS generation is {% ref "WORK-406" /%}.

## Acceptance Criteria

- [ ] `TokenContract` gains type-scale, line-height, font-weight, letter-spacing, and a display/heading family, each mapping to a documented `--rf-*` variable.
- [ ] `mergeTokenContracts`, token-validate, and `generateThemeStylesheet` handle the new leaves (merge, reject unknown keys, emit CSS).
- [ ] Lumina's `tokens.ts` populates the new tokens with values matching its current rendered typography (no visual change yet — consumption is {% ref "WORK-405" /%}).
- [ ] Token-contract docs updated with the new surface.

## References

- {% ref "SPEC-094" /%} · {% ref "SPEC-048" /%} · `packages/types/src/token-contract.ts` · `packages/transform/src/token-merge.ts` · `generateThemeStylesheet` in `@refrakt-md/transform`.

{% /work %}
