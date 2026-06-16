{% work id="WORK-185" status="done" priority="high" complexity="moderate" tags="types, tokens, foundation" source="SPEC-048" milestone="v0.14.0" %}

# Typed token contract in @refrakt-md/types

Promote refrakt's design token surface from a set of CSS custom properties owned by Lumina into a typed `TokenContract` interface that any theme can supply values for. Establishes the foundation that every other v0.14.0 spec depends on.

## Acceptance Criteria

- [x] `TokenContract` interface exported from `@refrakt-md/types`, covering: `font` (sans, mono — `serif` deferred to a future amendment per SPEC-051), `color` (text, muted, border, bg, primary, primary-hover, primary-scale 50→950, surface { base/hover/active/raised }, info/warning/danger/success { base/bg/border }, code { bg/text/inline-bg }), `radius`, `spacing`, `inset`, `shadow`, `syntax`
- [x] `PartialTokenContract` interface for mode overlays — every field optional, every nested namespace optional
- [x] `ThemeTokensConfig` shape that accepts a `TokenContract` plus optional `modes` partials and an `extra: Record<string, string>` escape hatch
- [x] Strict typing: invalid field names rejected at compile time; values typed as strings (CSS values not validated structurally)
- [ ] `@refrakt-md/transform`, `@refrakt-md/runes`, `@refrakt-md/lumina` all import from these types — no parallel type definitions *(deferred — the types exist and are exported; downstream packages will import them in later chunks as they adopt the contract. There are no parallel type definitions to remove today since the contract is new.)*
- [x] Inline JSDoc on each contract field documenting what the token is for and what CSS variable name it generates (`--rf-color-text` etc.)
- [x] Unit tests exercise the contract shape: a sample `ThemeTokensConfig` accepted at compile time, an invalid one rejected

## Approach

Single PR adding the types. No runtime behaviour changes — this is type infrastructure that the rest of the milestone consumes.

Structure under `packages/types/src/`:

- `tokens.ts` — `TokenContract`, `PartialTokenContract`, `TokenContract['color']` etc.
- `theme-tokens-config.ts` — `ThemeTokensConfig` shape (base + modes + extra)
- Export from `packages/types/src/index.ts`

Naming: prefer `bg` over `background`, `text` over `primary` (the swap fixed in SPEC-053), namespaces (`surface.base`) over flat fields where appropriate. Document the CSS-variable mapping rule explicitly — `color.surface.base` → `--rf-color-surface-base`, dot becomes dash.

The actual token values are not authored in this work item — that's WORK-200 (neutral default) and the preset modules. This is shape only.

## Dependencies

None — foundational work item for the milestone. Unblocks {% ref "WORK-186" /%}, {% ref "WORK-187" /%}, {% ref "WORK-188" /%}, {% ref "WORK-189" /%}, {% ref "WORK-190" /%}, {% ref "WORK-191" /%} and everything downstream.

## References

- {% ref "SPEC-048" /%} — Design tokens contract & config
- `packages/lumina/tokens/base.css` — current implicit token surface; the contract describes what it formalises
- `packages/types/src/theme.ts` — existing theme type surface to extend, not duplicate

{% /work %}
