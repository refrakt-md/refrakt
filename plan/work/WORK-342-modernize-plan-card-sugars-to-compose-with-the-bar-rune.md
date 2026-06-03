{% work id="WORK-342" status="ready" priority="medium" complexity="moderate" source="SPEC-021" milestone="v0.19.0" tags="plan,aggregation,composability,runes" %}

# Modernize plan card-sugars to compose with the bar rune

The plan sugars `backlog`, `decision-log`, and `plan-activity` lower to
`collection` with a bespoke card/table body that predates the `bar` rune. Now
that `bar` exists as a composable horizontal-field primitive, revisit these
default bodies so the rollups compose from `bar` (and other primitives) instead
of carrying their own layout — the same "sugar over a primitive" spirit, but
leaning on richer building blocks.

## Acceptance Criteria
- [ ] `backlog` (and, where it improves them, `decision-log` / `plan-activity`) default bodies are rebuilt to compose with `bar` instead of bespoke card markup.
- [ ] Rendered output is visually equivalent or better; the sugars still accept author overrides.
- [ ] Any layout that moves into `bar` drops the corresponding bespoke CSS.
- [ ] Tests cover the default render and an override for each touched sugar.

## Approach
Audit the DEFAULT_*_BODY templates in `plugins/plan/src/tags/{backlog,decision-log,plan-activity}.ts`.
Where a card body is really a labelled row of fields, express it as a `bar`
composition in the default body source. Keep `collection` as the query engine;
only the body template changes.

## References
- `plugins/plan/src/tags/backlog.ts`, `decision-log.ts`, `plan-activity.ts`
- `bar` rune + `packages/lumina/styles/runes/bar.css`
- Relates to {% ref "WORK-296" /%} (plan-progress → aggregate sugar)

{% /work %}
