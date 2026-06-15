{% work id="WORK-433" status="ready" priority="high" complexity="moderate" source="SPEC-105" milestone="v0.24.0" tags="motion,animation,behaviors,a11y,progressive-enhancement" %}

# `reveal` IntersectionObserver behaviour + enhancement gating

{% ref "SPEC-105" /%} §5–§6: the timing trigger and the no-JS/SSR safety. A tiny
`IntersectionObserver` behaviour flips `data-in-view`; enhancement gating guarantees the
static page is always complete. **JS = when, CSS = how.**

## Scope

- **`reveal` behaviour** — joins tabs/accordion/datatable/form in `packages/behaviors/src/`.
  Observes each `[data-reveal]:not([data-reveal="none"])` container; on first intersection it
  sets `data-in-view` and **unobserves**. Theme-agnostic: one state attribute, nothing else.
- **Reduced-motion path** — honour `matchMedia('(prefers-reduced-motion: reduce)')`: mark
  everything in-view immediately (belt-and-braces with the global reset).
- **Enhancement gating (cardinal rule)** — SSR/no-JS/crawler render the fully visible final
  state; never bake `opacity:0` that only JS removes. The pre-entrance state is scoped under a
  root `data-animate` flag the behaviour adds on boot; no flag → every section fully rendered.

## Acceptance Criteria

- [ ] An `IntersectionObserver` `reveal` behaviour sets `data-in-view` on first intersection and unobserves; under `prefers-reduced-motion` it marks all in-view immediately.
- [ ] **Enhancement gating:** SSR/no-JS/crawler render the fully visible final state (no `opacity:0` baked in); the pre-entrance state is scoped under a root `data-animate` flag the behaviour adds on boot; the {% ref "WORK-352" /%} reduced-motion reset still neutralises motion.
- [ ] The behaviour is theme-agnostic (sets only `data-in-view`/the root flag) and frame-agnostic; tests cover the observe→reveal→unobserve cycle, the reduced-motion path, and the no-JS/SSR complete-render guarantee.

## Dependencies

- {% ref "WORK-431" /%} — observes `data-reveal`. Pairs with {% ref "WORK-432" /%} (the gated pre-entrance CSS).

## References

- {% ref "SPEC-105" /%} §5–§6 · `packages/behaviors/src/` (tabs/accordion/datatable/form pattern) · reduced-motion baseline {% ref "WORK-352" /%} (`packages/lumina/styles/global.css`).

{% /work %}
