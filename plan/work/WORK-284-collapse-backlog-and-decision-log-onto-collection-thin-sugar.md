{% work id="WORK-284" status="ready" priority="medium" complexity="complex" source="ADR-012" tags="plan,collection,backlog,decision-log,plan-activity,deprecation" milestone="v0.16.0" %}

# Collapse backlog, decision-log, and plan-activity onto collection (thin sugar)

Delete the bespoke `backlog` / `decision-log` / `plan-activity` implementations (their `postProcess` resolvers, sentinels, renderers, and dedicated CSS) and reimplement the tags as thin sugar that lowers to a `collection` query — no content migration. The ADR-012 move, now unblocked by the domain-aware ordering (WORK-276/283).

## Acceptance Criteria
- [ ] `{% backlog %}` lowers to a `collection` query: `show`→`type`, `all`→`work,bug` (plan-domain expansion), default `sort=priority` `group=status`, using a shipped `work-card` partial as the default template.
- [ ] `{% decision-log %}` lowers to a `collection` of `type=decision` `sort=-date`, using a `decision-entry` partial.
- [ ] `{% plan-activity %}` lowers to a `collection` of all plan types `sort=-modified` `limit=N` (a recent-modified feed) — see `resolvePlanActivity` (pipeline.ts:900). Entities without a `modified` date sort last (vs. being dropped today); accepted.
- [ ] `resolveBacklog` / `resolveDecisionLog` / `resolvePlanActivity`, their sentinels, the bespoke renderers, and their dedicated CSS are removed.
- [ ] Existing `{% backlog %}` / `{% decision-log %}` / `{% plan-activity %}` content keeps working (the tags remain as aliases) — no migration needed.
- [ ] The plan-site dashboards render via the lowered collection with the same grouping/order/look as before.
- [ ] Status/priority/severity badges still appear (from the plan rune config), and group order matches (relies on WORK-283 ordering override).

## Approach
Rewrite the `backlog` / `decision-log` / `plan-activity` schemas to emit a `collection` renderable (mapping attributes + injecting the default template/partial) instead of their own sentinels. Delete the resolver branches and CSS. Ship `work-card` (exists in plan-site) and a new `decision-entry` partial. The `<ol>` semantics of decision-log are not preserved (collection's items container is a `div`) — accepted per ADR-012.

`plan-progress` is **not** included here: it's a type×status count tally, not a flat list, so `collection` (which lists, not counts) can't express it. It stays a plan aggregator; genericizing it would need a count/aggregate capability (a `collection mode="count"` or a `stat`/`tally` rune composed with the generic `progress` rune) — a separate future direction, not v0.16.0.

## Dependencies
WORK-283 (ordering override so dashboards keep their order), WORK-276 (ordering engine), collection (done). Pairs with the plan-site dashboards.

## References
- {% ref "ADR-012" /%} — collapse aggregator runes onto collection; the keep-as-sugar path.

{% /work %}

