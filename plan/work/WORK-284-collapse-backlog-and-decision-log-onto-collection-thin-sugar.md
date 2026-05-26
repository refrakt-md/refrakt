{% work id="WORK-284" status="ready" priority="medium" complexity="complex" source="ADR-012" tags="plan,collection,backlog,decision-log,deprecation" milestone="v0.16.0" %}

# Collapse backlog and decision-log onto collection (thin sugar)

Delete the bespoke `backlog`/`decision-log` implementation (their `postProcess` resolvers, sentinels, renderers, and dedicated CSS) and reimplement the tags as thin sugar that lowers to a `collection` query — no content migration. The ADR-012 move, now unblocked by the domain-aware ordering (WORK-276/283).

## Acceptance Criteria
- [ ] `{% backlog %}` lowers to a `collection` query: `show`→`type`, `all`→`work,bug` (plan-domain expansion), default `sort=priority` `group=status`, using a shipped `work-card` partial as the default template.
- [ ] `{% decision-log %}` lowers to a `collection` of `type=decision` `sort=-date`, using a `decision-entry` partial.
- [ ] `resolveBacklog`/`resolveDecisionLog`, their sentinels, the bespoke renderers, and their dedicated CSS are removed.
- [ ] Existing `{% backlog %}` / `{% decision-log %}` content keeps working (the tags remain as aliases) — no migration needed.
- [ ] The plan-site dashboards render via the lowered collection with the same grouping/order/look as before.
- [ ] Status/priority/severity badges still appear (from the plan rune config), and group order matches (relies on WORK-283 ordering override).

## Approach
Rewrite the `backlog`/`decision-log` schemas to emit a `collection` renderable (mapping attributes + injecting the default template/partial) instead of their own sentinels. Delete the resolver branches and CSS. Ship `work-card` (exists in plan-site) and a new `decision-entry` partial. The `<ol>` semantics of decision-log are not preserved (collection's items container is a `div`) — accepted per ADR-012.

## Dependencies
WORK-283 (ordering override so dashboards keep their order), WORK-276 (ordering engine), collection (done). Pairs with the plan-site dashboards.

## References
- {% ref "ADR-012" /%} — collapse backlog/decision-log onto collection; the keep-as-sugar path.

{% /work %}
