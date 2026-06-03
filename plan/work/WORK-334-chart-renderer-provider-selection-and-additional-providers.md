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

## Scope (introduces the whole provider abstraction — none of it exists after WORK-333)

- The **`ChartProvider` contract + registry** (`registerChartProvider`), and
  promoting WORK-333's standalone `renderSvg(...)` into the built-in `svg`
  provider behind it.
- The **`provider` modifier + `data-provider`** and selection precedence
  (author attr → site/app default → built-in `svg`); `rf-chart` reads
  `data-provider` and delegates.
- **Additional renderers as per-provider optional packages** (`@refrakt-md/chartjs`,
  `@refrakt-md/d3`), lazy-loaded via dynamic import only when selected. Decide
  the package shape when the first lands:
  - **(A)** plain provider package — exports a `ChartProvider`, app registers it
    at its client entry (lean: start here);
  - **(B)** provider as a refrakt Plugin — a new `chartProviders` contribution +
    client-registration wiring, added via `refrakt.config.plugins[]`.
- The optional **SSR path**: providers implementing `renderToString`, invoked at
  the framework-integration layer (where `registerElements()` runs) for a no-JS
  chart — starting with the deterministic built-in `svg`.

## Acceptance Criteria (finalize when a concrete provider lands)

- [ ] `ChartProvider` contract + `registerChartProvider` registry; built-in `svg`
  conforms; `rf-chart` delegates by `data-provider`.
- [ ] At least one additional provider (real or stub) validates the registry +
  lazy-load path; shipped as its own package per shape (A)/(B).
- [ ] Author per-chart override + site/app default both exercised end-to-end.
- [ ] SSR `renderToString` proven on the built-in `svg` provider (if the no-JS
  posture decision lands that way).
- [ ] Docs; full suite green.

## Dependencies

- {% ref "WORK-333" /%} — the single-provider seam this generalizes.

## References

- {% ref "SPEC-083" /%} — semantic chart data + pluggable renderer providers.

{% /work %}
