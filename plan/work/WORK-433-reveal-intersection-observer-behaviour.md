{% work id="WORK-433" status="done" priority="high" complexity="moderate" source="SPEC-105" milestone="v0.24.0" tags="motion,animation,behaviors,a11y,progressive-enhancement" %}

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

- [x] An `IntersectionObserver` `reveal` behaviour sets `data-in-view` on first intersection and unobserves; under `prefers-reduced-motion` it marks all in-view immediately.
- [x] **Enhancement gating:** SSR/no-JS/crawler render the fully visible final state (no `opacity:0` baked in); the pre-entrance state is scoped under a root `data-animate` flag the behaviour adds on boot; the {% ref "WORK-352" /%} reduced-motion reset still neutralises motion.
- [x] The behaviour is theme-agnostic (sets only `data-in-view`/the root flag) and frame-agnostic; tests cover the observe→reveal→unobserve cycle, the reduced-motion path, and the no-JS/SSR complete-render guarantee.

## Dependencies

- {% ref "WORK-431" /%} — observes `data-reveal`. Pairs with {% ref "WORK-432" /%} (the gated pre-entrance CSS).

## References

- {% ref "SPEC-105" /%} §5–§6 · `packages/behaviors/src/` (tabs/accordion/datatable/form pattern) · reduced-motion baseline {% ref "WORK-352" /%} (`packages/lumina/styles/global.css`).

## Resolution

Completed: 2026-06-16

Branch: `claude/v024-work431-reveal-facet` (continued).

### What was done
- New `packages/behaviors/src/behaviors/scroll-reveal.ts` — a page-level behaviour (not keyed by `data-rune`; it scans the `data-reveal` attribute), registered in `initRuneBehaviors` alongside scrollspy/copy and exported from the package index.
- On boot it sets the root `data-animate` gate (on `document.documentElement`), then observes each `[data-reveal]:not([data-reveal="none"])` with an `IntersectionObserver`; on first intersection it sets `data-in-view` and unobserves (one-shot entrance). `rootMargin: '0px 0px -10% 0px'` so the entrance reads as the container scrolls in.
- **Reduced-motion / no-IO path**: marks every container in-view immediately (no observer), reaching the same final state without animation — belt-and-braces with the WORK-352 global reset.
- **Enhancement gating**: the pre-entrance hidden CSS is scoped under `[data-animate]`; with no JS the gate is absent, so SSR/no-JS/crawler render the fully-visible final state — no `opacity:0` baked in.
- Naming: deliberately NOT the existing `reveal` *rune* behaviour (disclosure, keyed by `data-rune="reveal"`); this is `scrollRevealBehavior`, keyed on the `data-reveal` attribute.
- Tests: `packages/behaviors/test/scroll-reveal.test.ts` (9) — gate-on-boot, no-op without containers, `reveal="none"` skip, observe→reveal→unobserve, non-intersecting no-op, reduced-motion immediate path, no-IO path, cleanup disconnect, and the SSR/no-JS complete-render guarantee.

### Notes
- Theme- and frame-agnostic: sets only the root flag + `data-in-view`. JS = when, CSS = how.
- Verified in a generated Lumina gallery: the inlined behaviour script and motion CSS both ship; pixel-diff runs in CI (chromium can't download in the sandbox).

{% /work %}
