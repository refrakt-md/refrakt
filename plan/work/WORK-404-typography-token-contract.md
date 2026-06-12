{% work id="WORK-404" status="done" priority="high" complexity="moderate" source="SPEC-094" milestone="v0.22.0" tags="theme,tokens,typography,contract" %}

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

- [x] `TokenContract` gains type-scale, line-height, font-weight, letter-spacing, and a display/heading family, each mapping to a documented `--rf-*` variable.
- [x] `mergeTokenContracts`, token-validate, and `generateThemeStylesheet` handle the new leaves (merge, reject unknown keys, emit CSS).
- [x] Lumina's `tokens.ts` populates the new tokens with values matching its current rendered typography (no visual change yet — consumption is {% ref "WORK-405" /%}).
- [x] Token-contract docs updated with the new surface.

## References

- {% ref "SPEC-094" /%} · {% ref "SPEC-048" /%} · `packages/types/src/token-contract.ts` · `packages/transform/src/token-merge.ts` · `generateThemeStylesheet` in `@refrakt-md/transform`.

## Resolution

Completed: 2026-06-12

Branch: `claude/work-404-typography-token-contract`

### What was done
- **`packages/types/src/token-contract.ts`** — extended `TokenContract`: added `font.display` (heading/display family) and four new namespaces — `text` (modular scale `xs…4xl`, `base` anchor → `--rf-text`), `weight` (light…bold), `leading` (tight…loose), `tracking` (tight…wider). Updated the variable-mapping examples in the header doc.
- **`packages/transform/src/token-validate.ts`** — mirrored the new shape into `TOKEN_CONTRACT_SHAPE` so the new keys validate and typos are rejected. `mergeTokenContracts` and `generateThemeStylesheet` are generic tree-walkers and required no change — they pick up the new namespaces automatically.
- **`packages/lumina/src/tokens.ts`** — populated the new tokens with values matching Lumina's current type feel (display = sans; ~1.2 modular scale anchored at 1rem). No consumer references them yet (WORK-405), so zero visual change.
- **`packages/lumina/tokens/base.css`** — mirrored the new tokens into the hand-authored CSS to keep the lockstep convention until WORK-406 retires it, and so the vars are actually emitted for WORK-405 to consume.
- **`packages/lumina/test/token-config-coverage.test.ts`** + **`packages/transform/test/token-validate.test.ts`** — added assertions that the generator emits the new vars and the validator accepts the typographic namespaces / rejects a scale typo.
- **`site/content/extend/theme-authoring/css.md`** — documented the new typographic token surface.

### Notes
- Naming: family stays under `font` (`font.display`), while scale/weight/leading/tracking are sibling top-level namespaces so CSS reads cleanly (`var(--rf-text-lg)`, `var(--rf-weight-semibold)`). The `base` step drops its segment per the existing mapping rule, giving `--rf-text` for body size.
- `font.display` is `display` rather than the previously-reserved `serif` slot — semantically it's "the heading family" regardless of whether a theme makes it serif.
- Verified: full monorepo build clean; transform suite (incl. new validate tests), token-config-coverage, css-coverage, and contracts all green.

{% /work %}
