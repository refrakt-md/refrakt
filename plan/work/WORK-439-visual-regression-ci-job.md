{% work id="WORK-439" status="ready" priority="medium" complexity="moderate" source="SPEC-094" tags="ci,visual-regression,gallery-harness,browser" %}

# Visual-regression compare-against-base CI job

Deferred from {% ref "WORK-409" /%} (its final acceptance criterion). The harness runs
end-to-end locally and in the pinned Playwright container; what's left is the CI automation,
which needs a browser-backed runner to develop against — hence its own item, unassigned to a
milestone until a browser CI environment is in place.

## Scope

- A CI job that renders the gallery on the PR's **merge-base** and on the **PR head**, diffs
  the two, and reports the result (using `@refrakt-md/gallery-harness`).
- **Informational by default**: a non-empty diff uploads the diff images / posts a summary
  ("N cells changed across `hint`, `badge`; 1 layout") and **passes** — visual change is
  usually legitimate, so the diff is a review aid, not a gate.
- **Opt-in `expect-empty`** mode for refactors that assert zero visual change (e.g. the
  {% ref "WORK-438" /%} skeleton/skin re-bucketing, pure token plumbing), where a non-empty
  diff **is** a failure.
- Run in the pinned container (`mcr.microsoft.com/playwright:v1.60.0-jammy`); the core CI /
  install path stays browser-free.

## Acceptance Criteria

- [ ] A compare-against-base CI job renders gallery on merge-base + head, diffs, and reports (diff images / summary); informational by default (non-empty diff passes).
- [ ] An opt-in `expect-empty` mode fails on a non-empty diff, usable by inert-refactor PRs.
- [ ] Runs in the pinned Playwright container; no browser binary enters the core CI/install path.

## References

- {% ref "WORK-409" /%} (the harness + the documented local workflows) · {% ref "SPEC-094" /%} · `packages/gallery-harness/README.md` (CI section).

{% /work %}
