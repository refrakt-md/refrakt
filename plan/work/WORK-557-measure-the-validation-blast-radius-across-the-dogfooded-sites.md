{% work id="WORK-557" status="ready" priority="high" complexity="simple" milestone="v0.34.0" source="SPEC-132" tags="validation, measurement, content" %}

# Measure the validation blast radius across the dogfooded sites

{% ref "SPEC-132" /%} phase 2's gate. Before the attribute error ids are
switched on, count what they would report across `site/` and `plan-site/` — and
record the number, so the decision to proceed is made on evidence rather than
optimism.

## Why it is its own item

Phase 2 enables `attribute-value-invalid`, `attribute-missing-required` and
`attribute-type-invalid`, which also wake the custom attribute validators that
have never executed in a build. Nobody knows what that reports. Two outcomes
need different plans:

- **A handful of findings** — fix them inside {% ref "WORK-558" /%} and proceed.
- **Many findings, or findings concentrated in one rune** — phase 2 becomes its
  own piece of work and slips out of v0.34.0, which is a better outcome than
  discovering it halfway through.

Measuring costs an afternoon. Guessing costs the milestone's credibility.

## Acceptance Criteria

- [ ] A count per error id across `site/` and `plan-site/`, at minimum: `attribute-value-invalid`, `attribute-missing-required`, `attribute-type-invalid`
- [ ] Findings grouped by rune, so a single misbehaving rune is distinguishable from a broad problem
- [ ] Findings from the custom validators (`SeparatedString`, `SpaceSeparatedNumberList`, media's) are counted separately — they have never run, so they are the least predictable
- [ ] `critical`-level findings counted separately from `error`, since D11 makes them non-suppressible
- [ ] The numbers are written into this item's Resolution, not just reported in a PR comment — {% ref "WORK-558" /%} reads them
- [ ] A recommendation: proceed inside {% ref "WORK-558" /%}, or split phase 2 out of the milestone

## Approach

Measurement only — **do not fix anything here**, and do not enable the ids in
the shipped path. A throwaway script or a temporarily widened allow-list on
{% ref "WORK-556" /%}'s filter is enough; the deliverable is the numbers.

Run it against both dogfooded sites rather than just `site/`. `plan-site/` uses
a different rune mix, and a finding count from one says little about the other.

## References

- {% ref "SPEC-132" /%} — the phase table and D11
- {% ref "WORK-556" /%} — provides the call and the id filter this widens
- {% ref "WORK-558" /%} — consumes this measurement

{% /work %}
