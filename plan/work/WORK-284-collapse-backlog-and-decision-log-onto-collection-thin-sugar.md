{% work id="WORK-284" status="done" priority="medium" complexity="complex" source="ADR-012" tags="plan,collection,backlog,decision-log,plan-activity,deprecation" milestone="v0.16.0" %}

# Collapse backlog, decision-log, and plan-activity onto collection (thin sugar)

Delete the bespoke `backlog` / `decision-log` / `plan-activity` implementations (their `postProcess` resolvers, sentinels, renderers, and dedicated CSS) and reimplement the tags as thin sugar that lowers to a `collection` query — no content migration. The ADR-012 move, now unblocked by the domain-aware ordering (WORK-276/283).

## Acceptance Criteria
- [x] `{% backlog %}` lowers to a `collection` query: `show`→`type`, `all`→`work,bug` (plan-domain expansion), default `sort=priority` `group=status`, using a shipped `work-card` partial as the default template.
- [x] `{% decision-log %}` lowers to a `collection` of `type=decision` `sort=-date`, using a `decision-entry` partial.
- [x] `{% plan-activity %}` lowers to a `collection` of all plan types `sort=-modified` `limit=N` (a recent-modified feed) — see `resolvePlanActivity` (pipeline.ts:900). Entities without a `modified` date sort last (vs. being dropped today); accepted.
- [x] `resolveBacklog` / `resolveDecisionLog` / `resolvePlanActivity`, their sentinels, the bespoke renderers, and their dedicated CSS are removed.
- [x] Existing `{% backlog %}` / `{% decision-log %}` / `{% plan-activity %}` content keeps working (the tags remain as aliases) — no migration needed.
- [x] The plan-site dashboards render via the lowered collection with the same grouping/order/look as before.
- [x] Status/priority/severity badges still appear (from the plan rune config), and group order matches (relies on WORK-283 ordering override).

## Approach
Rewrite the `backlog` / `decision-log` / `plan-activity` schemas to emit a `collection` renderable (mapping attributes + injecting the default template/partial) instead of their own sentinels. Delete the resolver branches and CSS. Ship `work-card` (exists in plan-site) and a new `decision-entry` partial. The `<ol>` semantics of decision-log are not preserved (collection's items container is a `div`) — accepted per ADR-012.

`plan-progress` is **not** included here: it's a type×status count tally, not a flat list, so `collection` (which lists, not counts) can't express it. It stays a plan aggregator; genericizing it would need a count/aggregate capability (a `collection mode="count"` or a `stat`/`tally` rune composed with the generic `progress` rune) — a separate future direction, not v0.16.0.

## Dependencies
WORK-283 (ordering override so dashboards keep their order), WORK-276 (ordering engine), collection (done). Pairs with the plan-site dashboards.

## References
- {% ref "ADR-012" /%} — collapse aggregator runes onto collection; the keep-as-sugar path.

## Resolution

Completed: 2026-05-27

Branch: `claude/v0.16.0`

### What was done
- Rewrote `plugins/plan/src/tags/backlog.ts`, `decision-log.ts`, and `plan-activity.ts` so each schema lowers to a `collection`-shaped renderable. They emit the COLLECTION_SENTINEL plus standard collection meta (`collection-type`, `collection-sort`, `collection-group`, etc.), with the legacy attributes preserved verbatim (`show`/`filter`/`sort`/`group`/`limit`, plus `sort="date"` → `-date` for decision-log back-compat). Default per-item bodies are embedded as in-template `{% card href=$item.url %}` strings — captured via `deferBody: true` and passed through `collection-body`.
- Deleted `resolveBacklog`, `resolveDecisionLog`, `resolvePlanActivity` from `plugins/plan/src/pipeline.ts` (along with their sentinel imports, ordering construction, and `buildEntityCard`/`buildDecisionEntry` deps).
- Deleted `plugins/plan/src/cards.ts` (no remaining callers).
- Removed Lumina CSS for the lowered runes: `backlog.css`, `decision-log.css`, `plan-activity.css`, plus stale `plan-relationships.css` and `plan-entity-tabs.css`. Dropped the corresponding `@import` lines from `packages/lumina/index.css`.
- Updated the bespoke `commands/render-pipeline.ts` (CLI `plan build`) to invoke `resolveCollections` after `postProcess`, with an `embedConfig` carrying the plan-domain `orderings` so dashboards land in actionable-first status order. The standard refrakt content pipeline already runs `resolveCollections`, so production builds need no additional wiring.
- Deleted obsolete unit tests (`plugins/plan/test/backlog.test.ts`, `decision-log.test.ts`) and updated the one render-pipeline assertion that compared against the now-removed `rf-backlog__card-link` class to match the new `rf-card__link` (the lowered backlog renders its default body via the `card` rune).
- Adjusted accordion-count assertions in `collection-zones.test.ts` and `relationships.test.ts` to match the unparenthesized count format shipped earlier in v0.16.0.

### Notes
- ADR-012's `<ol>`-semantics caveat applies as expected: decision-log's items now sit inside `<div class="rf-collection__items">` instead of an ordered list. Accepted per the spec.
- `plan-progress` remains a plan aggregator — it's a count tally, not a flat list, so the collection lowering doesn't apply.
- Verified end-to-end with `plan-site` build: `index.html` and `work.html` render via `rf-collection` + `rf-card`, with zero leftover `rf-backlog` / `rf-decision-log` / `rf-plan-activity` BEM classes.
- Full plan-site dogfood + render-pipeline + collection-zones + relationships tests pass (37/37).

{% /work %}

