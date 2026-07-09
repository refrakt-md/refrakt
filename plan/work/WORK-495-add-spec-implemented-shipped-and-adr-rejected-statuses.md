{% work id="WORK-495" status="draft" priority="high" complexity="moderate" milestone="v0.28.0" source="SPEC-049" tags="plan, status, spec, decision, lifecycle" %}

# Add spec implemented/shipped and ADR rejected statuses

Close the "is it built / is it available?" gap on specs, and give ADRs an honest "considered and declined" state. Rides on the consolidated vocabulary from {% ref "WORK-492" /%}.

## Acceptance Criteria
- [ ] `spec` rune accepts `implemented` and `shipped` status values (schema, `enums.ts`, MCP)
- [ ] `spec` rune accepts an optional `released-in` attribute (semver format, e.g. `v0.11.4`)
- [ ] `decision` rune accepts a `rejected` status value (in addition to `proposed | accepted | superseded | deprecated`)
- [ ] `config.ts` status `sentimentMap`s render `implemented` / `shipped` (positive) and `rejected` (negative/muted) appropriately; render-pipeline orderings place them correctly
- [ ] `plan validate` errors on a `status="shipped"` spec that lacks `released-in`
- [ ] `implemented` / `shipped` are registered in `TERMINAL_STATUSES.spec` and `ACHIEVING_STATUSES.spec`; `rejected` is terminal for `decision`
- [ ] Tests cover schema acceptance, the shipped-without-released-in error, and badge sentiment

## Dependencies
- {% ref "WORK-492" /%} — adds values to the consolidated `enums.ts` shape

## References
- {% ref "SPEC-049" /%} — spec (New spec statuses, New ADR status)

{% /work %}
