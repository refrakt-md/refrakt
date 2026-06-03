{% work id="WORK-334" status="draft" priority="low" complexity="unknown" source="SPEC-083" tags="runes,chart,providers,rendering,theme" %}

# Chart renderer provider selection and additional providers

Demand-driven follow-up to the {% ref "WORK-333" /%} seam: ship renderers beyond
the built-in `svg` (e.g. a charting library) and the SSR capability, on the
provider model resolved in {% ref "SPEC-083" /%}.

**Status: draft — demand-driven (not blocked).** The provider model is settled
(single `rf-chart` delegating to an app-registered `ChartProvider`; selection
author → site-default → `svg`; theme orthogonal via tokens). This item only
makes sense once there's a concrete need for a second renderer — building one
speculatively is the YAGNI trap SPEC-083 warns against.

## Scope

- Additional `ChartProvider` implementations (e.g. `chartjs` / `d3`),
  lazy-loaded via dynamic import only when selected.
- The optional SSR path: providers implementing `renderToString`, invoked at the
  framework-integration layer (where `registerElements()` runs) for a no-JS
  chart — starting with the deterministic built-in `svg`.
- Whatever plugin-home work the SPEC-083 "Home" decision implies (provider zoo +
  optional deps out of core).

## Acceptance Criteria (finalize when a concrete provider lands)

- [ ] At least one additional provider implements `ChartProvider` and validates
  the registry/lazy-load path (only when a real need exists).
- [ ] SSR `renderToString` proven on the built-in `svg` provider (if the no-JS
  posture decision lands that way).
- [ ] Author per-chart override + site/app default both exercised end-to-end.
- [ ] Docs; full suite green.

## Dependencies

- {% ref "WORK-333" /%} — the single-provider seam this generalizes.

## References

- {% ref "SPEC-083" /%} — semantic chart data + pluggable renderer providers.

{% /work %}
