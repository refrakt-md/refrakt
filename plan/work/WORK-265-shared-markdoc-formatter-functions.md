{% work id="WORK-265" status="ready" priority="medium" complexity="simple" source="SPEC-070" tags="runes, markdoc, formatting" milestone="v0.16.0" %}

# Shared markdoc formatter functions

Register a small set of author-facing markdoc functions — `currency`, `date`, `number`, `join` — in `@refrakt-md/runes` as the shared value-formatting layer, usable anywhere markdoc transforms run: collection cells, body templates, and `entityRoutes` render strings. Keeps formatting out of `fields` and out of any bespoke projection DSL.

## Acceptance Criteria
- [ ] `currency`, `date`, `number`, `join` registered as markdoc `functions` available wherever markdoc runs
- [ ] Functions are pure formatters with documented signatures and examples
- [ ] Available in collection heading-delimited cells (WORK-264), body templates (WORK-263), and entityRoutes render / render-template (WORK-268)
- [ ] Unit tests for each formatter, including locale/edge handling for `currency` and `date`

## Dependencies
None — independent; consumed by WORK-263, WORK-264, WORK-268.

## References

- {% ref "SPEC-070" /%}
- {% ref "SPEC-069" /%} — same functions usable in entityRoutes render strings

{% /work %}
